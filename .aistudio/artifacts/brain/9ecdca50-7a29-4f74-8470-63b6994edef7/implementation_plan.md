# SHEDLY — Cloud-Based Distributed Task Scheduler (MCA Project)

A visual, distributed task scheduling and queue processing system built for college viva demonstrations, where every backend transition, rate-limit check, scheduler dispatch, and worker execution is surfaced live in a Node.js-inspired dark emerald interface.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Strict Architecture Alignment & Viva Rubric Compliance**:
> - **Backend Framework**: Spring Boot 3.2 (Java 17) single Maven project.
> - **Database**: MySQL 8 with JPA (`ddl-auto=update`), table: `tasks`.
> - **Message Broker**: RabbitMQ with prioritized queue (`task.queue`, `x-max-priority=10`).
> - **Rate Limiter**: In-memory Token Bucket (`capacity=5`, refill `1 token per 12 seconds`).
> - **Event Streaming**: In-memory `ConcurrentLinkedQueue<EventDto>` capped at 200 events, polled every 1s via `GET /api/events?since=<id>`.
> - **Frontend**: React (Vite) + axios + recharts with dark emerald / Node.js aesthetic, auto-polling 4 endpoints every 1 second.
> - **Interactive Viva Presets**: Built-in 1-click controls to fire 6 rapid submissions (demonstrating 429 Rate Limit) and schedule timed tasks (demonstrating the 5s scheduler & 3-thread worker pickup).

---

## 1. Overview & Core Concept

- **What It Does**: SHEDLY orchestrates asynchronous tasks with priority queues, periodic scheduler polling, worker execution pools, and in-memory token bucket rate limiting. It eliminates backend opacity by streaming every micro-event (scheduler ticks, worker sleep/execution, queue depth shifts, rate limit allow/deny) directly into the UI via lightweight 1-second polling.
- **Target Audience & Viva Context**: Built for an MCA 2-person college project evaluation (20 marks). Enables students to showcase complex distributed systems concepts (concurrency, token bucket rate limiting, priority queueing, idempotent scheduling) without opening a terminal or MySQL CLI.
- **Key Value**: 100% visible system telemetry. An examiner can watch tasks transition in real-time (`PENDING` → `RUNNING` → `COMPLETED`/`FAILED`) alongside live log streams and token bucket refills.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Live System Observation**:
   - Top Bar displays live token balance (`Tokens: X/5`), current RabbitMQ queue depth (`Queue Depth: N`), and active workers.
   - Right-side fixed Live Events panel displays every backend action as it occurs, chronologically color-coded (`INFO`, `WARN`, `ERROR`, `SUCCESS`) with source badges (`SCHEDULER`, `WORKER`, `QUEUE`, `RATELIMIT`, `API`).
2. **Task Creation & Rate Limit Verification**:
   - User inputs task name, description, task type (`EMAIL`, `HTTP_CALL`, `COMPUTE`), priority (`HIGH`, `MEDIUM`, `LOW`), and schedule offset.
   - If submitted within bucket capacity (5 tokens), task is accepted (201 Created) and logged.
   - If 6 tasks are submitted rapidly, the 6th immediately triggers a 429 Toast with `Retry-After: 12s`, and the event log displays `RATELIMIT: Denied request for user1 (0 tokens remaining)`.
3. **Scheduled Execution**:
   - User schedules a task for 10 seconds in the future. Task enters table with status `PENDING` (slate).
   - At the next 5-second scheduler tick, the scheduler detects the due task, logs dispatch, and marks it `RUNNING` (emerald glow).
   - Worker picks up the message, logs simulated processing (2–3s), updates state to `COMPLETED` (green), and logs completion duration.
4. **Dashboard & Analytics**:
   - Summary stat cards (`Total`, `Pending`, `Running`, `Completed`, `Failed`).
   - Distribution chart (Recharts) showing task breakdown by status and priority.
   - Architecture & Code Inspector tab allowing the examiner to view the exact Java Spring Boot classes, RabbitMQ configuration, and MySQL DDL.

