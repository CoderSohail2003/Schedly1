import React from 'react';
import { StatsDto, Task } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { CheckCircle2, Clock, PlayCircle, XCircle, Layers, Server, Users, Zap, ArrowRight, HelpCircle } from 'lucide-react';

interface DashboardViewProps {
  stats: StatsDto | null;
  tasks: Task[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, tasks }) => {
  const total = stats?.total ?? 0;
  const pending = stats?.pending ?? 0;
  const running = stats?.running ?? 0;
  const completed = stats?.completed ?? 0;
  const failed = stats?.failed ?? 0;
  const tokens = stats?.tokensRemaining ?? 5;
  const queueDepth = stats?.queueDepth ?? 0;
  const workersActive = stats?.workersActive ?? 0;
  const schedulerTime = stats?.schedulerLastRun
    ? new Date(stats.schedulerLastRun).toLocaleTimeString()
    : 'Checking...';

  // Bar chart data for statuses
  const statusChartData = [
    { name: 'Scheduled', count: pending, color: '#94a3b8' },
    { name: 'Running', count: running, color: '#38bdf8' },
    { name: 'Completed', count: completed, color: '#22c55e' },
    { name: 'Failed', count: failed, color: '#ef4444' },
  ];

  // Priority breakdown
  const highCount = tasks.filter((t) => t.priority === 'HIGH').length;
  const medCount = tasks.filter((t) => t.priority === 'MEDIUM').length;
  const lowCount = tasks.filter((t) => t.priority === 'LOW').length;

  const priorityData = [
    { name: 'High Priority', value: highCount, color: '#f43f5e' },
    { name: 'Normal Priority', value: medCount, color: '#f59e0b' },
    { name: 'Low Priority', value: lowCount, color: '#64748b' },
  ];

  return (
    <div className="space-y-6">
      {/* Friendly Stat Cards Grid (Big numbers + clear explanation) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div className="bg-[#0f1913] border border-[#1b2b1e] rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold mb-1.5">
            <span>Total Tasks</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white tabular-nums">{total}</div>
          <div className="text-xs text-neutral-400 mt-1.5">All tasks registered</div>
        </div>

        {/* Pending / Scheduled */}
        <div className="bg-[#0f1913] border border-[#1b2b1e] rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-300 text-xs font-semibold mb-1.5">
            <span>Scheduled</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-neutral-200 tabular-nums">{pending}</div>
          <div className="text-xs text-neutral-400 mt-1.5">Waiting for due time</div>
        </div>

        {/* Running */}
        <div className="bg-[#0f1913] border border-sky-900/40 rounded-xl p-4 sm:p-5 shadow-sm bg-gradient-to-b from-sky-950/20 to-transparent">
          <div className="flex items-center justify-between text-sky-400 text-xs font-semibold mb-1.5">
            <span>In Progress</span>
            <PlayCircle className="w-4 h-4 text-sky-400 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-sky-300 tabular-nums">{running}</div>
          <div className="text-xs text-sky-400/80 mt-1.5">Executing right now</div>
        </div>

        {/* Completed */}
        <div className="bg-[#0f1913] border border-emerald-900/40 rounded-xl p-4 sm:p-5 shadow-sm bg-gradient-to-b from-emerald-950/20 to-transparent">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-1.5">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-300 tabular-nums">{completed}</div>
          <div className="text-xs text-emerald-400/80 mt-1.5">Finished successfully</div>
        </div>

        {/* Failed */}
        <div className="bg-[#0f1913] border border-rose-900/40 rounded-xl p-4 sm:p-5 shadow-sm bg-gradient-to-b from-rose-950/20 to-transparent">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold mb-1.5">
            <span>Cancelled / Failed</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-300 tabular-nums">{failed}</div>
          <div className="text-xs text-rose-400/80 mt-1.5">Stopped or error</div>
        </div>
      </div>

      {/* Real-Time System Health Banner */}
      <div className="p-4 sm:p-5 bg-[#121f16] border border-[#1b2b1e] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-neutral-200">
              Automatic Scheduler is Active
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              Checks for due tasks every 5 seconds • Last check at <strong className="text-emerald-300 font-mono">{schedulerTime}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs sm:text-sm text-neutral-300 flex-wrap">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Waiting in Queue:</span>
            <strong className="text-white font-mono text-sm">{queueDepth}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Active Worker Threads:</span>
            <strong className="text-white font-mono text-sm">{workersActive} of 3 busy</strong>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Tokens:</span>
            <strong className="text-white font-mono text-sm">{tokens} / 5</strong>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Distribution Bar Chart */}
        <div className="bg-[#0f1913] border border-[#1b2b1e] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-neutral-100 font-sans">
              Tasks by Current Status
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Real-time counts of scheduled, active, and completed tasks
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c140e',
                    borderColor: '#22543d',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown Chart */}
        <div className="bg-[#0f1913] border border-[#1b2b1e] rounded-xl p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-neutral-100 font-sans">
              Task Priority Breakdown
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Higher priority tasks are handled first when workers are busy
            </p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {total === 0 ? (
              <div className="text-neutral-400 text-xs sm:text-sm text-center">
                No tasks available yet. Add tasks or use the top buttons!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(((percent as number) || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c140e',
                      borderColor: '#22543d',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Clear, Plain English Visual Guide: How SHEDLY Works */}
      <div className="bg-[#0f1913] border border-[#1b2b1e] rounded-xl p-6">
        <h3 className="text-base sm:text-lg font-bold text-neutral-100 font-sans mb-1">
          How SHEDLY Works (In 4 Simple Steps)
        </h3>
        <p className="text-xs text-neutral-400 mb-5">
          Everything you do in the web app communicates with the background system:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-[#122016] border border-emerald-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step 1</span>
              <span className="text-xs font-mono bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/40">Tokens</span>
            </div>
            <h4 className="font-bold text-neutral-100 text-sm mb-1">You Submit a Task</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your task is verified by the <strong>Token Bucket</strong>. If you submit more than 5 rapid tasks, it politely pauses you to prevent overloading.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#122016] border border-purple-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Step 2</span>
              <span className="text-xs font-mono bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-700/40">5s Timer</span>
            </div>
            <h4 className="font-bold text-neutral-100 text-sm mb-1">Scheduler Scans Database</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every 5 seconds, an automatic background timer checks if any tasks are ready to run. Due tasks are pushed to the priority queue.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#122016] border border-sky-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Step 3</span>
              <span className="text-xs font-mono bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-700/40">3 Workers</span>
            </div>
            <h4 className="font-bold text-neutral-100 text-sm mb-1">Background Workers Execute</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Up to 3 worker threads simultaneously take tasks from the queue, execute the work (taking 2–3s), and mark them finished.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#122016] border border-amber-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Step 4</span>
              <span className="text-xs font-mono bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-700/40">Live Feed</span>
            </div>
            <h4 className="font-bold text-neutral-100 text-sm mb-1">You See Everything Live</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              The page updates every 1 second. You can see task statuses switch and live logs stream without needing a terminal or database tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
