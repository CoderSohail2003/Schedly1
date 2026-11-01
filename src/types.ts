export type TaskType = 'EMAIL' | 'HTTP_CALL' | 'COMPUTE';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Task {
  id: string;
  name: string;
  description: string;
  taskType: TaskType;
  priority: Priority;
  scheduledAt: string;
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

export interface StatsDto {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  tokensRemaining: number;
  queueDepth: number;
  workersActive: number;
  schedulerLastRun: string;
}

export interface RateLimitStatusDto {
  tokens: number;
  tokensExact?: number;
  capacity: number;
  refillSeconds: number;
  user: string;
}
