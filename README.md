# SHEDLY — Cloud-Based Distributed Task Scheduler
**MCA College Project (20 Marks) • 2-Person Team**

---

## 📌 Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SHEDLY — React Frontend (Vite)                      │
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
│            SPRING BOOT 3.2 BACKEND (Java 17)                           │
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

### 4-Step Task Lifecycle
1. **POST /api/tasks** → In-Memory Token Bucket check (capacity=5) → Save to MySQL (`PENDING`) → Push Event.
2. **Scheduler tick (every 5s)** → Find `PENDING` tasks where `scheduledAt <= now` → Publish to RabbitMQ (`task.queue`, `x-max-priority=10`) → Update status to `RUNNING` → Push Event.
3. **Worker consumes** → `@RabbitListener` (concurrency=3) picks up task → Sleep 2-3s (simulates work) → Update MySQL to `COMPLETED` (or `FAILED`) → Push Event.
4. **React polls 4 endpoints every 1s** → All status transitions, queue depth, and logs appear live on screen without needing any terminal or MySQL console during the viva demo!

---

## 🎯 5-Step Viva Demonstration Script (For Examiner Evaluation)

### Step 1: System Walkthrough & Dashboard Baseline
- Open the application. Show the examiner the **Top Bar** (`Tokens: 5/5`, `Queue Depth: 0`, `Workers: 0/3`) and the right-hand **Live Event Stream** waiting for actions.
- Show the **Dashboard & Metrics** tab displaying initial stat cards (`Total`, `Pending`, `Running`, `Completed`, `Failed`) and the 4-step lifecycle flowchart.

### Step 2: In-Memory Token Bucket Rate Limiting (The 429 Test)
- Click the top bar button: **"Viva: Rapid 6x Test"** (or rapidly submit 6 tasks from the Create Task tab).
- **Examiner Observation**:
  - The first 5 requests are permitted (HTTP 201 Created).
  - The 6th request is immediately denied with **HTTP 429 Too Many Requests** and a `Retry-After: 12` header.
  - The Live Event Stream immediately logs:
    `[RATELIMIT] DENIED task submit for user1 (0/5 tokens). Retry in ~12s`
  - The Token Widget drops to `0/5` with a red indicator, then refills 1 token every 12 seconds back to `5/5`.

### Step 3: Scheduled Dispatch & Worker Execution Lifecycle
- Click **"Create Task"** tab, enter a task name, and click the preset **"+10 Seconds"** (or click **"Schedule Demo"** in the top bar).
- **Examiner Observation**:
  - Task appears in the table with status `PENDING` (slate badge) and "Due in 10s".
  - Live Event Stream logs: `[API] Task created... scheduled for HH:mm:ss`.
  - When the 5-second scheduler tick fires after 10s:
    1. `[SCHEDULER] Scheduler tick at HH:mm:ss — found 1 due tasks, dispatched 1`
    2. `[QUEUE] Dispatched task to RabbitMQ task.queue [priority=HIGH, weight=10]`
    3. Status in table turns from slate `PENDING` to pulsing blue `RUNNING`.
    4. `[WORKER] Worker thread [worker-thread-1] picked up task, executing COMPUTE...`
    5. After 2–3s simulated work: `[WORKER] Task COMPLETED in 2.45s`
    6. Status in table turns green `COMPLETED` with exact duration displayed!

### Step 4: Worker Concurrency & RabbitMQ Priority Queue
- Submit 4 tasks simultaneously with different priorities:
  - Task A (LOW, weight 1)
  - Task B (HIGH, weight 10)
  - Task C (HIGH, weight 10)
  - Task D (MEDIUM, weight 5)
- **Examiner Observation**:
  - RabbitMQ queue depth increments, and 3 workers process concurrently.
  - Workers pick up HIGH priority tasks first before LOW priority tasks, demonstrating priority queueing with `x-max-priority=10`.

### Step 5: Academic Code Inspection (In-App Viva Review)
- Click the **"Spring Boot & Architecture (MCA Viva)"** tab.
- Review the complete Java 17 + Spring Boot 3.2 Maven files directly in the syntax-highlighted code inspector:
  - `TokenBucketService.java` (Thread-safe in-memory token bucket logic)
  - `TokenBucketServiceTest.java` (JUnit 5 test verifying 5 allowed + 1 denied)
  - `SchedulerService.java` (`@Scheduled(fixedRate = 5000)`)
  - `WorkerService.java` (`@RabbitListener(concurrency = "3")`)
  - `RabbitMQConfig.java` (`task.queue` with `x-max-priority=10`)
  - `Task.java` (JPA Entity) & `TaskRepository.java`
  - `schema.sql` & `pom.xml`

---

## 🛠 Tech Stack Details
- **Backend (Academic Submission)**: Java 17, Spring Boot 3.2.4, Spring Data JPA, Spring AMQP (RabbitMQ), Lombok, MySQL 8, JUnit 5.
- **Frontend**: React (Vite), Tailwind CSS (Node.js dark aesthetic), Axios, Recharts, Lucide Icons.
- **Port**: Runs on port 3000 (cloud preview).
