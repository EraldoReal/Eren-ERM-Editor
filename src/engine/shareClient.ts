import { parseErmFile, serializeErmFile } from '../model/ermFile.ts';
import type { ErmDocument } from '../model/types.ts';
import { isTauriEnvironment } from '../platform/adapter.ts';

export const SHARE_API_BASE = 'https://share.best-tools.app/api/share';
export const SHARE_APP_ID = 'erm';
const PUBLIC_WEB_ORIGIN = 'https://erm.best-tools.app';

export type ShareErrorCode =
  | 'invalid_token'
  | 'not_found'
  | 'wrong_app'
  | 'decrypt_failed'
  | 'network';

export class ShareError extends Error {
  readonly code: ShareErrorCode;
  readonly targetApp?: string;

  constructor(code: ShareErrorCode, message: string, targetApp?: string) {
    super(message);
    this.name = 'ShareError';
    this.code = code;
    this.targetApp = targetApp;
  }
}

export interface CreateShareResult {
  id: string;
  url: string;
  expiresAt: string;
}

interface ShareApiPostResponse {
  id: string;
  expiresAt: string;
}

interface ShareApiGetResponse {
  id: string;
  app: string;
  iv: string;
  data: string;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new ShareError('invalid_token', 'Invalid Base64URL encoding.');
  }
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function parseShareToken(input: string): { id: string; keyBase64Url: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let fragment = trimmed;

  // Handle full URLs or hash fragments containing #s=...
  const hashIdx = trimmed.indexOf('#');
  if (hashIdx !== -1) {
    fragment = trimmed.slice(hashIdx + 1);
  }

  if (fragment.startsWith('s=')) {
    fragment = fragment.slice(2);
  } else if (fragment.includes('s=')) {
    const match = fragment.match(/(?:^|[#&?])s=([^&\s]+)/);
    if (match?.[1]) {
      fragment = match[1];
    }
  }

  const dotIdx = fragment.indexOf('.');
  if (dotIdx <= 0 || dotIdx === fragment.length - 1) {
    return null;
  }

  const id = fragment.slice(0, dotIdx).trim();
  const keyBase64Url = fragment.slice(dotIdx + 1).trim();

  if (!/^[A-Za-z0-9_-]{3,32}$/.test(id) || !/^[A-Za-z0-9_-]{16,}$/.test(keyBase64Url)) {
    return null;
  }

  return { id, keyBase64Url };
}

function resolveShareOrigin(): string {
  if (typeof window === 'undefined' || isTauriEnvironment()) {
    return PUBLIC_WEB_ORIGIN;
  }
  const origin = window.location.origin;
  if (!origin || origin.startsWith('tauri:') || origin === 'null') {
    return PUBLIC_WEB_ORIGIN;
  }
  return origin;
}

export async function encryptErmDocument(doc: ErmDocument): Promise<{
  iv: string;
  data: string;
  keyBase64Url: string;
}> {
  const json = serializeErmFile(doc);
  const plaintext = new TextEncoder().encode(json);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    plaintext,
  );
  const rawKeyBuffer = await crypto.subtle.exportKey('raw', key);

  return {
    iv: bytesToBase64Url(ivBytes),
    data: bytesToBase64Url(new Uint8Array(cipherBuffer)),
    keyBase64Url: bytesToBase64Url(new Uint8Array(rawKeyBuffer)),
  };
}

export async function decryptErmPayload(
  ivBase64Url: string,
  dataBase64Url: string,
  keyBase64Url: string,
): Promise<ErmDocument> {
  try {
    const ivBytes = base64UrlToBytes(ivBase64Url);
    const cipherBytes = base64UrlToBytes(dataBase64Url);
    const rawKeyBytes = base64UrlToBytes(keyBase64Url);

    const key = await crypto.subtle.importKey(
      'raw',
      rawKeyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
      key,
      cipherBytes.buffer as ArrayBuffer,
    );

    const jsonText = new TextDecoder().decode(plainBuffer);
    return parseErmFile(jsonText);
  } catch (err) {
    if (err instanceof ShareError) throw err;
    throw new ShareError(
      'decrypt_failed',
      err instanceof Error ? err.message : 'Decryption failed.',
    );
  }
}

export async function createShareLink(doc: ErmDocument): Promise<CreateShareResult> {
  const { iv, data, keyBase64Url } = await encryptErmDocument(doc);

  let response: Response;
  try {
    response = await fetch(SHARE_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: SHARE_APP_ID,
        iv,
        data,
      }),
    });
  } catch (err) {
    throw new ShareError(
      'network',
      err instanceof Error ? err.message : 'Network error while creating share link.',
    );
  }

  if (!response.ok) {
    throw new ShareError('network', `Share server returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as ShareApiPostResponse;
  if (!payload?.id) {
    throw new ShareError('network', 'Invalid response from share server.');
  }

  const origin = resolveShareOrigin();
  return {
    id: payload.id,
    url: `${origin}/#s=${payload.id}.${keyBase64Url}`,
    expiresAt: payload.expiresAt,
  };
}

export async function fetchAndDecryptShare(tokenOrUrl: string): Promise<ErmDocument> {
  const parsed = parseShareToken(tokenOrUrl);
  if (!parsed) {
    throw new ShareError('invalid_token', 'Invalid share link or code.');
  }

  let response: Response;
  try {
    response = await fetch(`${SHARE_API_BASE}/${encodeURIComponent(parsed.id)}`);
  } catch (err) {
    throw new ShareError(
      'network',
      err instanceof Error ? err.message : 'Network error while loading share link.',
    );
  }

  if (response.status === 404) {
    throw new ShareError('not_found', 'Share link not found or expired.');
  }
  if (!response.ok) {
    throw new ShareError('network', `Share server returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as ShareApiGetResponse;
  if (payload.app !== SHARE_APP_ID) {
    throw new ShareError(
      'wrong_app',
      `This share link belongs to app "${payload.app}", not "${SHARE_APP_ID}".`,
      payload.app,
    );
  }

  return decryptErmPayload(payload.iv, payload.data, parsed.keyBase64Url);
}
