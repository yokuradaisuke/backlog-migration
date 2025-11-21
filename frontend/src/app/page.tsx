'use client';

import { ArrowRight, Settings, Play, FileCheck, Download, Upload, CheckCircle, RotateCcw } from 'lucide-react';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { LogContainer } from '../components/LogContainer';
import { PreparationContainer } from '../components/PreparationContainer';
import { useMigrationLogs } from '../hooks/useMigrationLogs';
import { useMigrationState } from '../hooks/useMigrationState';
import { useMigrationOperations } from '../hooks/useMigrationOperations';

export default function Home() {
  const { logs, addLog } = useMigrationLogs();
  const {
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
  } = useMigrationState();

  const {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
    autoUpdateMapping,
    executeMigration,
    downloadMapping,
    handleFileUpload,
  } = useMigrationOperations(
    addLog,
    setMigrationStatus,
    setMappingRequired,
    setLastLogCount,
    setIsAutoMappingSubmitting,
    lastLogCount,
    setIsInitialized,
    setShowCompletionScreen,
    setCompletedMigrationData
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'initializing': return 'bg-blue-100 text-blue-800';
      case 'mapping-complete': return 'bg-green-100 text-green-800';
      case 'executing': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return '待機中';
      case 'initializing': return '初期化中';
      case 'mapping-complete': return 'マッピング完了';
      case 'executing': return '移行実行中';
      case 'completed': return '完了';
      case 'error': return 'エラー';
      default: return '不明';
    }
  };

  // URLからスペース名を抽出する関数
  const extractSpaceName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      // backlog.jp または backlog.com のサブドメインを取得
      const parts = hostname.split('.');
      if (parts.length >= 3 && (parts[1] === 'backlog' || parts[2] === 'backlog')) {
        return parts[0];
      }
      return hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm p-4 flex-shrink-0">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              PSC Backlog 移行ツール
            </h1>
            <p className="text-sm text-gray-600">
              Backlogプロジェクトの移行を簡単に実行
            </p>
          </div>
          
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側: 進行状況とログ */}
        <div className="w-1/2 bg-gray-50 p-4 flex flex-col">
          {/* 進行状況インジケーター */}
          <ProgressIndicator migrationStatus={migrationStatus} preparationCompleted={preparationCompleted} />

          {/* ログコンテナ */}
          <LogContainer logs={logs} />
        </div>

        {/* 右側: 設定とボタン */}
        <div className="w-1/2 bg-white overflow-y-auto">
          {showCompletionScreen && completedMigrationData ? (
            /* 完了画面 */
            <div className="p-6">
              <div className="text-center mb-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  移行完了
                </h2>
                <p className="text-gray-600">
                  スペース {extractSpaceName(completedMigrationData.srcSpaceUrl)} の {completedMigrationData.srcProjectKey} プロジェクトから<br />
                  スペース {extractSpaceName(completedMigrationData.dstSpaceUrl)} の {completedMigrationData.dstProjectKey} プロジェクトへ<br />
                  移行が完了しました。
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <p className="text-blue-800">
                  移行後のBacklog環境を確認して問題がないことを確認してください。
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    setShowCompletionScreen(false);
                    setCompletedMigrationData(null);
                    setMigrationStatus('idle');
                    setMappingRequired(false);
                    setIsInitialized(false);
                    setShowPreparation(true);
                    setPreparationCompleted(false);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  完了
                </button>

                <button
                  onClick={() => {
                    // 同じスペースの別プロジェクトを移行するためのリセット
                    setShowCompletionScreen(false);
                    setCompletedMigrationData(null);
                    setMigrationStatus('idle');
                    setMappingRequired(false);
                    setIsInitialized(false);
                    // フォームは同じスペース情報が残るのでそのまま
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  同じスペースの別プロジェクトを移行する
                </button>
              </div>
            </div>
          ) : showPreparation ? (
            <PreparationContainer onPreparationComplete={handlePreparationComplete} />
          ) : (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                移行設定
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* API設定 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 移行元設定 */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">移行元 Backlog</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        APIキー
                      </label>
                      <input
                        type="password"
                        {...register('srcApiKey')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="移行元のAPIキーを入力"
                      />
                      {errors.srcApiKey && (
                        <p className="mt-1 text-sm text-red-600">{errors.srcApiKey.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        スペースURL
                      </label>
                      <input
                        type="url"
                        {...register('srcSpaceUrl')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://your-space.backlog.jp"
                      />
                      {errors.srcSpaceUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.srcSpaceUrl.message}</p>
                      )}
                    </div>
                  </div>

                  {/* 移行先設定 */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">移行先 Backlog</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        APIキー
                      </label>
                      <input
                        type="password"
                        {...register('dstApiKey')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="移行先のAPIキーを入力"
                      />
                      {errors.dstApiKey && (
                        <p className="mt-1 text-sm text-red-600">{errors.dstApiKey.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        スペースURL
                      </label>
                      <input
                        type="url"
                        {...register('dstSpaceUrl')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://your-space.backlog.jp"
                      />
                      {errors.dstSpaceUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.dstSpaceUrl.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* プロジェクトキー */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      移行元プロジェクトキー
                    </label>
                    <input
                      type="text"
                      {...register('srcProjectKey')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SRC_PRJCT"
                    />
                    {errors.srcProjectKey && (
                      <p className="mt-1 text-sm text-red-600">{errors.srcProjectKey.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      移行先プロジェクトキー
                    </label>
                    <input
                      type="text"
                      {...register('dstProjectKey')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="DST_PRJCT"
                    />
                    {errors.dstProjectKey && (
                      <p className="mt-1 text-sm text-red-600">{errors.dstProjectKey.message}</p>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-col space-y-3">
                  {/* ステップ1: 初期化 */}
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center mb-3">
                      <Play className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="text-sm font-medium text-green-800">
                        ステップ1: 移行初期化
                      </h3>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      移行元と移行先の設定を確認し、移行の準備を行います。
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting || migrationStatus === 'executing'}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {isSubmitting ? '初期化中...' : isInitialized ? '再初期化' : '移行を初期化'}
                    </button>
                  </div>

                  {mappingRequired && (
                    <div className="space-y-4">
                      {/* ステップ2: マッピング設定 */}
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center mb-3">
                          <FileCheck className="h-5 w-5 text-blue-600 mr-2" />
                          <h3 className="text-sm font-medium text-blue-800">
                            ステップ2: ユーザーマッピング設定
                          </h3>
                        </div>
                        <p className="text-sm text-blue-700">
                          マッピングされたCSVファイルをダウンロードして確認してください。必要に応じてカスタムマッピングファイルをアップロードしてください。ほとんどの場合、自動マッピングで十分に対応できますので、まずは自動マッピングをお試しください。
                        </p>
                      </div>

                      {/* マッピング操作ボタン */}
                      <div className="grid grid-cols-1 gap-3">
                        {/* CSV操作 */}
                        <div className="flex space-x-2">
                          <button
                            onClick={downloadMapping}
                            disabled={!isInitialized || migrationStatus === 'executing'}
                            className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="mr-1 h-4 w-4" />
                            CSVダウンロード
                          </button>

                          <div className="flex-1">
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleFileUpload}
                              disabled={!isInitialized || migrationStatus === 'executing'}
                              className="hidden"
                              id="upload-mapping"
                            />
                            <label
                              htmlFor="upload-mapping"
                              className={`w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center justify-center cursor-pointer ${!isInitialized || migrationStatus === 'executing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Upload className="mr-1 h-4 w-4" />
                              CSVアップロード
                            </label>
                          </div>
                        </div>

                        {/* 自動マッピング */}
                        <button
                          onClick={autoUpdateMapping}
                          disabled={!isInitialized || isAutoMappingSubmitting || migrationStatus === 'executing'}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAutoMappingSubmitting ? '自動マッピング中...' : '自動マッピング'}
                        </button>
                      </div>

                      {/* ステップ3: 移行実行 */}
                      <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex items-center mb-3">
                          <ArrowRight className="h-5 w-5 text-red-600 mr-2" />
                          <h3 className="text-sm font-medium text-red-800">
                            ステップ3: 移行実行
                          </h3>
                        </div>
                        <p className="text-sm text-red-700 mb-3">
                          マッピングが完了したら、移行を実行します。この操作は取り消すことができません。
                        </p>

                        <button
                          onClick={executeMigration}
                          disabled={!isInitialized || migrationStatus === 'executing'}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          {migrationStatus === 'executing' ? '移行実行中...' : '移行を実行'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}