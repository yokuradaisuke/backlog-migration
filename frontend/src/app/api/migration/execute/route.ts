import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      srcKey, 
      srcUrl, 
      dstKey, 
      dstUrl, 
      projectKey,
      fitIssueKey,
      excludeWiki,
      excludeIssue,
      retryCount
    } = body;

    if (!srcKey || !srcUrl || !dstKey || !dstUrl || !projectKey) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // バイナリファイルのパスを設定 (frontend/backlog-migration-ui から ルートへ)
    const rootDir = path.resolve(process.cwd(), '..', '..');
    const binDir = path.join(rootDir, 'bin');
    const binPath = path.join(binDir, 'backlog-migration.bat');
    
    console.log('Paths:', { rootDir, binDir, binPath });
    
    // バイナリファイルが存在するか確認
    if (!fs.existsSync(binPath)) {
      return NextResponse.json(
        { error: `backlog-migration.bat ファイルが見つかりません: ${binPath}` },
        { status: 404 }
      );
    }

    // execute コマンドを実行（エクスポート + インポート）
    const args = [
      'execute',
      '--src.key', srcKey,
      '--src.url', srcUrl,
      '--dst.key', dstKey,
      '--dst.url', dstUrl,
      '--projectKey', projectKey
    ];

    // オプションを追加
    if (fitIssueKey) {
      args.push('--fitIssueKey');
    }
    if (excludeWiki) {
      args.push('--exclude', 'wiki');
    }
    if (excludeIssue) {
      args.push('--exclude', 'issue');
    }
    if (retryCount !== undefined && retryCount !== 3) {
      args.push('--retryCount', retryCount.toString());
    }

    // Server-Sent Eventsを使用してリアルタイムログを送信
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // backlogディレクトリを確実に作成
        const backlogDir = path.join(binDir, 'backlog');
        if (!fs.existsSync(backlogDir)) {
          fs.mkdirSync(backlogDir, { recursive: true });
        }
        
        const javaOpts = '-Dfile.encoding=UTF-8 -Dconsole.encoding=UTF-8 -Duser.country=JP -Duser.language=ja';
        // 引数を適切に引用符で囲む
        const quotedArgs = args.map(arg => arg.includes(' ') ? `"${arg}"` : arg);
        const command = `chcp 65001 && set "JAVA_OPTS=${javaOpts}" && backlog-migration.bat ${quotedArgs.join(' ')}`;
        const childProcess = spawn('cmd.exe', ['/c', command], {
          cwd: binDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { 
            ...globalThis.process.env, 
            'CHCP': '65001',
            'JAVA_OPTS': javaOpts
          }
        });

        let stdout = '';
        let stderr = '';

        // プロセス開始後、複数回にわたって予防的に"y"を送信
        const sendYesInterval = setInterval(() => {
          try {
            childProcess.stdin?.write('y\n');
            console.log('予防的に "y" を送信しました');
          } catch (error) {
            console.warn('予防的な標準入力への書き込みに失敗:', error);
          }
        }, 10000); // 10秒ごとに実行
        
        // 5分後にインターバルを停止
        setTimeout(() => {
          clearInterval(sendYesInterval);
          console.log('予防的な "y" 送信を停止しました');
        }, 300000);

        // ログファイルのパスを設定
        const logFilePath = path.join(binDir, 'log', 'backlog-migration.log');
        let lastLogSize = 0;
        let logWatcher: NodeJS.Timeout | null = null;

        // ログファイルの初期サイズを取得
        if (fs.existsSync(logFilePath)) {
          lastLogSize = fs.statSync(logFilePath).size;
        }

        // ログファイルを定期的にチェック
        const watchLogFile = () => {
          if (fs.existsSync(logFilePath)) {
            const currentSize = fs.statSync(logFilePath).size;
            if (currentSize > lastLogSize) {
              const stream = fs.createReadStream(logFilePath, {
                start: lastLogSize,
                encoding: 'utf8'
              });
              
              stream.on('data', (chunk: string | Buffer) => {
                const data = chunk.toString();
                const lines = data.split('\n').filter(line => line.trim());
                for (const line of lines) {
                  if (line.trim()) {
                    // ログの詳細分析
                    const logLine = line.trim();
                    let logLevel = 'info';
                    
                    // ログレベルの判定
                    if (logLine.includes('ERROR') || logLine.includes('Exception') || logLine.includes('Failed') || logLine.includes('エラー')) {
                      logLevel = 'error';
                    } else if (logLine.includes('WARNING') || logLine.includes('WARN') || logLine.includes('警告')) {
                      logLevel = 'warn';
                    } else if (logLine.includes('SUCCESS') || logLine.includes('完了') || logLine.includes('Completed') || logLine.includes('成功')) {
                      logLevel = 'success';
                    } else if (logLine.includes('INFO') || logLine.includes('情報')) {
                      logLevel = 'info';
                    }
                    
                    const message = `data: ${JSON.stringify({ 
                      type: 'log', 
                      level: logLevel,
                      message: `[詳細ログ] ${logLine}`,
                      source: 'logfile'
                    })}\n\n`;
                    
                    // コントローラーが閉じられていないかチェック
                    try {
                      controller.enqueue(encoder.encode(message));
                    } catch {
                      // コントローラーが既に閉じられている場合は無視
                      console.warn('コントローラーが既に閉じられています');
                    }
                  }
                }
              });
              
              lastLogSize = currentSize;
            }
          }
        };

        // 1秒ごとにログファイルをチェック
        logWatcher = setInterval(watchLogFile, 1000);

        // リアルタイムでログを送信
        childProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString('utf8');
          stdout += output;
          
          // コンソール出力の詳細分析
          const lines = output.trim().split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.trim()) {
              let logLevel = 'info';
              
              // 対話式質問を検出して自動回答
              if (line.includes('(y/n') || 
                  line.includes('インポートしますか') || 
                  line.includes('続行しますか') ||
                  line.includes('実行しますか') ||
                  line.includes('既に存在します') ||
                  line.includes('[n]:') ||
                  line.includes('？') ||
                  line.includes('?')) {
                // 複数回送信して確実にする
                try {
                  for (let i = 0; i < 3; i++) {
                    childProcess.stdin?.write('y\n');
                  }
                  console.log('自動的に "y" を選択しました (x3):', line.trim());
                } catch (error) {
                  console.warn('標準入力への書き込みに失敗:', error);
                }
              }
              
              // 実行状況に応じたレベル判定
              if (line.includes('エラー') || line.includes('error') || line.includes('失敗')) {
                logLevel = 'error';
              } else if (line.includes('警告') || line.includes('warning')) {
                logLevel = 'warn';
              } else if (line.includes('完了') || line.includes('成功') || line.includes('success')) {
                logLevel = 'success';
              }
              
              const message = `data: ${JSON.stringify({ 
                type: 'console',
                level: logLevel, 
                message: `[コンソール] ${line.trim()}`,
                source: 'stdout'
              })}\n\n`;
              
              try {
                controller.enqueue(encoder.encode(message));
              } catch {
                console.warn('コントローラーが既に閉じられています（stdout）');
              }
            }
          }
        });

        childProcess.stderr?.on('data', (data: Buffer) => {
          const error = data.toString('utf8');
          stderr += error;
          
          // エラー出力の詳細分析
          const lines = error.trim().split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.trim()) {
              const message = `data: ${JSON.stringify({ 
                type: 'error',
                level: 'error', 
                message: `[エラー] ${line.trim()}`,
                source: 'stderr'
              })}\n\n`;
              
              try {
                controller.enqueue(encoder.encode(message));
              } catch {
                console.warn('コントローラーが既に閉じられています（stderr）');
              }
            }
          }
        });

        childProcess.on('close', (code: number | null) => {
          // インターバルを停止
          clearInterval(sendYesInterval);
          
          // ログファイル監視を停止
          if (logWatcher) {
            clearInterval(logWatcher);
          }

          // 最後にログファイルの残りを読み取り
          setTimeout(() => {
            watchLogFile();
            
            // 完了メッセージを送信
            const result = code === 0 ? {
              type: 'complete',
              success: true,
              message: '移行が完了しました',
              output: stdout
            } : {
              type: 'complete',
              success: false,
              error: '移行に失敗しました',
              output: stderr || stdout
            };
            
            const message = `data: ${JSON.stringify(result)}\n\n`;
            
            try {
              controller.enqueue(encoder.encode(message));
              controller.close();
            } catch {
              console.warn('コントローラーが既に閉じられています（完了処理）');
            }
          }, 2000); // 2秒待ってから完了
        });

        childProcess.on('error', (error: Error) => {
          // インターバルを停止
          clearInterval(sendYesInterval);
          
          if (logWatcher) {
            clearInterval(logWatcher);
          }
          
          const message = `data: ${JSON.stringify({ 
            type: 'error', 
            message: `プロセス実行エラー: ${error.message}` 
          })}\n\n`;
          
          try {
            controller.enqueue(encoder.encode(message));
            controller.close();
          } catch {
            console.warn('コントローラーが既に閉じられています（エラー処理）');
          }
        });

        // タイムアウト処理
        setTimeout(() => {
          // インターバルを停止
          clearInterval(sendYesInterval);
          
          if (logWatcher) {
            clearInterval(logWatcher);
          }
          
          childProcess.kill('SIGTERM');
          const message = `data: ${JSON.stringify({ 
            type: 'error', 
            message: 'タイムアウトしました' 
          })}\n\n`;
          
          try {
            controller.enqueue(encoder.encode(message));
            controller.close();
          } catch {
            console.warn('コントローラーが既に閉じられています（タイムアウト処理）');
          }
        }, 300000); // 5分でタイムアウト
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}