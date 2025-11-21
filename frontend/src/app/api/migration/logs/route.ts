import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface LogEntry {
  level?: string;
  message: string;
}

export async function GET() {
  try {
    console.log('Log polling API called');

    // ログファイルのパスを設定
    const rootDir = path.resolve(process.cwd(), '..', '..');
    const binDir = path.join(rootDir, 'bin');
    const logDir = path.join(binDir, 'log');
    
    // ログファイルを検索
    let logs: LogEntry[] = [];
    let migrationStatus = 'running';

    if (fs.existsSync(logDir)) {
      // 最新のログファイルを優先して読み込み
      const logFiles = ['migration-execution.log', 'migration-init.log', 'backlog-migration.log'];
      let allLogContent = '';
      
      for (const logFile of logFiles) {
        const logPath = path.join(logDir, logFile);
        if (fs.existsSync(logPath)) {
          try {
            const content = fs.readFileSync(logPath, 'utf-8');
            allLogContent += content + '\n';
          } catch (error) {
            console.log(`Error reading ${logFile}:`, error);
          }
        }
      }
      
      if (allLogContent) {
        const lines = allLogContent.split('\n').filter(line => line.trim());
        
        // ログを整理し、重要な情報のみ抽出
        const processedLogs = new Set<string>();
        
        logs = lines
          .map(line => {
            // ANSIエスケープシーケンスを除去
            return line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
                      .replace(/\[\d+D/g, '')
                      .replace(/\[\d+A/g, '')
                      .replace(/\[2K/g, '')
                      .replace(/\[999D/g, '')
                      .replace(/\[\d*m/g, '')
                      .replace(/\[34m/g, '')
                      .trim();
          })
          .filter(line => {
            if (!line) return false;
            
            // 詳細なタイムスタンプやスレッド情報を除外
            if (line.match(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/) ||
                line.includes('scala-execution-context') ||
                line.includes('main-actor-system') ||
                line.includes('INFO c.n.b.m.common')) {
              return false;
            }
            
            // 重要なメッセージのみ抽出
            const isImportant = line.includes('移行元 URL[') ||
                               line.includes('移行先 URL[') ||
                               line.includes('移行元 アクセスキー[') ||
                               line.includes('移行先 アクセスキー[') ||
                               line.includes('移行元 プロジェクトキー[') ||
                               line.includes('移行先 プロジェクトキー[') ||
                               line.includes('アクセス可能かチェックしています') ||
                               line.includes('プロジェクトを取得しています') ||
                               line.includes('情報を収集します') ||
                               line.includes('収集が完了しました') ||
                               line.includes('マッピングファイルを作成') ||
                               line.includes('エクスポートを開始') ||
                               line.includes('エクスポートが完了') ||
                               line.includes('コンバートを開始') ||
                               line.includes('コンバートが完了') ||
                               line.includes('インポートを開始') ||
                               line.includes('インポートが完了') ||
                               line.includes('移行が正常に完了') ||
                               line.includes('エラーが発生') ||
                               line.match(/\[\d+\/\d+\].*\d+\.\d+%/) ||
                               line.includes('プロジェクト[.*]に課題とWikiをインポートしますか') ||
                               line.includes('ユーザーのマッピングは次のようになります') ||
                               line.match(/^- .+ => .+$/) ||
                               line.includes('移行を実行しますか');
            
            if (isImportant) {
              // 区切り線の特別処理 - 大幅に制限
              if (line === '--------------------------------------------------') {
                const dashKey = 'DASH_LINE';
                if (processedLogs.has(dashKey)) {
                  return false; // 2回目以降は全てスキップ
                }
                processedLogs.add(dashKey);
                return true;
              }
              
              // マッピング情報の制御
              if (line.includes('ユーザーのマッピングは次のようになります')) {
                if (processedLogs.has('USER_MAPPING_HEADER')) return false;
                processedLogs.add('USER_MAPPING_HEADER');
                return true;
              }
              
              if (line.match(/^- .+ => .+$/)) {
                const mappingCount = Array.from(processedLogs).filter(k => k.startsWith('MAPPING_')).length;
                if (mappingCount >= 24) return false; // 最大24行まで
                processedLogs.add('MAPPING_' + mappingCount);
                return true;
              }
              
              if (line.includes('移行を実行しますか')) {
                if (processedLogs.has('MIGRATION_CONFIRM')) return false;
                processedLogs.add('MIGRATION_CONFIRM');
                return true;
              }
              
              // その他のメッセージの重複チェック（URLやアクセスキーは保持）
              const messageKey = line
                .replace(/\s+/g, ' ')
                .trim();
              
              if (processedLogs.has(messageKey)) {
                return false;
              }
              processedLogs.add(messageKey);
              return true;
            }
            
            return false;
          })
          .map(line => {
            // ログレベルを判定
            if (line.includes('エラー') || line.includes('失敗') || line.includes('ERROR')) {
              return { level: 'error', message: line };
            } else if (line.includes('WARNING') || line.includes('警告')) {
              return { level: 'warning', message: line };
            } else if (line.includes('完了') || line.includes('SUCCESS')) {
              return { level: 'success', message: line };
            } else {
              return { level: 'info', message: line };
            }
          });

        // 移行完了を判定
        if (allLogContent.includes('インポートが完了しました') || 
            allLogContent.includes('移行が正常に完了しました') ||
            allLogContent.includes('Migration completed')) {
          migrationStatus = 'completed';
        } else if (allLogContent.includes('移行中にエラーが発生しました') ||
                   allLogContent.includes('Init failed') ||
                   allLogContent.includes('Migration start error')) {
          migrationStatus = 'error';
        }
      }
    }

    // プロセス情報ファイルの確認
    const processInfoPath = path.join(binDir, 'migration-process.json');
    let processInfo = null;
    
    if (fs.existsSync(processInfoPath)) {
      try {
        const processData = fs.readFileSync(processInfoPath, 'utf-8');
        processInfo = JSON.parse(processData);
      } catch (e) {
        console.log('Process info file read error:', e);
      }
    }

    // 移行完了のファイナルチェック
    const projectJsonPath = path.join(binDir, 'backlog', 'project.json');
    let migrationComplete = false;
    
    if (fs.existsSync(projectJsonPath)) {
      try {
        const stats = fs.statSync(projectJsonPath);
        const now = Date.now();
        const fileAge = now - stats.mtime.getTime();
        
        // ファイルが更新されてから30秒以上経過している場合、移行完了とみなす
        if (fileAge > 30000 && migrationStatus !== 'error') {
          migrationComplete = true;
          migrationStatus = 'completed';
        }
      } catch (e) {
        console.log('Project JSON check error:', e);
      }
    }

    const response = {
      logs,
      status: migrationStatus,
      processInfo,
      migrationComplete,
      timestamp: Date.now()
    };

    console.log(`Log polling response: ${logs.length} logs, status: ${migrationStatus}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Log polling error:', error);
    return NextResponse.json(
      { 
        error: `ログ取得エラー: ${error}`,
        logs: [],
        status: 'error',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}