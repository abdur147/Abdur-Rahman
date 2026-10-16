import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ORDER_FILES_BUCKET, buildStoragePath } from './files';

export interface UploadTarget {
  fileId: string;
  name: string;
  path: string;
  token: string;
}

/**
 * Creates `order_files` rows (status "pending") and one-time signed upload URLs.
 * The browser then uploads straight to private storage — large files never pass
 * through our server (avoids serverless body-size limits).
 */
export async function issueUploadTargets(
  admin: SupabaseClient,
  orderId: string,
  kind: 'reference' | 'deliverable',
  files: { name: string; type: string; size: number }[],
  uploadedBy: string | null,
): Promise<UploadTarget[]> {
  const targets: UploadTarget[] = [];
  for (const file of files) {
    const path = buildStoragePath(orderId, kind, file.name, crypto.randomUUID());
    const { data: signed, error: signError } = await admin.storage.from(ORDER_FILES_BUCKET).createSignedUploadUrl(path);
    if (signError || !signed) throw new Error(`Could not prepare upload: ${signError?.message ?? 'unknown error'}`);

    const { data: row, error: rowError } = await admin
      .from('order_files')
      .insert({
        order_id: orderId,
        kind,
        storage_path: path,
        file_name: file.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180),
        mime_type: file.type,
        size_bytes: file.size,
        upload_status: 'pending',
        uploaded_by: uploadedBy,
      })
      .select('id')
      .single();
    if (rowError || !row) throw new Error(`Could not record upload: ${rowError?.message ?? 'unknown error'}`);

    targets.push({ fileId: row.id as string, name: file.name, path: signed.path, token: signed.token });
  }
  return targets;
}

/** Confirms each pending file really exists in storage, then marks it uploaded. */
export async function confirmUploads(admin: SupabaseClient, orderId: string, fileIds: string[]): Promise<number> {
  if (fileIds.length === 0) return 0;
  const { data: rows } = await admin
    .from('order_files')
    .select('id, storage_path, upload_status')
    .eq('order_id', orderId)
    .in('id', fileIds);

  let confirmed = 0;
  for (const row of rows ?? []) {
    if (row.upload_status === 'uploaded') {
      confirmed++;
      continue;
    }
    const path = row.storage_path as string;
    const folder = path.slice(0, path.lastIndexOf('/'));
    const base = path.slice(path.lastIndexOf('/') + 1);
    const { data: listing } = await admin.storage.from(ORDER_FILES_BUCKET).list(folder, { search: base, limit: 5 });
    const object = ((listing ?? []) as { name: string; metadata: unknown }[]).find((o) => o.name === base);
    if (!object) continue;
    const size = Number((object.metadata as { size?: number } | null)?.size ?? 0);
    await admin
      .from('order_files')
      .update({ upload_status: 'uploaded', ...(size > 0 ? { size_bytes: size } : {}) })
      .eq('id', row.id);
    confirmed++;
  }
  return confirmed;
}
