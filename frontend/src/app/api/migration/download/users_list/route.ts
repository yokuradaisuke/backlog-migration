import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rootDir = path.resolve(process.cwd(), '..', '..');
    const usersListFilePath = path.join(rootDir, 'bin', 'mapping', 'users_list.csv');

    if (!fs.existsSync(usersListFilePath)) {
      return NextResponse.json(
        { error: 'users_list.csv ファイルが見つかりません。先に初期化を実行してください。' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(usersListFilePath);
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="users_list.csv"'
      }
    });

  } catch (error) {
    console.error('Download Error:', error);
    return NextResponse.json(
      { error: 'ファイルのダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}