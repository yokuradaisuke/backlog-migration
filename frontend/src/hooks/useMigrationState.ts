import { useState } from 'react';
import type { MigrationStatus } from '../types/migration';

// 移行状態管理のカスタムフック
export function useMigrationState() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>('idle');
  const [mappingRequired, setMappingRequired] = useState(false);
  const [lastLogCount, setLastLogCount] = useState(0);
  const [isAutoMappingSubmitting, setIsAutoMappingSubmitting] = useState(false);
  const [showPreparation, setShowPreparation] = useState(true);
  const [preparationCompleted, setPreparationCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [completedMigrationData, setCompletedMigrationData] = useState<{
    srcSpaceUrl: string;
    srcProjectKey: string;
    dstSpaceUrl: string;
    dstProjectKey: string;
  } | null>(null);

  const handlePreparationComplete = () => {
    setShowPreparation(false);
    setPreparationCompleted(true);
  };

  return {
    migrationStatus,
    setMigrationStatus,
    mappingRequired,
    setMappingRequired,
    lastLogCount,
    setLastLogCount,
    isAutoMappingSubmitting,
    setIsAutoMappingSubmitting,
    showPreparation,
    setShowPreparation,
    preparationCompleted,
    setPreparationCompleted,
    handlePreparationComplete,
    isInitialized,
    setIsInitialized,
    showCompletionScreen,
    setShowCompletionScreen,
    completedMigrationData,
    setCompletedMigrationData,
  };
}