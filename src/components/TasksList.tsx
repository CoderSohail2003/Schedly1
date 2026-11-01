import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { StatusBadge, PriorityBadge, TaskTypeBadge } from './StatusBadge';
import { Ban, Search, CheckCircle, Clock, ListFilter, PlayCircle, Plus } from 'lucide-react';
import axios from 'axios';

interface TasksListProps {
  tasks: Task[];
  onRefresh: () => void;
  onOpenCreate?: () => void;
}

export const TasksList: React.FC<TasksListProps> = ({ tasks, onRefresh, onOpenCreate }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCancelTask = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to cancel the scheduled task '${name}'?`)) return;
    setCancellingId(id);
    try {
      await axios.delete(`/api/tasks/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel task');
    } finally {
      setCancellingId(null);
    }
  };

  const formatScheduleText = (scheduledAt: string, status: TaskStatus) => {
    const schedDate = new Date(scheduledAt);
    const diffMs = schedDate.getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);

    if (status === 'COMPLETED' || status === 'FAILED') {
      return `Executed at ${schedDate.toLocaleTimeString()}`;
    }
    if (diffSec > 0) {
      return `⏰ Due in ${diffSec}s (at ${schedDate.toLocaleTimeString()})`;
    } else {
      return `⚡ Due now (ready to run)`;
    }
  };

  return (
    <div className="bg-[#0f1913] border border-[#1b2b1e] rounded-xl shadow-xl overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-[#1b2b1e] bg-[#121e16] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ListFilter className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-100 font-sans">
              Task Queue & History
            </h2>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/40">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Status changes from <strong>Scheduled</strong> to <strong>Running</strong> to <strong>Completed</strong> automatically
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task by name..."
              className="pl-9 pr-3.5 py-2 bg-[#09110b] border border-[#203625] rounded-lg text-neutral-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 w-52 sm:w-64"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#09110b] p-1 rounded-lg border border-[#1c3021] text-xs">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'PENDING', label: 'Scheduled' },
              { key: 'RUNNING', label: 'Running' },
              { key: 'COMPLETED', label: 'Completed' },
              { key: 'FAILED', label: 'Failed' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === st.key
                    ? 'bg-emerald-600 text-[#09110b] font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#1b2b1e] bg-[#0c1510] text-xs font-semibold text-neutral-400 tracking-wider">
              <th className="py-3 px-4">Task Details</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Current Status</th>
              <th className="py-3 px-4">Schedule Time</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#162319]">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-neutral-400">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <Clock className="w-12 h-12 mb-3 text-emerald-500/50" />
                    <h3 className="text-base font-bold text-neutral-200">No tasks in this list yet</h3>
                    <p className="text-xs text-neutral-400 mt-1 mb-4">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'No tasks matched your search or filter. Try clearing the filter.'
                        : 'Submit your first task, or use the top buttons to run a sample test.'}
                    </p>
                    {onOpenCreate && (
                      <button
                        onClick={onOpenCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-[#08110a] font-bold text-xs rounded-lg transition-all shadow-md"
                      >
                        <Plus className="w-4 h-4" /> Create a Task Now
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => {
                const shortId = t.id.substring(0, 8);
                const createdTime = new Date(t.createdAt).toLocaleTimeString();

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#132217] transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-100 text-sm sm:text-base">
                        {t.name}
                      </div>
                      <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-neutral-500">ID: {shortId}</span>
                        {t.description && <span>• {t.description}</span>}
                        <span className="text-neutral-500">• Created at {createdTime}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <TaskTypeBadge type={t.taskType} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-neutral-300 whitespace-nowrap">
                      {formatScheduleText(t.scheduledAt, t.status)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t.durationSeconds ? (
                        <span className="text-emerald-400 font-bold text-xs sm:text-sm flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          {t.durationSeconds}s
                        </span>
                      ) : t.status === 'RUNNING' ? (
                        <span className="text-sky-300 font-semibold text-xs animate-pulse flex items-center gap-1">
                          <PlayCircle className="w-3.5 h-3.5" /> Working...
                        </span>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {t.status === 'PENDING' ? (
                        <button
                          onClick={() => handleCancelTask(t.id, t.name)}
                          disabled={cancellingId === t.id}
                          title="Cancel this scheduled task"
                          className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
