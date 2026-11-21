import { describe, expect, it } from 'vitest';
import { getDemoErmDocument } from '../model/demoErm.ts';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  decryptErmPayload,
  encryptErmDocument,
  parseShareToken,
  ShareError,
} from './shareClient.ts';

describe('shareClient', () => {
  it('round-trips Base64URL encoding and decoding', () => {
    const sample = new Uint8Array([0, 1, 2, 250, 251, 252, 255]);
    const encoded = bytesToBase64Url(sample);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(base64UrlToBytes(encoded)).toEqual(sample);
  });

  it('parses full share URLs and bare ID.KEY codes', () => {
    expect(parseShareToken('https://erm.best-tools.app/#s=A7K9M2.abcdefghijklmnop123456')).toEqual({
      id: 'A7K9M2',
      keyBase64Url: 'abcdefghijklmnop123456',
    });
    expect(parseShareToken('A7K9M2.abcdefghijklmnop123456')).toEqual({
      id: 'A7K9M2',
      keyBase64Url: 'abcdefghijklmnop123456',
    });
    expect(parseShareToken('#s=X1Y2Z3.1234567890abcdef123456')).toEqual({
      id: 'X1Y2Z3',
      keyBase64Url: '1234567890abcdef123456',
    });
    expect(parseShareToken('invalid-without-dot')).toBeNull();
    expect(parseShareToken('')).toBeNull();
  });

  it('encrypts and decrypts an ErmDocument with WebCrypto AES-GCM', async () => {
    const doc = getDemoErmDocument('de');
    const { iv, data, keyBase64Url } = await encryptErmDocument(doc);

    expect(iv.length).toBeGreaterThan(10);
    expect(data.length).toBeGreaterThan(20);
    expect(keyBase64Url.length).toBeGreaterThan(20);

    const restored = await decryptErmPayload(iv, data, keyBase64Url);
    expect(restored.name).toBe(doc.name);
    expect(restored.nodes.length).toBe(doc.nodes.length);
    expect(restored.edges.length).toBe(doc.edges.length);
  });

  it('rejects decryption with a wrong key', async () => {
    const doc = getDemoErmDocument('en');
    const { iv, data } = await encryptErmDocument(doc);
    const wrongKey = bytesToBase64Url(new Uint8Array(32).fill(7));

    await expect(decryptErmPayload(iv, data, wrongKey)).rejects.toBeInstanceOf(ShareError);
  });
});