### Visual Identity & Theme
- **Theme Direction**: Node.js ecosystem dark aesthetic — technical, clean, and high-contrast.
- **Color Palette**:
  - Neutral Canvas: Deep dark slate / charcoal (`#0a0f0d`, `#0f1713`)
  - Structural Surfaces: Card & panel containers (`#131d17`, `#18251e`) with subtle emerald hairline borders (`#22543d` / `rgba(34, 197, 94, 0.2)`)
  - Accent / Primary: Node emerald (`#22c55e`, `#16a34a`)
  - Status Indicators:
    - `COMPLETED`: Vibrant green (`#22c55e`)
    - `RUNNING`: Cyber emerald blue / pulsing accent (`#38bdf8` / `#22c55e`)
    - `PENDING`: Muted slate (`#94a3b8`)
    - `FAILED`: Signal amber-red (`#ef4444`)
- **Typography & Hierarchy**:
  - Headings & Navigation: `Plus Jakarta Sans` (bold, clean geometric sans)
  - Code, Logs & Tabular Numerals: `JetBrains Mono` with `tabular-nums`
- **Component Styling**:
  - Strict 3-zone header: [SHEDLY wordmark + version] — [Navigation tabs] — [Tokens + Queue Depth widgets + Viva Actions]
  - Responsive split layout: Main workspace (Tabs: Tasks, Create, Dashboard, Architecture) + Right sidebar (Live Events Panel with auto-scroll and filter buttons).

---

## 3. Key Product Decisions & Trade-Offs

- **Exact Technology Modeling for Viva Evaluation**:
  - *Chosen Approach*: Direct, uncompromised modeling of Spring Boot 3.2, MySQL 8 with JPA, and RabbitMQ with priority queue arguments (`x-max-priority=10`). Complete Spring Boot Maven codebase is provided in the project tree (`/backend-springboot`) and inspected via the UI.
  - *Why*: Satisfies all college syllabus marking rubrics and keywords for the 20-mark evaluation.
- **In-Memory Token Bucket Algorithm**:
  - *Chosen Approach*: Exact token bucket algorithm (`capacity = 5`, `refillRate = 1 token per 12 seconds`).
  - *Why*: Fast, thread-safe, no Redis dependency, easily verifiable with JUnit and live UI events.
- **Incremental Event Polling (`GET /api/events?since=<id>`)**:
  - *Chosen Approach*: Lightweight 1-second polling using high-water mark IDs instead of WebSocket overhead.
  - *Why*: Robust, resilient in browser sandbox environments, and conforms strictly to the project requirements.

---

## 4. Technical Architecture & Task Lifecycle

```
┌────────────────────────────────────────────────────────────────────────┐
│                    TaskFlow — React Frontend (Vite, :5173)             │
│                                                                        │
│   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ │
│   │ Top Bar            │ │ Main Tabs          │ │ Live Events Panel  │ │
│   │ • Tokens X/5       │ │ • Create Task      │ │ newest-on-top,     │ │
│   │ • Queue depth      │ │ • Task List        │ │ color-coded,       │ │
│   │ • Scheduler status │ │ • Dashboard/Chart  │ │ 1s auto-refresh    │ │
│   └────────┬───────────┘ └─────────┬──────────┘ └─────────▲──────────┘ │
└────────────┼───────────────────────┼──────────────────────┼────────────┘
             │ 1s polling (4 endpoints)                     │
             ▼                                              │
┌───────────────────────────────────────────────────────────┴────────────┐
│            SPRING BOOT 3.2 BACKEND (Java 17, :8080)                    │
│                                                                        │
│  ┌──────────────────────┐   ┌────────────────────────────────────────┐ │
│  │ TokenBucketService   │   │ EventService                           │ │
│  │ capacity=5, refill=12s│  │ bounded deque, max 200                 │ │
│  │ in-memory user map   │   │ GET /api/events?since=<id>             │ │
│  └──────────┬───────────┘   └────────────────▲───────────────────────┘ │
│             │ checks                         │ pushes events           │
│             ▼                                │                         │
│  ┌────────────────────────┐   ┌──────────────┴─────────────────────┐   │
│  │ TaskController (REST)  │   │ SchedulerService                   │   │
│  │ • POST /api/tasks      │   │   @Scheduled(fixedRate=5000)       │   │
│  │ • GET /api/tasks       │   │   → finds PENDING+due              │   │
│  │ • DELETE /api/tasks/:id│   │   → publishes to RabbitMQ          │   │
│  │ • GET rate-limit-status│   │                                    │   │
│  │ StatsService           │   │ WorkerService                      │   │
│  │   /api/stats           │   │   @RabbitListener                  │   │
│  └────────────┬───────────┘   │   ThreadPoolTaskExecutor(3)        │   │
│               │               │   sleeps 2-3s → updates DB         │   │
│               │               └──────────────┬─────────────────────┘   │
└───────────────┼──────────────────────────────┼─────────────────────────┘
                │                              │
                ▼                              ▼
         ┌────────────┐               ┌──────────────────────────────┐
         │  MySQL 8   │               │  RabbitMQ                    │
         │  tasks tbl │               │  queue: task.queue           │
         │  (JPA)     │               │  x-max-priority=10           │
         └────────────┘               │  (real message broker)       │
                                      └──────────────────────────────┘
```

