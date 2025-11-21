import type { FormData, MigrationStatus, LogEntry } from '../types/migration';

// 移行APIサービス
export class MigrationService {
  static async initializeMigration(data: FormData, addLog: (level: LogEntry['level'], message: string) => void, setMigrationStatus: (status: MigrationStatus) => void, setMappingRequired: (required: boolean) => void): Promise<boolean> {
    try {
      addLog('info', '移行初期化を開始します...');
      setMigrationStatus('initializing');

      const response = await fetch('/api/migration/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          srcKey: data.srcApiKey,
          srcUrl: data.srcSpaceUrl,
          dstKey: data.dstApiKey,
          dstUrl: data.dstSpaceUrl,
          projectKey: `${data.srcProjectKey}:${data.dstProjectKey}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        addLog('success', '初期化が完了しました');
        setMigrationStatus('mapping-complete');
        setMappingRequired(true);
        return true;
      } else {
        addLog('error', `初期化エラー: ${result.error}`);
        setMigrationStatus('error');
        return false;
      }
    } catch (error) {
      addLog('error', `初期化エラー: ${error}`);
      setMigrationStatus('error');
      return false;
    }
  }

  static async fetchDestinationUsers(values: Partial<FormData>, addLog: (level: LogEntry['level'], message: string) => void) {
    addLog('info', '移行先ユーザー情報を取得中...');

    const fetchResponse = await fetch('/api/migration/fetch-destination-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dstApiKey: values.dstApiKey,
        dstSpaceUrl: values.dstSpaceUrl,
        dstProjectKey: values.dstProjectKey,
      }),
    });

    const fetchResult = await fetchResponse.json();

    if (!fetchResult.success) {
      addLog('error', `ユーザー情報取得エラー: ${fetchResult.error}`);
      return null;
    }

    addLog('success', `${fetchResult.users.length}件のユーザー情報を取得しました`);
    return fetchResult.users;
  }

  static async updateMapping(destinationUsers: unknown[], addLog: (level: LogEntry['level'], message: string) => void, setMigrationStatus: (status: MigrationStatus) => void) {
    addLog('info', 'CSVマッピングを自動更新中...');
    const updateResponse = await fetch('/api/migration/update-mapping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinationUsers,
      }),
    });

    const updateResult = await updateResponse.json();

    if (updateResult.success) {
      addLog('success', updateResult.message);
      if (updateResult.updatedRecords >= 0) {
        addLog('info', 'ユーザーマッピングが完了しました。移行の準備が整いました。');
        setMigrationStatus('mapping-complete');
      }
    } else {
      addLog('error', `マッピング更新エラー: ${updateResult.error}`);
    }
  }

  static async startMigration(formValues: FormData, addLog: (level: LogEntry['level'], message: string) => void, setMigrationStatus: (status: MigrationStatus) => void, setLastLogCount: (count: number) => void, startPollingLogs: () => void) {
    try {
      addLog('info', '移行実行を開始します...');
      setMigrationStatus('executing');
      setLastLogCount(0);

      const startResponse = await fetch('/api/migration/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formValues),
      });

      const startResult = await startResponse.json();

      if (!startResult.success) {
        addLog('error', `移行開始エラー: ${startResult.error}`);
        setMigrationStatus('error');
        return;
      }

      addLog('success', '移行がバックグラウンドで開始されました');
      startPollingLogs();
    } catch (error) {
      addLog('error', `移行開始エラー: ${error}`);
      setMigrationStatus('error');
    }
  }

  static async pollLogs(lastLogCount: number, addLog: (level: LogEntry['level'], message: string) => void, setLastLogCount: (count: number) => void, setMigrationStatus: (status: MigrationStatus) => void) {
    try {
      const response = await fetch('/api/migration/logs');
      const result = await response.json();

      if (response.ok) {
        if (result.logs && result.logs.length > lastLogCount) {
          const newLogs = result.logs.slice(lastLogCount);
          newLogs.forEach((logEntry: { level?: string; message: string }) => {
            const logLevel = logEntry.level || 'info';
            addLog(logLevel as 'info' | 'warn' | 'error' | 'success', logEntry.message);
          });
          setLastLogCount(result.logs.length);
        }

        if (result.status === 'completed' || result.migrationComplete) {
          addLog('success', '移行が正常に完了しました！');
          setMigrationStatus('completed');
          return true;
        } else if (result.status === 'error') {
          addLog('error', '移行中にエラーが発生しました');
          setMigrationStatus('error');
          return true;
        }
      } else {
        console.warn('ログ取得失敗:', result.error || 'HTTP Error');
      }
    } catch (error) {
      console.error('ポーリングエラー:', error);
    }
    return false;
  }
}