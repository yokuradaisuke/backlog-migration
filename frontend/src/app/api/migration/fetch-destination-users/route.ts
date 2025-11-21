import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { dstApiKey, dstSpaceUrl, dstProjectKey } = body;

    if (!dstApiKey || !dstSpaceUrl || !dstProjectKey) {
      return NextResponse.json(
        { error: '移行先APIキー、スペースURL、プロジェクトキーが必要です' },
        { status: 400 }
      );
    }

    console.log('移行先ユーザー取得API呼び出し:', { dstSpaceUrl, dstProjectKey });

    // PowerShellスクリプトを作成（英語のみで文字化け回避）
    const powerShellScript = `
Write-Host "PowerShell execution started"
Write-Host "API Key: ${dstApiKey.substring(0, 10)}..."
Write-Host "Space URL: ${dstSpaceUrl}"
Write-Host "Project Key: ${dstProjectKey}"

$apiKey = "${dstApiKey}"
$spaceUrl = "${dstSpaceUrl}"
$projectKey = "${dstProjectKey}"

Write-Host ""
Write-Host "# Fetching users from API"
Write-Host "URI: $spaceUrl/api/v2/projects/$projectKey/users?apiKey=$apiKey"

try {
    $users = Invoke-RestMethod -Method Get -Uri "$spaceUrl/api/v2/projects/$projectKey/users?apiKey=$apiKey"
    Write-Host "Retrieved users count: $($users.Count)"
    
    # Extract required format for destination users
    $selectedUsers = $users | Select-Object \`
        @{Name="userId";Expression={$_.userId}},
        @{Name="name";Expression={$_.name}},
        @{Name="mailAddress";Expression={$_.mailAddress}}
    
    Write-Host ""
    Write-Host "# Destination users info (debug):"
    foreach ($user in $selectedUsers) {
        Write-Host "  UserID: $($user.userId), Name: $($user.name), Email: $($user.mailAddress)"
    }
    
    Write-Host ""
    Write-Host "# JSON output start"
    Write-Host "===JSON_START==="
    $selectedUsers | ConvertTo-Json -Depth 3 | Out-String | Write-Host
    Write-Host "===JSON_END==="
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)"
    Write-Host "Details: $($_.Exception)"
    exit 1
}
`;

    // 一時的なPowerShellスクリプトファイルを作成
    const rootDir = path.resolve(process.cwd(), '..', '..');
    const tempScriptPath = path.join(rootDir, 'bin', 'temp_fetch_users.ps1');
    fs.writeFileSync(tempScriptPath, powerShellScript, { encoding: 'utf8' });

    return new Promise<NextResponse>((resolve) => {
      const childProcess = spawn('powershell.exe', [
        '-ExecutionPolicy', 'Bypass',
        '-Command', `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '${tempScriptPath}'`
      ], {
        cwd: path.join(rootDir, 'bin'),
        stdio: ['pipe', 'pipe', 'pipe']
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
        // 一時ファイルを削除
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (error) {
          console.warn('一時ファイルの削除に失敗:', error);
        }

        if (code === 0) {
          try {
            console.log('PowerShell実行完了');
            console.log('stdout:', stdout);
            console.log('stderr:', stderr);
            
            // JSON部分を抽出
            const jsonStartIndex = stdout.indexOf('===JSON_START===');
            const jsonEndIndex = stdout.indexOf('===JSON_END===');
            
            let users = [];
            
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
              const jsonPart = stdout.substring(jsonStartIndex + '===JSON_START==='.length, jsonEndIndex);
              const cleanJson = jsonPart.replace(/^\s*[\r\n]/gm, '').trim();
              
              if (cleanJson) {
                users = JSON.parse(cleanJson);
              }
            } else {
              console.warn('JSONマーカーが見つかりません。全体をパースを試行します');
              const cleanOutput = stdout.replace(/^\s*[\r\n]/gm, '').trim();
              if (cleanOutput) {
                users = JSON.parse(cleanOutput);
              }
            }

            console.log('取得したユーザー数:', users.length);

            resolve(NextResponse.json({
              success: true,
              users: users,
              message: `${users.length}件のユーザーを取得しました`,
              debugOutput: stdout
            }));
          } catch (parseError) {
            console.error('JSON解析エラー:', parseError);
            console.error('stdout:', stdout);
            
            resolve(NextResponse.json({
              success: false,
              error: 'ユーザーデータの解析に失敗しました',
              output: stdout,
              stderr: stderr,
              parseError: parseError instanceof Error ? parseError.message : String(parseError)
            }, { status: 500 }));
          }
        } else {
          console.error('PowerShell実行エラー:', stderr);
          
          resolve(NextResponse.json({
            success: false,
            error: 'ユーザー取得に失敗しました',
            output: stdout,
            stderr: stderr
          }, { status: 500 }));
        }
      });

      childProcess.on('error', (error: Error) => {
        console.error('プロセス実行エラー:', error);
        
        // 一時ファイルを削除
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (cleanupError) {
          console.warn('一時ファイルの削除に失敗:', cleanupError);
        }

        resolve(NextResponse.json({
          success: false,
          error: `プロセス実行エラー: ${error.message}`
        }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('API実行エラー:', error);
    return NextResponse.json(
      { error: `内部エラー: ${error}` },
      { status: 500 }
    );
  }
}