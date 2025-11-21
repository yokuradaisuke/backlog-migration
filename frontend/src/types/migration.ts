import { z } from 'zod';

export const formSchema = z.object({
  srcApiKey: z.string().min(1, '移行元APIキーは必須です'),
  srcSpaceUrl: z.string().min(1, '移行元スペースURLは必須です').url('正しいURL形式で入力してください'),
  dstApiKey: z.string().min(1, '移行先APIキーは必須です'),
  dstSpaceUrl: z.string().min(1, '移行先スペースURLは必須です').url('正しいURL形式で入力してください'),
  srcProjectKey: z.string().min(1, '移行元プロジェクトキーは必須です'),
  dstProjectKey: z.string().min(1, '移行先プロジェクトキーは必須です'),
});

export type FormData = z.infer<typeof formSchema>;

export type MigrationStatus = 'idle' | 'initializing' | 'mapping-complete' | 'executing' | 'completed' | 'error';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}