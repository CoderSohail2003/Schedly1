import React from 'react';
import { TaskStatus, Priority, TaskType } from '../types';
import { CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Completed
        </span>
      );
    case 'RUNNING':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-sky-950/90 text-sky-300 border border-sky-500/40 animate-pulse">
          <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
          Running
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-neutral-900 text-neutral-300 border border-neutral-700">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          Scheduled (Waiting)
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-rose-950/90 text-rose-300 border border-rose-500/40">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Cancelled / Failed
        </span>
      );
  }
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  switch (priority) {
    case 'HIGH':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-600/40">
          High Priority (First)
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-600/40">
          Normal Priority
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
          Low Priority
        </span>
      );
  }
};

export const TaskTypeBadge: React.FC<{ type: TaskType }> = ({ type }) => {
  const getInfo = () => {
    switch (type) {
      case 'EMAIL':
        return { label: '📧 Email Dispatch', color: 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300' };
      case 'HTTP_CALL':
        return { label: '🌐 Webhook / API Call', color: 'bg-indigo-950/60 border-indigo-800/40 text-indigo-300' };
      case 'COMPUTE':
      default:
        return { label: '⚡ Calculation / Data Job', color: 'bg-sky-950/60 border-sky-800/40 text-sky-300' };
    }
  };

  const info = getInfo();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
};
