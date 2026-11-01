import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Task, TelemetryEvent, StatsDto, RateLimitStatusDto } from '../types';

export function usePolling() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [stats, setStats] = useState<StatsDto | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitStatusDto | null>(null);
  const [lastEventId, setLastEventId] = useState<number>(0);

  const lastEventIdRef = useRef<number>(0);
  lastEventIdRef.current = lastEventId;

  const fetchTasks = async () => {
    try {
      const res = await axios.get<Task[]>('/api/tasks');
      setTasks(res.data);
    } catch (e) {
      // silently ignore transient network hiccups
    }
  };

  const fetchRateLimit = async () => {
    try {
      const res = await axios.get<RateLimitStatusDto>('/api/tasks/rate-limit-status');
      setRateLimit(res.data);
    } catch (e) {
      // silently ignore
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get<StatsDto>('/api/stats');
      setStats(res.data);
    } catch (e) {
      // silently ignore
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await axios.get<TelemetryEvent[]>(`/api/events?since=${lastEventIdRef.current}`);
      if (res.data && res.data.length > 0) {
        setEvents((prev) => {
          // merge new events avoiding duplicates, keeping newest at top
          const existingIds = new Set(prev.map((e) => e.id));
          const fresh = res.data.filter((e) => !existingIds.has(e.id));
          if (fresh.length === 0) return prev;
          const merged = [...fresh.reverse(), ...prev];
          return merged.slice(0, 200);
        });

        const maxId = Math.max(...res.data.map((e) => e.id));
        if (maxId > lastEventIdRef.current) {
          setLastEventId(maxId);
        }
      }
    } catch (e) {
      // silently ignore
    }
  };

  const refreshAll = () => {
    fetchTasks();
    fetchRateLimit();
    fetchStats();
    fetchEvents();
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchTasks();
      fetchRateLimit();
      fetchStats();
      fetchEvents();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearEvents = () => {
    setEvents([]);
  };

  return {
    tasks,
    events,
    stats,
    rateLimit,
    refreshAll,
    clearEvents,
  };
}
