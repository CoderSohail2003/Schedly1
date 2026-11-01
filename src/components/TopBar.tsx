import React from 'react';
import { StatsDto, RateLimitStatusDto } from '../types';
import { Zap, Server, Users, RotateCcw, Play, Clock, HelpCircle } from 'lucide-react';

interface TopBarProps {
  stats: StatsDto | null;
  rateLimit: RateLimitStatusDto | null;
  onTriggerRapid: () => void;
  onScheduleSample: () => void;
  onReset: () => void;
  isTriggering: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  stats,
  rateLimit,
  onTriggerRapid,
  onScheduleSample,
  onReset,
  isTriggering,
  activeTab,
  setActiveTab,
}) => {
  const tokens = rateLimit?.tokens ?? 5;
  const capacity = rateLimit?.capacity ?? 5;
  const queueDepth = stats?.queueDepth ?? 0;
  const workersActive = stats?.workersActive ?? 0;

  return (
    <header className="border-b border-[#1b2b1e] bg-[#0c140e] sticky top-0 z-30 shadow-lg">
      {/* Primary Top Bar Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 p-0.5 shadow-md shadow-emerald-950/60 flex items-center justify-center">
            <span className="font-mono font-black text-xl text-[#08100a]">S</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-sans">
                SHEDLY
              </span>
              <span className="text-xs font-mono uppercase bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                Task Scheduler
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">
              Watch background tasks get scheduled, queued, and completed in real-time
            </p>
          </div>
        </div>

        {/* Live Status Indicators (Friendly & Easy to Read) */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Rate Limit Tokens Widget */}
          <div
            className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-[#121f15] border border-emerald-900/50 shadow-inner group relative cursor-help"
            title="Rate Limit: You have 5 task tokens. Each task uses 1 token. Tokens refill automatically at 1 every 12 seconds to prevent spam."
          >
            <Zap className={`w-4 h-4 ${tokens === 0 ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
            <div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-400 font-medium">Task Tokens:</span>
                <span className={`font-mono font-bold text-sm tabular-nums ${tokens === 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
                  {tokens} / {capacity}
                </span>
              </div>
              <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all duration-300 ${tokens === 0 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                  style={{ width: `${(tokens / capacity) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Queue Depth Widget */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#121f15] border border-emerald-900/50 shadow-inner cursor-help"
            title="Queue: How many tasks are currently waiting in line for a background worker to pick up."
          >
            <Server className={`w-4 h-4 ${queueDepth > 0 ? 'text-sky-400 animate-pulse' : 'text-neutral-400'}`} />
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Waiting in Queue</div>
              <div className="font-mono font-bold text-sm text-neutral-100 tabular-nums">
                {queueDepth} {queueDepth === 1 ? 'task' : 'tasks'}
              </div>
            </div>
          </div>

          {/* Active Workers Widget */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#121f15] border border-emerald-900/50 shadow-inner cursor-help"
            title="Workers: Active background threads currently executing tasks (maximum 3 running concurrently)."
          >
            <Users className={`w-4 h-4 ${workersActive > 0 ? 'text-emerald-400 animate-spin' : 'text-neutral-400'}`} />
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Active Workers</div>
              <div className="font-mono font-bold text-sm text-neutral-100 tabular-nums">
                {workersActive} of 3 busy
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Clear, Plain English) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerRapid}
            disabled={isTriggering}
            title="Quick Test: Rapidly sends 6 tasks at once. The first 5 succeed, and the 6th demonstrates the rate limiter error (429)."
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#09110b] transition-all shadow-md shadow-emerald-950/60 active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Test Rate Limit (6x)</span>
          </button>

          <button
            onClick={onScheduleSample}
            disabled={isTriggering}
            title="Adds 3 sample tasks scheduled for 5s, 10s, and 15s in the future so you can watch them run automatically."
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#182a1d] hover:bg-[#213a28] text-emerald-300 border border-emerald-800/50 transition-colors"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Schedule 3 Tasks</span>
          </button>

          <button
            onClick={onReset}
            disabled={isTriggering}
            title="Reset system: Clears all tasks and refills tokens back to 5."
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-[#162319] overflow-x-auto">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-3 px-5 text-sm font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          All Tasks ({stats?.total ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`py-3 px-5 text-sm font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'create'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          + Add New Task
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3 px-5 text-sm font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Overview & Charts
        </button>
      </div>
    </header>
  );
};
