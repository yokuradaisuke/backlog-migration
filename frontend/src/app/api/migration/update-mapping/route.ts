import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destinationUsers } = body;

    if (!destinationUsers || !Array.isArray(destinationUsers)) {
      return NextResponse.json(
        { error: '移行先ユーザーデータが必要です' },
        { status: 400 }
      );
    }

    console.log('CSVマッピング更新開始:', destinationUsers.length, '件のユーザー');

    // CSVファイルパス
    const rootDir = path.resolve(process.cwd(), '..', '..');
    const csvPath = path.join(rootDir, 'bin', 'mapping', 'users.csv');

    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: 'users.csvファイルが見つかりません' },
        { status: 404 }
      );
    }

    // 既存CSVを読み込み
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    });

    console.log('既存CSV行数:', records.length);

    // 移行先ユーザー情報からメールアドレス -> user id のマップを作成
    const destinationUserMap = new Map<string, string>();
    destinationUsers.forEach(user => {
      if (user.mailAddress) {
        destinationUserMap.set(user.mailAddress, user.userId);
      }
    });

    console.log('移行先ユーザーマップサイズ:', destinationUserMap.size);
    console.log('移行先ユーザーマップ内容:');
    for (const [email, userId] of destinationUserMap.entries()) {
      console.log(`  ${email} -> ${userId}`);
    }

    // CSVを更新
    let updatedCount = 0;
    const updatedRecords = (records as Record<string, string>[]).map((record, index) => {
      const sourceEmail = record['Source Backlog user email'];
      const sourceUserId = record['Source Backlog user id'];
      
      console.log(`処理対象レコード ${index + 1}:`, {
        sourceUserId: sourceUserId,
        sourceUserName: record['Source Backlog user display name'],
        sourceEmail: sourceEmail,
        currentDestinationUserId: record['Destination Backlog user name']
      });
      
      // 移行元のメールアドレスが移行先に存在するかチェック
      if (sourceEmail && destinationUserMap.has(sourceEmail)) {
        // メールアドレスが移行先に存在する場合、移行先のuser idを設定
        const destinationUserId = destinationUserMap.get(sourceEmail);
        if (destinationUserId) {
          const oldValue = record['Destination Backlog user name'];
          record['Destination Backlog user name'] = destinationUserId;
          console.log(`✓ マッピング更新: ${sourceEmail} -> 旧値: ${oldValue} 新値: ${destinationUserId}`);
          updatedCount++;
        }
      } else {
        // 移行先に対応するユーザーが存在しない場合、移行元のuser idをそのまま使用
        const oldValue = record['Destination Backlog user name'];
        record['Destination Backlog user name'] = sourceUserId;
        console.log(`- マッピング維持（移行先に該当なし）: ${sourceEmail || 'メールなし'} -> 旧値: ${oldValue} 新値: ${sourceUserId}`);
      }
      
      return record;
    });

    // 更新されたCSVを書き込み
    const updatedCsvContent = stringify(updatedRecords, {
      header: true,
      delimiter: ',',
      quoted: true
    });

    fs.writeFileSync(csvPath, updatedCsvContent, 'utf8');

    console.log('CSV更新完了:', updatedCount, '件更新');

    return NextResponse.json({
      success: true,
      message: `CSVマッピングを更新しました（${updatedCount}/${records.length}件マッチ）`,
      totalRecords: records.length,
      updatedRecords: updatedCount,
      unmatchedRecords: records.length - updatedCount
    });

  } catch (error) {
    console.error('CSVマッピング更新エラー:', error);
    return NextResponse.json(
      { error: `CSVマッピング更新エラー: ${error}` },
      { status: 500 }
    );
  }
}