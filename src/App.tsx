import React, { useState } from 'react';
import axios from 'axios';
import { usePolling } from './hooks/usePolling';
import { TopBar } from './components/TopBar';
import { LiveEventsPanel } from './components/LiveEventsPanel';
import { TasksList } from './components/TasksList';
import { CreateTaskForm } from './components/CreateTaskForm';
import { DashboardView } from './components/DashboardView';
import { ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const { tasks, events, stats, rateLimit, refreshAll, clearEvents } = usePolling();
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'warn' | 'success'; text: string } | null>(null);

  const showNotice = (type: 'warn' | 'success', text: string) => {
    setBannerNotice({ type, text });
    setTimeout(() => setBannerNotice(null), 6000);
  };

  // 1-Click Viva Presets
  const handleTriggerRapid = async () => {
    setIsTriggering(true);
    try {
      const res = await axios.post('/api/demo/trigger-rapid');
      showNotice(
        'warn',
        'Viva Test Executed: 6 rapid submissions fired. First 5 succeeded (201 Created), 6th rejected with HTTP 429 Too Many Requests!'
      );
      refreshAll();
    } catch (e: any) {
      showNotice('warn', 'Failed to execute rapid trigger demo.');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleScheduleSample = async () => {
    setIsTriggering(true);
    try {
      await axios.post('/api/demo/schedule-sample');
      showNotice('success', 'Sample tasks scheduled (+5s, +10s, +15s)! Watch the 5s scheduler tick dispatch them to RabbitMQ.');
      refreshAll();
    } catch (e) {
      showNotice('warn', 'Failed to schedule demo tasks.');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all tasks, RabbitMQ queue, and refill token bucket to 5?')) return;
    setIsTriggering(true);
    try {
      await axios.post('/api/demo/reset');
      clearEvents();
      showNotice('success', 'System reset: Tasks cleared, RabbitMQ emptied, token bucket refilled to 5/5.');
      refreshAll();
    } catch (e) {
      showNotice('warn', 'Failed to reset system.');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b120c] text-neutral-200 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Background ambient subtle glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))]" />

      {/* Top Bar with Widgets & Viva Actions */}
      <TopBar
        stats={stats}
        rateLimit={rateLimit}
        onTriggerRapid={handleTriggerRapid}
        onScheduleSample={handleScheduleSample}
        onReset={handleReset}
        isTriggering={isTriggering}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Toast Notice Banner */}
      {bannerNotice && (
        <div
          className={`px-4 py-2 text-xs font-mono flex items-center justify-center gap-2 border-b transition-all ${
            bannerNotice.type === 'warn'
              ? 'bg-amber-950/90 border-amber-600/40 text-amber-200'
              : 'bg-emerald-950/90 border-emerald-600/40 text-emerald-200'
          }`}
        >
          {bannerNotice.type === 'warn' ? (
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{bannerNotice.text}</span>
        </div>
      )}

      {/* Main Workspace Layout (Content + Live Events Panel) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left / Center Tab Content */}
        <section className="flex-1 min-w-0">
          {activeTab === 'tasks' && (
            <TasksList
              tasks={tasks}
              onRefresh={refreshAll}
              onOpenCreate={() => setActiveTab('create')}
            />
          )}

          {activeTab === 'create' && (
            <CreateTaskForm
              onTaskCreated={() => {
                refreshAll();
                setActiveTab('tasks');
              }}
              tokensRemaining={rateLimit?.tokens ?? 5}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView stats={stats} tasks={tasks} />
          )}
        </section>

        {/* Right Fixed / Sticky Live Telemetry Event Stream */}
        <LiveEventsPanel events={events} onClear={clearEvents} />
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#162319] bg-[#0c140f] py-4 px-6 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SHEDLY • Distributed Task Scheduler</span>
          <span className="text-neutral-400">
            RabbitMQ (x-max-priority=10) • In-Memory Token Bucket • Real-Time Event Stream
          </span>
        </div>
      </footer>
    </div>
  );
}
