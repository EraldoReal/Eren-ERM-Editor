import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from './defaults.ts';
import { getDemoErmDocument } from './demoErm.ts';
import { ErmFileValidationError, parseErmFile, serializeErmFile } from './ermFile.ts';

describe('ermFile serialization & validation', () => {
  it('creates an empty workspace by default', () => {
    const doc = createEmptyDocument();
    expect(doc.nodes).toEqual([]);
    expect(doc.edges).toEqual([]);
    expect(doc.notationMode).toBe('chen');
  });

  it('round-trips demo DE and EN documents', () => {
    for (const lang of ['de', 'en'] as const) {
      const demo = getDemoErmDocument(lang);
      const serialized = serializeErmFile(demo);
      const parsed = parseErmFile(serialized);
      expect(parsed).toEqual(demo);
    }
  });

  it('rejects invalid JSON or unknown node references', () => {
    expect(() => parseErmFile('not-json')).toThrow(ErmFileValidationError);
    expect(() =>
      parseErmFile(
        JSON.stringify({
          format: 'erm-editor',
          version: 1,
          document: {
            id: 'd1',
            name: 'Bad',
            notationMode: 'chen',
            nodes: [],
            edges: [{ id: 'e1', sourceId: 'missing', targetId: 'also_missing', cardinality: '1' }],
          },
        }),
      ),
    ).toThrow(ErmFileValidationError);
  });
});
