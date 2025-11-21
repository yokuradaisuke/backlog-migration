import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'CSVファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    const rootDir = path.resolve(process.cwd(), '..', '..');
    const mappingDir = path.join(rootDir, 'bin', 'mapping');
    
    // mappingディレクトリが存在しない場合は作成
    if (!fs.existsSync(mappingDir)) {
      fs.mkdirSync(mappingDir, { recursive: true });
    }

    const usersFilePath = path.join(mappingDir, 'users.csv');
    const fileContent = await file.arrayBuffer();
    
    fs.writeFileSync(usersFilePath, Buffer.from(fileContent));

    return NextResponse.json({
      success: true,
      message: 'users.csv ファイルがアップロードされました'
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}