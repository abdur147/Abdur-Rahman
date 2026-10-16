/** Upload rules shared by browser and server. */

export const ORDER_FILES_BUCKET = 'order-files';
export const PORTFOLIO_BUCKET = 'portfolio';

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/vnd.adobe.photoshop': 'psd',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

export const PORTFOLIO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export const MAX_REFERENCE_FILES = 5;
/** 20 MB per customer reference file. */
export const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
/** 50 MB per deliverable (Supabase free-plan per-file maximum). */
export const MAX_DELIVERABLE_BYTES = 50 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_UPLOAD_TYPES).join(',');

export function isAllowedType(mime: string): boolean {
  return Object.prototype.hasOwnProperty.call(ALLOWED_UPLOAD_TYPES, mime);
}

/** Lower-case, ASCII-only, no path separators, max 80 chars, keeps extension. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const dot = base.lastIndexOf('.');
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : '';
  return `${stem || 'file'}${ext ? `.${ext}` : ''}`;
}

export function buildStoragePath(orderId: string, kind: 'reference' | 'deliverable', fileName: string, uniqueId: string): string {
  return `${orderId}/${kind}/${uniqueId}-${sanitizeFileName(fileName)}`;
}
