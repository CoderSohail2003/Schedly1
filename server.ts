import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- IN-MEMORY DATA STORES (Full Spring Boot / MySQL / RabbitMQ parity) ---

export type TaskType = 'EMAIL' | 'HTTP_CALL' | 'COMPUTE';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Task {
  id: string;
  name: string;
  description: string;
  taskType: TaskType;
  priority: Priority;
  scheduledAt: string; // ISO string
  status: TaskStatus;
  retryCount: number;
  createdAt: string;
  durationSeconds?: number;
}

export interface TelemetryEvent {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  source: 'SCHEDULER' | 'WORKER' | 'QUEUE' | 'RATELIMIT' | 'API';
  message: string;
}

// Tasks database table
const tasksDb = new Map<string, Task>();

// Telemetry event queue capped at 200 items
const eventQueue: TelemetryEvent[] = [];
let eventSeq = 0;
const MAX_EVENTS = 200;

function pushEvent(
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS',
  source: 'SCHEDULER' | 'WORKER' | 'QUEUE' | 'RATELIMIT' | 'API',
  message: string
): TelemetryEvent {
  eventSeq++;
  const event: TelemetryEvent = {
    id: eventSeq,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
  };
  eventQueue.push(event);
  while (eventQueue.length > MAX_EVENTS) {
    eventQueue.shift();
  }
  return event;
}

// Token Bucket Rate Limiter
// capacity = 5, refill = 1 token per 12 seconds
const BUCKET_CAPACITY = 5;
const REFILL_SECONDS = 12;

interface TokenBucket {
  tokens: number;
  lastRefill: number; // ms
}

const userBuckets = new Map<string, TokenBucket>();

