import { clear, createStore, del, get, set, type UseStore } from 'idb-keyval';
import { isTextMime, mimeForName } from '@/config/taxonomy/formats';
import type { FileRole } from '@/types';
import { uid } from './ids';

/**
 * Persistence for the mock backend. Uses IndexedDB in the browser and falls back
 * to memory where IndexedDB is unavailable (tests, private windows).
 */
const memory = new Map<string, unknown>();
let idbStore: UseStore | null | undefined;

const store = () => {
  if (idbStore === undefined) {
    try {
      idbStore = typeof indexedDB === 'undefined' ? null : createStore('growthgateway', 'kv');
    } catch {
      idbStore = null;
    }
  }
  return idbStore;
};

export async function getItem<T>(key: string): Promise<T | undefined> {
  const s = store();
  if (!s) return memory.get(key) as T | undefined;
  try {
    return await get<T>(key, s);
  } catch {
    return memory.get(key) as T | undefined;
  }
}

export async function setItem(key: string, value: unknown): Promise<void> {
  const s = store();
  memory.set(key, value);
  if (!s) return;
  try {
    await set(key, value, s);
  } catch {
    /* memory copy is enough for the session */
  }
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key);
  const s = store();
  if (s) await del(key, s).catch(() => undefined);
}

export async function clearStorage(): Promise<void> {
  memory.clear();
  const s = store();
  if (s) await clear(s).catch(() => undefined);
}

export async function putBlob(blob: Blob): Promise<string> {
  const key = uid('blob');
  await setItem(key, blob);
  return key;
}

export const getBlob = (key: string) => getItem<Blob>(key);

/** A file prepared for upload: binaries go to IndexedDB, text stays inline so rules can read it. */
export interface UploadFileInput {
  name: string;
  mime: string;
  sizeBytes: number;
  role: FileRole;
  width?: number;
  height?: number;
  durationSec?: number;
  blobKey?: string;
  text?: string;
}

const MAX_INLINE_TEXT = 1_000_000;

const readImageSize = (file: File) =>
  new Promise<{ width: number; height: number } | undefined>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

const readMediaDuration = (file: File, kind: 'video' | 'audio') =>
  new Promise<{ durationSec?: number; width?: number; height?: number }>((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind);
    const done = (value: { durationSec?: number; width?: number; height?: number }) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = window.setTimeout(() => done({}), 3000);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const video = el as HTMLVideoElement;
      done({
        durationSec: Number.isFinite(el.duration) ? Math.round(el.duration) : undefined,
        width: kind === 'video' ? video.videoWidth || undefined : undefined,
        height: kind === 'video' ? video.videoHeight || undefined : undefined,
      });
    };
    el.onerror = () => {
      window.clearTimeout(timer);
      done({});
    };
    el.src = url;
  });

export async function prepareFile(file: File, role: FileRole = 'primary'): Promise<UploadFileInput> {
  const mime = file.type || mimeForName(file.name);
  const base: UploadFileInput = { name: file.name, mime, sizeBytes: file.size, role };

  if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
    Object.assign(base, await readImageSize(file));
  } else if (mime.startsWith('video/')) {
    Object.assign(base, await readMediaDuration(file, 'video'));
  } else if (mime.startsWith('audio/')) {
    Object.assign(base, await readMediaDuration(file, 'audio'));
  }

  if (isTextMime(mime) && file.size <= MAX_INLINE_TEXT) {
    base.text = await file.text();
    if (mime === 'image/svg+xml') {
      const match = base.text.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
      if (match) {
        base.width = Math.round(Number(match[1]));
        base.height = Math.round(Number(match[2]));
      }
    }
  } else {
    base.blobKey = await putBlob(file);
  }
  return base;
}
