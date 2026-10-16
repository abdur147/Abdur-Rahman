'use client';

import { createClient } from './supabase/client';
import { ORDER_FILES_BUCKET } from './files';

export interface UploadTargetDTO {
  fileId: string;
  name: string;
  path: string;
  token: string;
}

/**
 * Uploads files straight to private storage using the one-time signed URLs
 * issued by our API, then asks the server to confirm them.
 * `targets[i]` belongs to `files[i]`.
 */
export async function uploadToTargets(params: {
  orderId: string;
  files: File[];
  targets: UploadTargetDTO[];
  token?: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<{ uploaded: number; failed: string[] }> {
  const supabase = createClient();
  const okIds: string[] = [];
  const failed: string[] = [];
  const total = params.targets.length;

  for (let i = 0; i < total; i++) {
    const target = params.targets[i]!;
    const file = params.files[i];
    if (!file) continue;
    const { error } = await supabase.storage.from(ORDER_FILES_BUCKET).uploadToSignedUrl(target.path, target.token, file, {
      contentType: file.type,
    });
    if (error) failed.push(file.name);
    else okIds.push(target.fileId);
    params.onProgress?.(i + 1, total);
  }

  if (okIds.length) {
    await fetch(`/api/orders/${params.orderId}/files/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: okIds, token: params.token }),
    }).catch(() => undefined);
  }
  return { uploaded: okIds.length, failed };
}
