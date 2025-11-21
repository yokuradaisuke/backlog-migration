import { AlertCircle, FileCheck } from 'lucide-react';

// 前準備コンテナコンポーネント
export function PreparationContainer({ onPreparationComplete }: { onPreparationComplete: () => void }) {
  return (
    <div className="bg-white overflow-y-auto">
      <div className="p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
          <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
          移行前の注意点（前準備）
        </h2>

        <div className="space-y-4">
          {/* 状態変更制限 */}
          <div className="border border-gray-300 p-3 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              「状態を追加」と「状態名の変更」を合計9回以上おこなったプロジェクトは移行できません
            </h3>
            <p className="text-gray-700 text-xs leading-5">
              移行元の Backlog プロジェクト設定にある「状態」にて、<br/>
              ・状態を追加<br/>
              ・状態名の変更<br/>
              を合計 9回以上おこなっているプロジェクトは移行できません。
            </p>
          </div>

          {/* 移行対象外データ */}
          <div className="border border-gray-300 p-3 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              以下のデータは移行できません（対象外データ）
            </h3>
            <p className="text-gray-700 text-xs mb-2">
              以下のデータはデータ移行の対象外となります。<br/>
              これらの取り扱いは、各事業部でご判断ください。
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-xs">
              <li>スター（課題・コメント・Wiki）</li>
              <li>お知らせの既読状態</li>
              <li>共有ファイル</li>
              <li>Subversion</li>
              <li>Git</li>
              <li>プロジェクト設定<br/>
                　（チャートを使用する／親子課題を使用する／ドキュメントを使用可能にする／テキスト整形のルール 以外）</li>
              <li>グローバルバーの「全体からキーワード検索」のインデックス</li>
              <li>ドキュメント</li>
            </ul>
          </div>

          {/* 事前準備情報 */}
          <div className="border border-gray-300 p-3 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              事前に必要な情報（準備しておく内容）
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-xs">移行元</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-xs">
                  <li>移行元 API キー</li>
                  <li>移行元 URL</li>
                  <li>移行元プロジェクトキー</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-xs">移行先</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-xs">
                  <li>移行先 API キー</li>
                  <li>移行先 URL</li>
                  <li>移行先プロジェクトキー</li>
                </ul>
              </div>
            </div>

            <div className="mt-3 p-2 bg-gray-50 rounded">
              <p className="text-gray-900 text-xs font-medium">※ 重要な注意事項</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-xs mt-1">
                <li>移行先プロジェクトは事前に作成しておく必要があります</li>
                <li>作成済みの移行先プロジェクト内にメンバーを追加しておいてください</li>
              </ul>
            </div>
          </div>

          {/* 準備完了ボタン */}
          <div className="flex justify-center pt-2">
            <button
              onClick={onPreparationComplete}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center text-sm font-medium"
            >
              <FileCheck className="mr-2 h-4 w-4" />
              準備完了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}