### TASK LIFECYCLE
1. **POST /api/tasks** → token bucket check → save to MySQL (`PENDING`) → push event: `"Task <name> created with priority <p>"`
2. **Scheduler tick (every 5s)** → query MySQL for `PENDING` tasks where `scheduledAt <= now` → publish message to RabbitMQ (`task.queue` with priority header) → update MySQL status to `RUNNING` → push event: `"Scheduler checked: found N due tasks, dispatched M"`
3. **Worker consumes** → `@RabbitListener` worker from `ThreadPoolTaskExecutor(3)` picks up message → sleep 2–3s to simulate compute/email/HTTP execution → update MySQL status to `COMPLETED` (or `FAILED` on error) → push event: `"Task <name> COMPLETED in 2.4s"`
4. **React polls 4 endpoints every 1s** → (`/api/tasks`, `/api/tasks/rate-limit-status`, `/api/stats`, `/api/events?since=<id>`) → all transitions, bucket refills, and logs are 100% visible live without touching any console.

---

## 5. Endpoints Specification

- `POST /api/tasks`: Validates token bucket; if allowed, inserts task into MySQL with status `PENDING`, pushes `API` event, returns 201 Created. If empty, returns 429 Too Many Requests with `Retry-After: 12`, pushes `RATELIMIT` deny event.
- `GET /api/tasks`: Returns list of all tasks from MySQL ordered by `createdAt DESC`.
- `GET /api/tasks/{id}`: Returns task detail.
- `DELETE /api/tasks/{id}`: Cancels a pending task, updates status to `FAILED` (Cancelled by user), pushes event.
- `GET /api/tasks/rate-limit-status`: Returns `{ tokens, capacity: 5, refillSeconds: 12, user: "user1" }`.
- `GET /api/events?since={id}`: Returns all events logged after ID `{id}` from the in-memory circular buffer of 200 events.
- `GET /api/stats`: Returns `{ total, pending, running, completed, failed, tokensRemaining, queueDepth, schedulerLastRun, workersActive }`.
- `POST /api/demo/trigger-rapid`: Viva preset: fires 6 rapid submissions within 100ms so examiner sees 5 succeed and 1 fail with 429.
- `POST /api/demo/reset`: Viva preset: resets the database and refills tokens for clean repetitive test runs.

---

## 6. Implementation Steps

- **Step 1**: Scaffold backend structures, MySQL Task schema & JPA entity, Task CRUD controllers, and in-memory bounded `EventService` with `/api/events` endpoint.
- **Step 2**: Implement `TokenBucketService` (capacity=5, refill=1/12s), integrate into `POST /api/tasks`, expose `/api/tasks/rate-limit-status`, write JUnit test class `TokenBucketServiceTest.java`.
- **Step 3**: Configure RabbitMQ priority queue (`task.queue`, `x-max-priority=10`), `@Scheduled(fixedRate=5000)` `SchedulerService`, `@RabbitListener` 3-thread `WorkerService`, and `/api/stats`.
- **Step 4**: React single-page UI (Vite) with top bar (`Tokens: X/5`, `Queue depth`, `Workers active`), 4 main tabs (`Tasks List`, `Create Task`, `Dashboard & Charts`, `Spring Boot Architecture & Code Inspector`), and fixed right-side `Live Events` panel.
- **Step 5**: 1-second auto-polling hooks (`usePolling`, `useEvents`), 429 alert banner & toast handling, Viva 1-click evaluation triggers, and Recharts metrics.
- **Step 6**: Complete Spring Boot 3.2 Maven project exportable package (`pom.xml`, Java source files, `application.yml`, `schema.sql`) and README with 5-step viva demonstration script.
