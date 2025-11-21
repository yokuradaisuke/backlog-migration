import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

// ログコンテナコンポーネント
export function LogContainer({ logs }: { logs: LogEntry[] }) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-white rounded-lg p-4 flex-1 flex flex-col shadow-sm">
      <div className="flex items-center mb-3">
        <Terminal className="mr-2 h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">実行ログ ({logs.length}件)</h3>
      </div>
      <div className="flex-1 bg-gray-900 rounded-lg p-3 overflow-y-auto text-gray-100 max-h-[600px]">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-sm">ログはまだありません。移行を開始してください。</div>
        ) : (
          <>
            {logs.map((log, index) => {
              const isDetailLog = log.message.startsWith('[詳細ログ]');
              const isConsoleLog = log.message.startsWith('[コンソール]');

              return (
                <div key={index} className={`mb-1 font-mono text-xs ${
                  isDetailLog ? 'border-l-2 border-blue-400 pl-2' :
                  isConsoleLog ? 'border-l-2 border-green-400 pl-2' : ''
                }`}>
                  <span className="text-gray-500 text-xs">[{log.timestamp}]</span>
                  <span className={`ml-2 font-bold ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    log.level === 'success' ? 'text-green-400' :
                    isDetailLog ? 'text-blue-300' :
                    isConsoleLog ? 'text-green-300' :
                    'text-gray-300'
                  }`}>
                    {log.level.toUpperCase()}:
                  </span>
                  <span className={`ml-2 ${
                    isDetailLog ? 'text-blue-100' :
                    isConsoleLog ? 'text-green-100' :
                    log.level === 'error' ? 'text-red-200' :
                    log.level === 'warn' ? 'text-yellow-200' :
                    log.level === 'success' ? 'text-green-200' :
                    'text-gray-200'
                  }`}>
                    {log.message}
                  </span>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </>
        )}
      </div>
    </div>
  );
}