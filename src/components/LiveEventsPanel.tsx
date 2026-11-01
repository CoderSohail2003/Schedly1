import React, { useState, useRef, useEffect } from 'react';
import { TelemetryEvent } from '../types';
import { Terminal, ShieldAlert, Cpu, Database, Radio, CheckCircle, Trash2, ArrowDownCircle, Info } from 'lucide-react';

interface LiveEventsPanelProps {
  events: TelemetryEvent[];
  onClear: () => void;
}

export const LiveEventsPanel: React.FC<LiveEventsPanelProps> = ({ events, onClear }) => {
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredEvents = events.filter((e) => {
    if (filterSource === 'ALL') return true;
    return e.source === filterSource;
  });

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const getSourceDetails = (source: string) => {
    switch (source) {
      case 'SCHEDULER':
        return {
          label: 'Scheduler',
          desc: '5s periodic timer checking for due tasks',
          badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-800/50',
          icon: <Radio className="w-3.5 h-3.5 text-purple-400" />,
        };
      case 'WORKER':
        return {
          label: 'Worker',
          desc: 'Background processor executing tasks',
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50',
          icon: <Cpu className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'RATELIMIT':
        return {
          label: 'Rate Limiter',
          desc: 'Token bucket check for user requests',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/50',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'QUEUE':
        return {
          label: 'Queue (RabbitMQ)',
          desc: 'Message broker holding prioritized tasks',
          badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800/50',
          icon: <Database className="w-3.5 h-3.5 text-sky-400" />,
        };
      case 'API':
      default:
        return {
          label: 'API Request',
          desc: 'Incoming HTTP request from web client',
          badgeClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
          icon: <Terminal className="w-3.5 h-3.5 text-neutral-400" />,
        };
    }
  };

  const getLevelBorderClass = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return 'border-l-4 border-l-emerald-400 bg-emerald-950/20';
      case 'WARN':
        return 'border-l-4 border-l-amber-400 bg-amber-950/25';
      case 'ERROR':
        return 'border-l-4 border-l-rose-500 bg-rose-950/30';
      case 'INFO':
      default:
        return 'border-l-4 border-l-neutral-700 bg-[#0e1711]';
    }
  };

  return (
    <aside className="w-full lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col bg-[#0d1611] border border-[#1b2b1e] rounded-xl shadow-2xl overflow-hidden h-[calc(100vh-140px)] sticky top-20">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#1b2b1e] bg-[#111c14] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-sm sm:text-base font-bold text-neutral-100 flex items-center gap-2 font-sans">
              Live Activity Stream
              <span className="text-xs font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40">
                {events.length} events
              </span>
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Everything happening behind the scenes appears here live
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is PAUSED'}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 ${
              autoScroll
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span className="text-xs">Top</span>
          </button>
          <button
            onClick={onClear}
            title="Clear list"
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 border-b border-[#18261b] bg-[#0c140f] flex items-center gap-1 overflow-x-auto text-xs">
        {[
          { key: 'ALL', label: 'All Events' },
          { key: 'RATELIMIT', label: 'Rate Limiter' },
          { key: 'SCHEDULER', label: 'Scheduler' },
          { key: 'QUEUE', label: 'Queue' },
          { key: 'WORKER', label: 'Workers' },
          { key: 'API', label: 'API' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterSource(tab.key)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap text-xs ${
              filterSource === tab.key
                ? 'bg-emerald-600 text-[#071109] font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events Log List (Newest on top, clean and readable) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-[#162319]"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Terminal className="w-10 h-10 mb-2 opacity-40 text-emerald-400" />
            <p className="text-sm font-semibold text-neutral-300">No events recorded yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Click <strong>"Test Rate Limit"</strong> or <strong>"Schedule 3 Tasks"</strong> at the top to watch live actions stream here!
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const timeStr = new Date(evt.timestamp).toTimeString().split(' ')[0];
            const sourceInfo = getSourceDetails(evt.source);

            return (
              <div
                key={evt.id}
                className={`pt-2.5 pb-2 px-3 rounded-r-lg transition-all ${getLevelBorderClass(evt.level)}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-400 font-semibold">{timeStr}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold ${sourceInfo.badgeClass}`}
                    >
                      {sourceInfo.icon}
                      {sourceInfo.label}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">#{evt.id}</span>
                </div>
                <p className="text-neutral-100 text-xs sm:text-sm leading-relaxed font-sans font-medium break-words">
                  {evt.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer explanation */}
      <div className="p-3 border-t border-[#1b2b1e] bg-[#111c14] text-xs text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Live auto-updating every second
        </span>
        <span className="text-neutral-500">Last 200 events kept</span>
      </div>
    </aside>
  );
};
