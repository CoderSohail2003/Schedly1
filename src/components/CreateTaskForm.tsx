import React, { useState } from 'react';
import axios from 'axios';
import { TaskType, Priority } from '../types';
import { Send, AlertTriangle, CheckCircle2, Clock, Sparkles, HelpCircle, Zap } from 'lucide-react';

interface CreateTaskFormProps {
  onTaskCreated: () => void;
  tokensRemaining: number;
}

export const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ onTaskCreated, tokensRemaining }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('COMPUTE');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [scheduleOffsetSec, setScheduleOffsetSec] = useState<number>(0);
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setRetryAfter(null);

    let scheduledAt = new Date().toISOString();
    if (customDateTime) {
      scheduledAt = new Date(customDateTime).toISOString();
    } else if (scheduleOffsetSec > 0) {
      scheduledAt = new Date(Date.now() + scheduleOffsetSec * 1000).toISOString();
    }

    try {
      const res = await axios.post('/api/tasks', {
        name: name.trim(),
        description: description.trim(),
        taskType,
        priority,
        scheduledAt,
      });

      setSuccessMessage(`Success! Task "${res.data.name}" has been scheduled. Check the tasks list or watch the live activity panel on the right.`);
      setName('');
      setDescription('');
      setScheduleOffsetSec(0);
      setCustomDateTime('');
      onTaskCreated();
    } catch (err: any) {
      if (err.response?.status === 429) {
        const retry = err.response.headers['retry-after'] || 12;
        setRetryAfter(Number(retry));
        setErrorMessage(`Rate limit reached (429)! All 5 task tokens were used. To protect the server, please wait ~${retry} seconds for a token to automatically refill.`);
      } else {
        setErrorMessage(err.response?.data?.error || 'Failed to create task. Please check your inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (title: string, desc: string, type: TaskType, prio: Priority, offsetSec: number) => {
    setName(title);
    setDescription(desc);
    setTaskType(type);
    setPriority(prio);
    setScheduleOffsetSec(offsetSec);
    setCustomDateTime('');
  };

  return (
    <div className="bg-[#0f1913] border border-[#1b2b1e] rounded-xl p-6 sm:p-7 shadow-xl max-w-3xl">
      {/* Header with Plain English Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-[#1b2b1e] gap-3">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 font-sans flex items-center gap-2">
            Schedule a New Task
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Fill in the details below. Tasks run either right away or at your chosen future time.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142318] border border-emerald-900/50 self-start sm:self-auto">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-neutral-300">Tokens Left:</span>
          <span className={`font-mono font-bold text-sm ${tokensRemaining === 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
            {tokensRemaining} of 5
          </span>
        </div>
      </div>

      {/* Friendly 429 Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-4 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-300 text-sm">Action Paused by Rate Limiter</h4>
            <p className="mt-1 leading-relaxed text-xs sm:text-sm">{errorMessage}</p>
            {retryAfter && (
              <p className="text-xs text-rose-300/80 mt-2 font-mono bg-rose-900/30 p-2 rounded border border-rose-700/30">
                ⏳ 1 token refills every 12 seconds. Watch the token bar at the top refill automatically!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* 1-Click Quick Ideas */}
      <div className="mb-6 p-3.5 bg-[#122016] rounded-xl border border-emerald-900/40">
        <label className="block text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Quick 1-Click Templates (Try One!):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setPreset('Calculate Monthly Payroll', 'Calculates tax, salary, and generates pay slips', 'COMPUTE', 'HIGH', 0)}
            className="p-2.5 text-left bg-[#09110b] hover:bg-[#182b1d] text-neutral-200 rounded-lg border border-emerald-900/30 transition-all"
          >
            <div className="font-bold text-emerald-300">Run Now (High Priority)</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Executes immediately with top priority</div>
          </button>
          <button
            type="button"
            onClick={() => setPreset('Send Welcome Email Batch', 'Dispatches welcome emails to 250 newly registered users', 'EMAIL', 'MEDIUM', 10)}
            className="p-2.5 text-left bg-[#09110b] hover:bg-[#182b1d] text-neutral-200 rounded-lg border border-emerald-900/30 transition-all"
          >
            <div className="font-bold text-emerald-300">Run in 10 Seconds</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Scheduled for 10s from now</div>
          </button>
          <button
            type="button"
            onClick={() => setPreset('Sync Inventory to External Store', 'Calls webhook API to synchronize catalog', 'HTTP_CALL', 'LOW', 25)}
            className="p-2.5 text-left bg-[#09110b] hover:bg-[#182b1d] text-neutral-200 rounded-lg border border-emerald-900/30 transition-all"
          >
            <div className="font-bold text-emerald-300">Run in 25 Seconds</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Low priority scheduled task</div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-sm">
        {/* Task Name */}
        <div>
          <label className="block text-neutral-200 font-bold mb-1.5 text-sm">
            Task Name <span className="text-emerald-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Export Sales Report to PDF"
            className="w-full px-4 py-2.5 bg-[#09110b] border border-[#203625] rounded-lg text-neutral-100 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-neutral-200 font-bold mb-1.5 text-sm">
            Short Description <span className="text-neutral-400 text-xs font-normal">(Optional note for the task)</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Generates quarterly PDF summary and stores in file storage..."
            className="w-full px-4 py-2.5 bg-[#09110b] border border-[#203625] rounded-lg text-neutral-100 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Type & Priority in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-neutral-200 font-bold mb-1.5 text-sm flex items-center gap-1.5">
              Task Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              className="w-full px-3.5 py-2.5 bg-[#09110b] border border-[#203625] rounded-lg text-neutral-100 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="COMPUTE">⚡ Compute Job (Heavy CPU calculation)</option>
              <option value="EMAIL">📧 Email Dispatch (Outbound message)</option>
              <option value="HTTP_CALL">🌐 HTTP Webhook (External API request)</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">Simulates 2–3s of real background work</p>
          </div>

          <div>
            <label className="block text-neutral-200 font-bold mb-1.5 text-sm flex items-center gap-1.5">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3.5 py-2.5 bg-[#09110b] border border-[#203625] rounded-lg text-neutral-100 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="HIGH">🔥 High Priority (Picked up first)</option>
              <option value="MEDIUM">⚖️ Medium Priority (Normal)</option>
              <option value="LOW">🐢 Low Priority (Runs when free)</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">High priority tasks jump ahead in queue</p>
          </div>
        </div>

        {/* Execution Schedule Timing */}
        <div className="pt-2">
          <label className="block text-neutral-200 font-bold mb-2 text-sm flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" /> When should this task execute?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            {[
              { label: 'Run Right Away', sub: 'Immediate', val: 0 },
              { label: 'In 10 Seconds', sub: 'Short delay', val: 10 },
              { label: 'In 25 Seconds', sub: 'Medium delay', val: 25 },
              { label: 'In 60 Seconds', sub: '1 minute delay', val: 60 },
            ].map((timing) => (
              <button
                key={timing.val}
                type="button"
                onClick={() => {
                  setScheduleOffsetSec(timing.val);
                  setCustomDateTime('');
                }}
                className={`py-2.5 px-3 rounded-lg text-center border transition-all ${
                  scheduleOffsetSec === timing.val && !customDateTime
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 font-bold shadow-sm'
                    : 'bg-[#09110b] border-[#1f3323] text-neutral-300 hover:text-white hover:bg-[#132217]'
                }`}
              >
                <div className="text-sm font-semibold">{timing.label}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{timing.sub}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-neutral-400">
            <span>Or pick a specific time:</span>
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => {
                setCustomDateTime(e.target.value);
                setScheduleOffsetSec(-1);
              }}
              className="px-3 py-1.5 bg-[#09110b] border border-[#203625] rounded-lg text-neutral-200 text-xs"
            />
          </div>
        </div>

        {/* Submit Button & Cost Note */}
        <div className="pt-4 border-t border-[#1b2b1e] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Submitting will use <strong>1 task token</strong> ({tokensRemaining} remaining).</span>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-[#071109] font-extrabold text-sm rounded-lg shadow-lg shadow-emerald-950/60 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
          </button>
        </div>
      </form>
    </div>
  );
};
