import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    console.log('Migration start API called');
    
    // フォームデータを取得
    const formData = await request.json();
    console.log('Received form data:', formData);

    // バイナリファイルのパスを設定
    const rootDir = path.resolve(process.cwd(), '..', '..');
    const binDir = path.join(rootDir, 'bin');
    const binPath = path.join(binDir, 'backlog-migration.bat');
    
    console.log('Paths:', { rootDir, binDir, binPath });
    
    // バイナリファイルが存在するか確認
    if (!fs.existsSync(binPath)) {
      return NextResponse.json(
        { error: 'backlog-migration.bat ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // まず初期化を実行
    console.log('Starting initialization...');
    const projectKeyFormat = `${formData.srcProjectKey}:${formData.dstProjectKey}`;
    const initArgs = [
      'init',
      '--src.key', formData.srcApiKey,
      '--src.url', formData.srcSpaceUrl,
      '--dst.key', formData.dstApiKey, 
      '--dst.url', formData.dstSpaceUrl,
      '--projectKey', projectKeyFormat
    ];

    if (formData.fitIssueKey) {
      initArgs.push('--fitIssueKey');
    }
    if (formData.excludeWiki) {
      initArgs.push('--exclude', 'wiki');
    }
    if (formData.excludeIssue) {
      initArgs.push('--exclude', 'issue');
    }
    if (formData.retryCount !== undefined && formData.retryCount !== 3) {
      initArgs.push('--retryCount', formData.retryCount.toString());
    }

    const javaOpts = '-Dfile.encoding=UTF-8 -Dconsole.encoding=UTF-8 -Duser.country=JP -Duser.language=ja';
    
    // 初期化コマンドを実行
    const quotedInitArgs = initArgs.map(arg => arg.includes(' ') ? `"${arg}"` : arg);
    const initCommand = `chcp 65001 && set "JAVA_OPTS=${javaOpts}" && backlog-migration.bat ${quotedInitArgs.join(' ')}`;
    
    console.log('Executing init command:', initCommand);
    
    const initProcess = spawn('cmd.exe', ['/c', initCommand], {
      cwd: binDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: { 
        ...globalThis.process.env, 
        'CHCP': '65001',
        'JAVA_OPTS': javaOpts
      }
    });

    // 初期化の完了を待つ
    let initOutput = '';
    const filteredOutput: string[] = [];
    
    initProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      initOutput += output;
      
      // 重要なメッセージのみ抽出
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && (
          trimmedLine.includes('移行元') ||
          trimmedLine.includes('移行先') ||
          trimmedLine.includes('フィルター') ||
          trimmedLine.includes('アクセス可能かチェック') ||
          trimmedLine.includes('プロジェクトを取得') ||
          trimmedLine.includes('情報を収集') ||
          trimmedLine.includes('マッピングファイルを作成') ||
          trimmedLine.includes('完了') ||
          trimmedLine.includes('###') ||
          trimmedLine.match(/\d+\.\d+%/)
        )) {
          filteredOutput.push(trimmedLine);
        }
      }
    });
    
    initProcess.stderr?.on('data', (data) => {
      initOutput += data.toString();
    });

    await new Promise((resolve, reject) => {
      initProcess.on('close', (code) => {
        console.log('Init process completed with code:', code);
        console.log('Init output:', initOutput);
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Init failed with code ${code}: ${initOutput}`));
        }
      });
    });

    // 初期化の出力をログファイルに保存
    const initLogPath = path.join(binDir, 'log', 'migration-init.log');
    const logDir = path.dirname(initLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 初期化の全出力を保存
    fs.writeFileSync(initLogPath, initOutput, 'utf-8');
    
    // フィルタリングされた重要な情報も保存
    if (filteredOutput.length > 0) {
      fs.appendFileSync(initLogPath, '\n=== 重要な情報 ===\n' + filteredOutput.join('\n'), 'utf-8');
    }

    // 初期化完了後、execute コマンドをバックグラウンドで実行
    console.log('Starting migration execution...');
    const executeArgs = [
      'execute',
      '--src.key', formData.srcApiKey,
      '--src.url', formData.srcSpaceUrl,
      '--dst.key', formData.dstApiKey, 
      '--dst.url', formData.dstSpaceUrl,
      '--projectKey', projectKeyFormat
    ];
    
    if (formData.fitIssueKey) {
      executeArgs.push('--fitIssueKey');
    }
    if (formData.excludeWiki) {
      executeArgs.push('--exclude', 'wiki');
    }
    if (formData.excludeIssue) {
      executeArgs.push('--exclude', 'issue');
    }
    if (formData.retryCount !== undefined && formData.retryCount !== 3) {
      executeArgs.push('--retryCount', formData.retryCount.toString());
    }
    
    const quotedExecArgs = executeArgs.map(arg => arg.includes(' ') ? `"${arg}"` : arg);
    const execCommand = `chcp 65001 && set "JAVA_OPTS=${javaOpts}" && backlog-migration.bat ${quotedExecArgs.join(' ')}`;
    
    const childProcess = spawn('cmd.exe', ['/c', execCommand], {
      cwd: binDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      detached: false,
      env: { 
        ...globalThis.process.env, 
        'CHCP': '65001',
        'JAVA_OPTS': javaOpts
      }
    });

    // Yを自動入力するためのタイマー
    const sendYesInterval = setInterval(() => {
      if (childProcess.stdin && !childProcess.stdin.destroyed) {
        try {
          childProcess.stdin.write('y\n');
        } catch (error) {
          console.log('Y送信エラー:', error);
        }
      }
    }, 2000); // 2秒間隔でYを送信

    // 出力をログファイルに保存
    const execLogPath = path.join(binDir, 'log', 'migration-execution.log');

    childProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      
      // リアルタイムでログファイルに書き込み
      fs.appendFileSync(execLogPath, output, 'utf-8');
    });

    childProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      fs.appendFileSync(execLogPath, output, 'utf-8');
    });

    childProcess.on('close', (code) => {
      clearInterval(sendYesInterval);
      console.log('Migration execution completed with code:', code);
      
      // 最終結果をログファイルに追加
      const completionMessage = code === 0 ? '移行が正常に完了しました。' : `移行がエラーで終了しました (code: ${code})`;
      fs.appendFileSync(execLogPath, `\n${completionMessage}\n`, 'utf-8');
    });

    // 5分後に予防的にY送信を停止
    setTimeout(() => {
      clearInterval(sendYesInterval);
    }, 300000);

    console.log('Migration process started in background, PID:', childProcess.pid);

    return NextResponse.json({
      success: true,
      message: '移行がバックグラウンドで開始されました',
      pid: childProcess.pid
    });

  } catch (error) {
    console.error('Migration start error:', error);
    return NextResponse.json(
      { error: `移行開始エラー: ${error}` },
      { status: 500 }
    );
  }
}