import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Init API called');
    const body = await request.json();
    const { srcKey, srcUrl, dstKey, dstUrl, projectKey } = body;
    
    console.log('Request body:', { srcUrl, dstUrl, projectKey });

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
    const mappingDir = path.join(binDir, 'mapping');
    
    console.log('Paths:', { rootDir, binDir, binPath, mappingDir });
    
    // mappingディレクトリが存在しない場合は作成
    if (!fs.existsSync(mappingDir)) {
      fs.mkdirSync(mappingDir, { recursive: true });
    }
    
    console.log('Paths:', { rootDir, binPath });
    
    // バイナリファイルが存在するか確認
    const binExists = fs.existsSync(binPath);
    console.log('Binary file exists:', binExists);
    
    if (!binExists) {
      return NextResponse.json(
        { error: 'backlog-migration.bat ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // init コマンドを実行
    const args = [
      'init',
      '--src.key', srcKey,
      '--src.url', srcUrl,
      '--dst.key', dstKey,
      '--dst.url', dstUrl,
      '--projectKey', projectKey
    ];

    return new Promise((resolve) => {
      const javaOpts = '-Dfile.encoding=UTF-8 -Dconsole.encoding=UTF-8 -Duser.country=JP -Duser.language=ja';
      // 引数を適切に引用符で囲む
      const quotedArgs = args.map(arg => arg.includes(' ') ? `"${arg}"` : arg);
      const command = `chcp 65001 && set "JAVA_OPTS=${javaOpts}" && backlog-migration.bat ${quotedArgs.join(' ')}`;
      console.log('Executing command:', command);
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

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString('utf8');
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString('utf8');
      });

      childProcess.on('close', (code: number | null) => {
        console.log('Process exited with code:', code);
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
        // ログファイルからも詳細ログを取得
        const logFilePath = path.join(binDir, 'log', 'backlog-migration.log');
        let detailedLogs = '';
        
        if (fs.existsSync(logFilePath)) {
          try {
            // 最新の100行を取得
            const logContent = fs.readFileSync(logFilePath, 'utf8');
            const logLines = logContent.split('\n');
            detailedLogs = logLines.slice(-100).join('\n');
          } catch (error) {
            console.error('ログファイル読み取りエラー:', error);
          }
        }

        if (code === 0) {
          // backlogディレクトリが存在しない場合は作成
          const backlogDataDir = path.join(binDir, 'backlog');
          if (!fs.existsSync(backlogDataDir)) {
            fs.mkdirSync(backlogDataDir, { recursive: true });
          }
          
          // project.jsonファイルが存在しない場合は空のファイルを作成
          const projectJsonPath = path.join(backlogDataDir, 'project.json');
          if (!fs.existsSync(projectJsonPath)) {
            fs.writeFileSync(projectJsonPath, '{}', 'utf8');
          }
          
          // 初期化成功後、生成されたファイルの情報を取得
          const usersFilePath = path.join(mappingDir, 'users.csv');
          const usersListFilePath = path.join(mappingDir, 'users_list.csv');
          
          const filesGenerated = {
            usersFile: fs.existsSync(usersFilePath),
            usersListFile: fs.existsSync(usersListFilePath)
          };

          resolve(NextResponse.json({
            success: true,
            message: '初期化が完了しました',
            output: stdout,
            detailedLogs: detailedLogs,
            filesGenerated,
            downloadUrls: {
              users: filesGenerated.usersFile ? '/api/migration/download/users' : null,
              usersList: filesGenerated.usersListFile ? '/api/migration/download/users_list' : null
            }
          }));
        } else {
          resolve(NextResponse.json(
            {
              error: '初期化に失敗しました',
              output: stderr || stdout,
              detailedLogs: detailedLogs
            },
            { status: 500 }
          ));
        }
      });

      childProcess.on('error', (error: Error) => {
        resolve(NextResponse.json(
          { error: `プロセス実行エラー: ${error.message}` },
          { status: 500 }
        ));
      });

      // タイムアウト処理
      setTimeout(() => {
        childProcess.kill('SIGTERM');
        resolve(NextResponse.json(
          { error: 'タイムアウトしました' },
          { status: 408 }
        ));
      }, 60000); // 1分でタイムアウト
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: `サーバーエラーが発生しました: ${error}` },
      { status: 500 }
    );
  }
}