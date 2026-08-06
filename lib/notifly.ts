// lib/notifly.ts
import { notify } from '@ambersecurityinc/notifly';
import type { NotiflyMessage, NotiflyResult } from '@ambersecurityinc/notifly';

export type { NotiflyMessage, NotiflyResult };

export interface SendNotificationParams {
  urls: string[];
  title?: string;
  body: string;
  type?: NotiflyMessage['type'];
}

export async function sendNotification(params: SendNotificationParams): Promise<NotiflyResult[]> {
  if (!params.urls || params.urls.length === 0) {
    return [{ success: false, service: 'unknown', error: 'URL 列表为空' }];
  }
  try {
    return await notify(
      { urls: params.urls },
      { title: params.title, body: params.body, type: params.type },
    );
  } catch (err) {
    return [{ success: false, service: 'unknown', error: (err as Error).message }];
  }
}