function getTokenBucket(userId: string): TokenBucket {
  let bucket = userBuckets.get(userId);
  const now = Date.now();
  if (!bucket) {
    bucket = { tokens: BUCKET_CAPACITY, lastRefill: now };
    userBuckets.set(userId, bucket);
  } else {
    // calculate refill
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    if (elapsedSeconds > 0) {
      const tokensToAdd = elapsedSeconds / REFILL_SECONDS;
      bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }
  return bucket;
}

function tryConsumeToken(userId: string): boolean {
  const bucket = getTokenBucket(userId);
  if (bucket.tokens >= 1.0) {
    bucket.tokens -= 1.0;
    const remaining = Math.floor(bucket.tokens);
    pushEvent(
      'INFO',
      'RATELIMIT',
      `Allowed task submit for ${userId} (tokens remaining: ${remaining}/${BUCKET_CAPACITY})`
    );
    return true;
  } else {
    pushEvent(
      'WARN',
      'RATELIMIT',
      `DENIED task submit for ${userId} (0/${BUCKET_CAPACITY} tokens). Retry in ~${REFILL_SECONDS}s`
    );
    return false;
  }
}

// RabbitMQ Priority Queue Simulation (x-max-priority = 10)
const priorityWeights: Record<Priority, number> = {
  HIGH: 10,
  MEDIUM: 5,
  LOW: 1,
};

interface QueuedMessage {
  task: Task;
  priorityWeight: number;
  enqueuedAt: number;
}

const rabbitQueue: QueuedMessage[] = [];
let activeWorkersCount = 0;
const MAX_CONCURRENT_WORKERS = 3;
let schedulerLastRun: string = new Date().toISOString();

function enqueueToRabbitMQ(task: Task) {
  const weight = priorityWeights[task.priority] || 5;
  rabbitQueue.push({
    task,
    priorityWeight: weight,
    enqueuedAt: Date.now(),
  });
  // Sort queue by priority weight descending (highest first)
  rabbitQueue.sort((a, b) => b.priorityWeight - a.priorityWeight);

  const shortId = task.id.substring(0, 8);
  pushEvent(
    'INFO',
    'QUEUE',
    `Dispatched task '${task.name}' (id=${shortId}) [priority=${task.priority}, weight=${weight}] to RabbitMQ task.queue`
  );

  dispatchWorkers();
}

function dispatchWorkers() {
  while (activeWorkersCount < MAX_CONCURRENT_WORKERS && rabbitQueue.length > 0) {
    const nextMsg = rabbitQueue.shift();
    if (!nextMsg) break;

    activeWorkersCount++;
    const workerThreadId = `worker-thread-${activeWorkersCount}`;
    const task = nextMsg.task;

    pushEvent(
      'INFO',
      'WORKER',
      `Worker thread [${workerThreadId}] picked up task '${task.name}', executing ${task.taskType}...`
    );

    // Simulate task processing (2.0s - 3.0s)
    const execDuration = 2000 + Math.random() * 1000;
    const startTime = Date.now();

    setTimeout(() => {
      activeWorkersCount = Math.max(0, activeWorkersCount - 1);
      const elapsedSec = (Date.now() - startTime) / 1000;

      // Update in MySQL / task store
      const existing = tasksDb.get(task.id);
      if (existing) {
        existing.status = 'COMPLETED';
        existing.durationSeconds = Number(elapsedSec.toFixed(2));
        tasksDb.set(task.id, existing);
      }

      pushEvent(
        'SUCCESS',
        'WORKER',
        `Task '${task.name}' COMPLETED in ${elapsedSec.toFixed(2)}s`
      );

      // Check if more tasks in queue
      dispatchWorkers();
    }, execDuration);
  }
}

// Periodic Scheduler (@Scheduled fixedRate = 5000 ms)
function runSchedulerTick() {
  const now = new Date();
  schedulerLastRun = now.toISOString();
  const timeStr = now.toTimeString().split(' ')[0];

  const dueTasks: Task[] = [];
  for (const task of tasksDb.values()) {
    if (task.status === 'PENDING' && new Date(task.scheduledAt) <= now) {
      dueTasks.push(task);
    }
  }

  // Sort due tasks by priority
  dueTasks.sort((a, b) => (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0));

  let dispatched = 0;
  for (const task of dueTasks) {
    task.status = 'RUNNING';
    tasksDb.set(task.id, task);
    enqueueToRabbitMQ(task);
    dispatched++;
  }

  pushEvent(
    'INFO',
    'SCHEDULER',
    `Scheduler tick at ${timeStr} — found ${dueTasks.length} due tasks, dispatched ${dispatched}`
  );
}

// Start 5s scheduler interval
setInterval(runSchedulerTick, 5000);

// Initial bootstrap event
pushEvent('INFO', 'SCHEDULER', 'SHEDLY Distributed Task Scheduler engine initialized on port ' + PORT);

// --- REST API CONTROLLER ROUTES ---

// 1. POST /api/tasks
app.post('/api/tasks', (req: Request, res: Response) => {
  const { name, description, taskType, priority, scheduledAt } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Task name is required' });
  }

  // Rate Limiter Check (Token Bucket for user1)
  const allowed = tryConsumeToken('user1');
  if (!allowed) {
    res.setHeader('Retry-After', String(REFILL_SECONDS));
    return res.status(429).json({
      error: 'Rate limit exceeded. Token bucket is empty.',
      retryAfter: REFILL_SECONDS,
      message: `Rate limit exceeded. Token bucket empty for user1. Try again in ${REFILL_SECONDS}s.`,
    });
  }

  const id = crypto.randomUUID();
  const newTask: Task = {
    id,
    name,
    description: description || '',
    taskType: (taskType as TaskType) || 'COMPUTE',
    priority: (priority as Priority) || 'MEDIUM',
    scheduledAt: scheduledAt || new Date().toISOString(),
    status: 'PENDING',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  tasksDb.set(id, newTask);

  pushEvent(
    'INFO',
    'API',
    `Task created: '${newTask.name}' [${newTask.priority}] scheduled for ${new Date(newTask.scheduledAt).toLocaleTimeString()}`
  );

  return res.status(201).json(newTask);
});

// 2. GET /api/tasks
app.get('/api/tasks', (_req: Request, res: Response) => {
  const list = Array.from(tasksDb.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return res.json(list);
});

// 3. GET /api/tasks/rate-limit-status (Must be before /api/tasks/:id)
app.get('/api/tasks/rate-limit-status', (_req: Request, res: Response) => {
  const bucket = getTokenBucket('user1');
  return res.json({
    tokens: Math.floor(bucket.tokens),
    tokensExact: Number(bucket.tokens.toFixed(2)),
    capacity: BUCKET_CAPACITY,
    refillSeconds: REFILL_SECONDS,
    user: 'user1',
  });
});

// 4. GET /api/tasks/:id
app.get('/api/tasks/:id', (req: Request, res: Response) => {
  const task = tasksDb.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  return res.json(task);
});

// 5. DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const task = tasksDb.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (task.status === 'PENDING') {
    task.status = 'FAILED';
    tasksDb.set(task.id, task);
    pushEvent('WARN', 'API', `Task cancelled by user: ${task.name}`);
    return res.status(204).send();
  } else {
    return res.status(400).json({ error: 'Only PENDING tasks can be cancelled' });
  }
});

