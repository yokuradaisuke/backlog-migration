import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rootDir = path.resolve(process.cwd(), '..', '..');
    const usersFilePath = path.join(rootDir, 'bin', 'mapping', 'users.csv');

    if (!fs.existsSync(usersFilePath)) {
      return NextResponse.json(
        { error: 'users.csv ファイルが見つかりません。先に初期化を実行してください。' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(usersFilePath);
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="users.csv"'
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