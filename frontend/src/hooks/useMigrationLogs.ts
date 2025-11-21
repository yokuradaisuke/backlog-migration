import { useState } from 'react';
import type { LogEntry } from '../types/migration';

// ログ管理のカスタムフック
export function useMigrationLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, level, message }]);
  };

  return { logs, addLog };
}