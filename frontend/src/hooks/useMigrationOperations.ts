import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, type FormData, type MigrationStatus, type LogEntry } from '../types/migration';
import { MigrationService } from '../services/MigrationService';

// 移行操作のカスタムフック
export function useMigrationOperations(
  addLog: (level: LogEntry['level'], message: string) => void,
  setMigrationStatus: (status: MigrationStatus) => void,
  setMappingRequired: (required: boolean) => void,
  setLastLogCount: (count: number) => void,
  setIsAutoMappingSubmitting: (submitting: boolean) => void,
  lastLogCount: number,
  setIsInitialized: (initialized: boolean) => void,
  setShowCompletionScreen: (show: boolean) => void,
  setCompletedMigrationData: (data: { srcSpaceUrl: string; srcProjectKey: string; dstSpaceUrl: string; dstProjectKey: string } | null) => void
) {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      srcApiKey: '',
      srcSpaceUrl: '',
      dstApiKey: '',
      dstSpaceUrl: '',
      srcProjectKey: '',
      dstProjectKey: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    const success = await MigrationService.initializeMigration(data, addLog, setMigrationStatus, setMappingRequired);
    if (success) {
      setIsInitialized(true);
    }
  };

  const autoUpdateMapping = async () => {
    try {
      setIsAutoMappingSubmitting(true);
      const values = getValues();

      const destinationUsers = await MigrationService.fetchDestinationUsers(values, addLog);
      if (!destinationUsers) return;

      await MigrationService.updateMapping(destinationUsers, addLog, setMigrationStatus);
    } catch (error) {
      addLog('error', `自動マッピングエラー: ${error}`);
    } finally {
      setIsAutoMappingSubmitting(false);
    }
  };

  const executeMigration = async () => {
    const formValues = getValues();
    await MigrationService.startMigration(formValues, addLog, setMigrationStatus, setLastLogCount, startPollingLogs);
  };

  const startPollingLogs = () => {
    let pollCount = 0;
    const maxPolls = 600;

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;

      const isComplete = await MigrationService.pollLogs(
        lastLogCount,
        addLog,
        setLastLogCount,
        setMigrationStatus
      );

      if (isComplete) {
        // 移行完了時に完了画面を表示（MigrationService内でsetMigrationStatus('completed')が呼ばれている）
        const formValues = getValues();
        setCompletedMigrationData({
          srcSpaceUrl: formValues.srcSpaceUrl,
          srcProjectKey: formValues.srcProjectKey,
          dstSpaceUrl: formValues.dstSpaceUrl,
          dstProjectKey: formValues.dstProjectKey,
        });
        setShowCompletionScreen(true);

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }

      if (pollCount >= maxPolls) {
        addLog('warn', 'ログ取得がタイムアウトしました');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, 1000);

    addLog('info', 'ログ監視を開始しました（1秒間隔でチェック）');
  };

  const downloadMapping = () => {
    const link = document.createElement('a');
    link.href = '/api/migration/download/users.csv';
    link.download = 'users.csv';
    link.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/migration/upload/users.csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        addLog('success', 'users.csvをアップロードしました');
      } else {
        addLog('error', `アップロードエラー: ${result.error}`);
      }
    } catch (error) {
      addLog('error', `ファイルアップロードエラー: ${error}`);
    }
  };

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
    autoUpdateMapping,
    executeMigration,
    downloadMapping,
    handleFileUpload,
  };
}