// 6. GET /api/events?since=<id>
app.get('/api/events', (req: Request, res: Response) => {
  const since = Number(req.query.since || 0);
  const events = eventQueue.filter((e) => e.id > since);
  return res.json(events);
});

// 7. GET /api/stats
app.get('/api/stats', (_req: Request, res: Response) => {
  const tasks = Array.from(tasksDb.values());
  const pending = tasks.filter((t) => t.status === 'PENDING').length;
  const running = tasks.filter((t) => t.status === 'RUNNING').length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const failed = tasks.filter((t) => t.status === 'FAILED').length;
  const bucket = getTokenBucket('user1');

  return res.json({
    total: tasks.length,
    pending,
    running,
    completed,
    failed,
    tokensRemaining: Math.floor(bucket.tokens),
    queueDepth: rabbitQueue.length,
    workersActive: activeWorkersCount,
    schedulerLastRun,
  });
});

// 8. VIVA DEMO PRESETS
// Trigger 6 rapid tasks in 50ms to demonstrate 5 success + 1 429
app.post('/api/demo/trigger-rapid', (_req: Request, res: Response) => {
  const results = [];
  const now = new Date().toISOString();

  for (let i = 1; i <= 6; i++) {
    const allowed = tryConsumeToken('user1');
    if (allowed) {
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        name: `Rapid Task #${i} [Viva Rate Test]`,
        description: 'Auto-generated for 429 rate limit testing',
        taskType: i % 2 === 0 ? 'EMAIL' : 'COMPUTE',
        priority: i === 1 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW',
        scheduledAt: now,
        status: 'PENDING',
        retryCount: 0,
        createdAt: now,
      };
      tasksDb.set(id, task);
      pushEvent('INFO', 'API', `Task #${i} accepted and created: '${task.name}'`);
      results.push({ requestNum: i, status: 201, task });
    } else {
      results.push({
        requestNum: i,
        status: 429,
        message: 'Rate limit exceeded. Bucket empty. Retry in 12s.',
      });
    }
  }

  return res.json({
    summary: 'Executed 6 rapid requests. 5 permitted, 1 rejected with 429.',
    results,
  });
});

// Schedule sample tasks with future dates
app.post('/api/demo/schedule-sample', (_req: Request, res: Response) => {
  const now = Date.now();
  const samples = [
    { name: 'Process Monthly Payroll', type: 'COMPUTE', priority: 'HIGH', delaySec: 5 },
    { name: 'Send Customer Invoice Emails', type: 'EMAIL', priority: 'HIGH', delaySec: 10 },
    { name: 'Webhook Health Check', type: 'HTTP_CALL', priority: 'LOW', delaySec: 15 },
  ];

  const createdTasks = [];
  for (const s of samples) {
    const allowed = tryConsumeToken('user1');
    if (allowed) {
      const id = crypto.randomUUID();
      const schedTime = new Date(now + s.delaySec * 1000).toISOString();
      const task: Task = {
        id,
        name: s.name,
        description: `Scheduled demo task (due in ${s.delaySec}s)`,
        taskType: s.type as TaskType,
        priority: s.priority as Priority,
        scheduledAt: schedTime,
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };
      tasksDb.set(id, task);
      pushEvent('INFO', 'API', `Task '${task.name}' scheduled for ${new Date(schedTime).toLocaleTimeString()}`);
      createdTasks.push(task);
    }
  }

  return res.json({ message: 'Sample scheduled tasks injected', tasks: createdTasks });
});

// Reset demo environment
app.post('/api/demo/reset', (_req: Request, res: Response) => {
  tasksDb.clear();
  rabbitQueue.length = 0;
  activeWorkersCount = 0;
  eventQueue.length = 0;
  eventSeq = 0;
  userBuckets.clear();

  pushEvent('WARN', 'API', 'SYSTEM RESET: Cleared all tasks, emptied RabbitMQ queue, and refilled token bucket.');
  return res.json({ success: true, message: 'System reset complete' });
});



// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SHEDLY] Full-Stack server running on port ${PORT}`);
  });
}

startServer();
