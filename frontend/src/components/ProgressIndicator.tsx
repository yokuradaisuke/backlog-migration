import { CheckCircle, XCircle } from 'lucide-react';

type MigrationStatus = 'idle' | 'initializing' | 'mapping-complete' | 'executing' | 'completed' | 'error';

// プログレスインジケーターコンポーネント
export function ProgressIndicator({ migrationStatus, preparationCompleted }: { migrationStatus: MigrationStatus; preparationCompleted: boolean }) {
  const steps = [
    { id: 'idle', label: '準備' },
    { id: 'initializing', label: '初期化' },
    { id: 'mapping-complete', label: 'マッピング' },
    { id: 'executing', label: '移行実行' },
    { id: 'completed', label: '完了' }
  ];

  const getStepStatus = (stepId: string) => {
    const currentIndex = steps.findIndex(step => step.id === migrationStatus);
    const stepIndex = steps.findIndex(step => step.id === stepId);

    if (migrationStatus === 'error') {
      return stepIndex <= currentIndex ? 'error' : 'pending';
    }

    // 準備ステップは preparationCompleted で判定
    if (stepId === 'idle') {
      return preparationCompleted ? 'completed' : (migrationStatus === 'idle' ? 'current' : 'pending');
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-3">移行進行状況</h3>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const nextStatus = index < steps.length - 1 ? getStepStatus(steps[index + 1].id) : null;

          // 線の色を決定
          const getLineColor = () => {
            if (migrationStatus === 'error' && status === 'current') {
              return 'bg-red-500';
            }
            if (status === 'completed') {
              return 'bg-green-500';
            }
            if (status === 'current' && nextStatus) {
              return 'bg-gradient-to-r from-blue-500 to-gray-200';
            }
            return 'bg-gray-200';
          };

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  status === 'completed' ? 'bg-green-500 text-white' :
                  status === 'current' ? 'bg-blue-500 text-white animate-pulse' :
                  status === 'error' ? 'bg-red-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                   status === 'error' ? <XCircle className="w-4 h-4" /> :
                   index + 1}
                </div>
                <span className={`mt-1 text-xs font-medium ${
                  status === 'completed' ? 'text-green-600' :
                  status === 'current' ? 'text-blue-600' :
                  status === 'error' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ease-in-out ${getLineColor()}`}
                       style={{
                         width: status === 'completed' ? '100%' :
                                status === 'current' ? '50%' : '0%'
                       }}>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}