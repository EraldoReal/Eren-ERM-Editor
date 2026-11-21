import { describe, expect, it } from 'vitest';
import { createDefaultEdge, createDefaultNode, createEmptyDocument } from '../model/defaults.ts';
import { DEMO_ERM_DE, DEMO_ERM_EN } from '../model/demoErm.ts';
import type { ErmDocument, ErmNode } from '../model/types.ts';
import { autoLayoutAttributesForNode } from './autoLayout.ts';
import {
  computeModelBounds,
  getNodeAnchorPoint,
  getNodeCenter,
  isValidErmConnection,
} from './geometry.ts';
import { deriveRelationalModel } from './relationalModel.ts';
import { generateSqlFromRelationalModel } from './sqlGenerator.ts';
import { renderErmToSvgString } from './svgExport.ts';

function boxesOverlap(a: ErmNode, b: ErmNode): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

describe('geometry', () => {
  it('validates Chen ERM connections', () => {
    const entityA = createDefaultNode('entity', 0, 0, 'A');
    const entityB = createDefaultNode('entity', 200, 0, 'B');
    const relA = createDefaultNode('relationship', 100, 0, 'R1');
    const relB = createDefaultNode('relationship', 100, 100, 'R2');
    const attrA = createDefaultNode('attribute', 0, 100, 'Attr1');
    const attrB = createDefaultNode('attribute', 0, 200, 'Attr2');

    expect(isValidErmConnection(entityA, relA)).toBe(true);
    expect(isValidErmConnection(relA, entityA)).toBe(true);
    expect(isValidErmConnection(entityA, attrA)).toBe(true);
    expect(isValidErmConnection(attrA, entityA)).toBe(true);
    expect(isValidErmConnection(relA, attrA)).toBe(true);
    expect(isValidErmConnection(attrA, relA)).toBe(true);

    expect(isValidErmConnection(entityA, entityB)).toBe(false);
    expect(isValidErmConnection(relA, relB)).toBe(false);
    expect(isValidErmConnection(attrA, attrB)).toBe(false);
    expect(isValidErmConnection(entityA, entityA)).toBe(false);
  });

  it('computes exact border anchor points for entity, relationship, and attribute', () => {
    const entity: ErmNode = {
      id: 'e1',
      type: 'entity',
      label: 'Entity',
      x: 100,
      y: 100,
      width: 140,
      height: 60,
    };
    const eCenter = getNodeCenter(entity); // (170, 130)
    expect(getNodeAnchorPoint(entity, eCenter.x + 200, eCenter.y)).toEqual({ x: 240, y: 130 });
    expect(getNodeAnchorPoint(entity, eCenter.x, eCenter.y - 200)).toEqual({ x: 170, y: 100 });
    const eDiag = getNodeAnchorPoint(entity, eCenter.x + 140, eCenter.y + 60);
    expect(eDiag.x).toBeCloseTo(240, 5);
    expect(eDiag.y).toBeCloseTo(160, 5);

    const rel: ErmNode = {
      id: 'r1',
      type: 'relationship',
      label: 'Rel',
      x: 100,
      y: 100,
      width: 120,
      height: 80,
    };
    const rCenter = getNodeCenter(rel); // (160, 140), rx=60, ry=40
    expect(getNodeAnchorPoint(rel, rCenter.x + 100, rCenter.y)).toEqual({ x: 220, y: 140 });
    expect(getNodeAnchorPoint(rel, rCenter.x, rCenter.y + 100)).toEqual({ x: 160, y: 180 });
    const rDiag = getNodeAnchorPoint(rel, rCenter.x + 60, rCenter.y + 40);
    // |dx|/rx + |dy|/ry = 1
    expect(Math.abs(rDiag.x - rCenter.x) / 60 + Math.abs(rDiag.y - rCenter.y) / 40).toBeCloseTo(
      1,
      5,
    );

    const attr: ErmNode = {
      id: 'a1',
      type: 'attribute',
      label: 'Attr',
      x: 100,
      y: 100,
      width: 100,
      height: 50,
    };
    const aCenter = getNodeCenter(attr); // (150, 125), rx=50, ry=25
    expect(getNodeAnchorPoint(attr, aCenter.x - 200, aCenter.y)).toEqual({ x: 100, y: 125 });
    expect(getNodeAnchorPoint(attr, aCenter.x, aCenter.y - 200)).toEqual({ x: 150, y: 100 });
    const aDiag = getNodeAnchorPoint(attr, aCenter.x + 100, aCenter.y + 50);
    // ((x-cx)/rx)^2 + ((y-cy)/ry)^2 = 1
    expect(
      ((aDiag.x - aCenter.x) / 50) ** 2 + ((aDiag.y - aCenter.y) / 25) ** 2,
    ).toBeCloseTo(1, 5);
  });

  it('computes model bounds with and without padding', () => {
    expect(computeModelBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });

    const n1 = createDefaultNode('entity', 50, 100, 'A'); // 50..190, 100..164
    const n2 = createDefaultNode('attribute', 250, 200, 'B'); // 250..380, 200..252
    expect(computeModelBounds([n1, n2])).toEqual({
      x: 50,
      y: 100,
      width: 330,
      height: 152,
    });
    expect(computeModelBounds([n1, n2], 20)).toEqual({
      x: 30,
      y: 80,
      width: 370,
      height: 192,
    });
  });
});

describe('autoLayout', () => {
  it('arranges connected attributes around center node without overlaps', () => {
    const doc = createEmptyDocument('LayoutTest');
    const center = createDefaultNode('entity', 400, 300, 'Person');
    const attrs = Array.from({ length: 6 }, (_, i) =>
      createDefaultNode('attribute', 400, 300, `Attr${i + 1}`),
    );
    const unrelated = createDefaultNode('entity', 900, 900, 'Other');

    doc.nodes.push(center, ...attrs, unrelated);
    for (const attr of attrs) {
      doc.edges.push(createDefaultEdge(center.id, attr.id));
    }

    const updated = autoLayoutAttributesForNode(doc, center.id);
    const updatedCenter = updated.nodes.find((n) => n.id === center.id)!;
    const updatedAttrs = updated.nodes.filter((n) => attrs.some((a) => a.id === n.id));
    const updatedUnrelated = updated.nodes.find((n) => n.id === unrelated.id)!;

    expect(updatedUnrelated).toEqual(unrelated);

    for (let i = 0; i < updatedAttrs.length; i += 1) {
      expect(boxesOverlap(updatedAttrs[i], updatedCenter)).toBe(false);
      for (let j = i + 1; j < updatedAttrs.length; j += 1) {
        expect(boxesOverlap(updatedAttrs[i], updatedAttrs[j])).toBe(false);
      }
    }
  });
});

describe('relationalModel', () => {
  it('handles 1:1 relationships', () => {
    const doc = createEmptyDocument('1to1');
    const emp: ErmNode = { ...createDefaultNode('entity', 0, 0, 'Employee'), id: 'e1' };
    const empId: ErmNode = {
      ...createDefaultNode('attribute', 0, 0, 'EmpID'),
      id: 'a1',
      isPrimaryKey: true,
    };
    const desk: ErmNode = { ...createDefaultNode('entity', 200, 0, 'Desk'), id: 'e2' };
    const deskId: ErmNode = {
      ...createDefaultNode('attribute', 200, 0, 'DeskID'),
      id: 'a2',
      isPrimaryKey: true,
    };
    const rel: ErmNode = { ...createDefaultNode('relationship', 100, 0, 'assigned'), id: 'r1' };

    doc.nodes.push(emp, empId, desk, deskId, rel);
    doc.edges.push(
      createDefaultEdge(emp.id, empId.id),
      createDefaultEdge(desk.id, deskId.id),
      { ...createDefaultEdge(emp.id, rel.id, '1'), isTotalParticipation: false },
      { ...createDefaultEdge(rel.id, desk.id, '1'), isTotalParticipation: true },
    );

    const tables = deriveRelationalModel(doc);
    const deskTable = tables.find((t) => t.name === 'Desk')!;
    expect(deskTable.columns).toContainEqual(
      expect.objectContaining({
        name: 'EmpID',
        isForeignKey: true,
        referencesTable: 'Employee',
        referencesColumn: 'EmpID',
        isNullable: false,
      }),
    );
  });

  it('handles 1:n, n:m, weak entities, multivalued and derived attributes on DEMO_ERM_EN', () => {
    const tables = deriveRelationalModel(DEMO_ERM_EN);

    // Derived attribute Age omitted by default
    const student = tables.find((t) => t.name === 'Student')!;
    expect(student.sourceKind).toBe('entity');
    expect(student.columns.map((c) => c.name)).toEqual(['StudentID', 'Name']);

    // 1:n Teacher -> Course (Course gets TeacherID FK)
    const course = tables.find((t) => t.name === 'Course')!;
    expect(course.columns).toContainEqual(
      expect.objectContaining({
        name: 'TeacherID',
        isPrimaryKey: false,
        isForeignKey: true,
        referencesTable: 'Teacher',
        referencesColumn: 'TeacherID',
      }),
    );

    // n:m Student <-> Course (junction table enrolls in with Grade)
    const enrolls = tables.find((t) => t.name === 'enrolls in')!;
    expect(enrolls.sourceKind).toBe('relationship_nm');
    expect(enrolls.columns.filter((c) => c.isPrimaryKey).map((c) => c.name)).toEqual([
      'StudentID',
      'CourseID',
    ]);
    expect(enrolls.columns.map((c) => c.name)).toContain('Grade');

    // Weak entity Module + identifying relationship contains
    const mod = tables.find((t) => t.name === 'Module')!;
    expect(mod.sourceKind).toBe('weak_entity');
    expect(mod.columns.filter((c) => c.isPrimaryKey).map((c) => c.name)).toEqual([
      'CourseID',
      'ModuleNo',
    ]);
    expect(mod.columns).toContainEqual(
      expect.objectContaining({
        name: 'CourseID',
        isPrimaryKey: true,
        isForeignKey: true,
        referencesTable: 'Course',
        referencesColumn: 'CourseID',
      }),
    );

    // Multivalued attribute Phone -> Student_Phone
    const phone = tables.find((t) => t.name === 'Student_Phone')!;
    expect(phone.sourceKind).toBe('multivalued_attribute');
    expect(phone.columns.map((c) => c.name)).toEqual(['StudentID', 'Phone']);
    expect(phone.columns.every((c) => c.isPrimaryKey)).toBe(true);
  });

  it('includes derived attributes when includeDerived is true', () => {
    const tables = deriveRelationalModel(DEMO_ERM_DE, { includeDerived: true });
    const schueler = tables.find((t) => t.name === 'Schüler')!;
    expect(schueler.columns.map((c) => c.name)).toContain('Alter');
  });
});

function buildDoc(nodes: ErmNode[], edges: ReturnType<typeof createDefaultEdge>[]): ErmDocument {
  return { ...createEmptyDocument(), nodes, edges };
}

describe('relationalModel regressions', () => {
  it('adds the synthetic PK column to the table that FKs reference', () => {
    const kunde = createDefaultNode('entity', 0, 0, 'Kunde');
    const bestellung = createDefaultNode('entity', 400, 0, 'Bestellung');
    const rel = createDefaultNode('relationship', 200, 0, 'bestellt');
    const doc = buildDoc(
      [kunde, bestellung, rel],
      [createDefaultEdge(kunde.id, rel.id, '1'), createDefaultEdge(rel.id, bestellung.id, 'n')],
    );
    const tables = deriveRelationalModel(doc);
    const kundeTable = tables.find((t) => t.name === 'Kunde')!;
    expect(kundeTable.columns.map((c) => c.name)).toContain('Kunde_id');
    const fk = tables.find((t) => t.name === 'Bestellung')!.columns.find((c) => c.isForeignKey)!;
    expect(fk.referencesColumn).toBe('Kunde_id');
    const sql = generateSqlFromRelationalModel(tables);
    expect(sql).toContain('PRIMARY KEY (Kunde_id)');
  });

  it('resolves chained weak entities owners-first regardless of node order', () => {
    const a = createDefaultNode('entity', 0, 0, 'A');
    const b = { ...createDefaultNode('entity', 200, 0, 'B'), isWeak: true };
    const c = { ...createDefaultNode('entity', 400, 0, 'C'), isWeak: true };
    const aId = { ...createDefaultNode('attribute', 0, 100, 'AID'), isPrimaryKey: true };
    const bNo = { ...createDefaultNode('attribute', 200, 100, 'BNo'), isPrimaryKey: true };
    const cNo = { ...createDefaultNode('attribute', 400, 100, 'CNo'), isPrimaryKey: true };
    const r1 = { ...createDefaultNode('relationship', 100, 0, 'r1'), isIdentifying: true };
    const r2 = { ...createDefaultNode('relationship', 300, 0, 'r2'), isIdentifying: true };
    // C is deliberately placed before B in the node list
    const doc = buildDoc(
      [a, c, b, aId, bNo, cNo, r1, r2],
      [
        createDefaultEdge(a.id, aId.id),
        createDefaultEdge(b.id, bNo.id),
        createDefaultEdge(c.id, cNo.id),
        createDefaultEdge(a.id, r1.id, '1'),
        createDefaultEdge(r1.id, b.id, 'n'),
        createDefaultEdge(b.id, r2.id, '1'),
        createDefaultEdge(r2.id, c.id, 'n'),
      ],
    );
    const tables = deriveRelationalModel(doc);
    const cTable = tables.find((t) => t.name === 'C')!;
    const pkNames = cTable.columns.filter((col) => col.isPrimaryKey).map((col) => col.name);
    expect(pkNames).toHaveLength(3);
    expect(pkNames).toContain('CNo');
    // Composite FK to B must be emitted as ONE constraint covering both columns
    const sql = generateSqlFromRelationalModel(tables);
    expect(sql).toMatch(/FOREIGN KEY \([^)]*,[^)]*\) REFERENCES B\([^)]*,[^)]*\)/);
  });

  it('gives FK columns the type of the referenced column and avoids false INT matches', () => {
    const sql = generateSqlFromRelationalModel([
      {
        name: 'Artikel',
        sourceKind: 'entity',
        sourceNodeId: 'x',
        columns: [
          { name: 'Artikelnummer', isPrimaryKey: true, isForeignKey: false },
          { name: 'Image', isPrimaryKey: false, isForeignKey: false },
          { name: 'Preis', isPrimaryKey: false, isForeignKey: false },
        ],
      },
      {
        name: 'Lager',
        sourceKind: 'entity',
        sourceNodeId: 'y',
        columns: [
          {
            name: 'Ref',
            isPrimaryKey: false,
            isForeignKey: true,
            referencesTable: 'Artikel',
            referencesColumn: 'Artikelnummer',
          },
        ],
      },
    ]);
    expect(sql).toContain('Image VARCHAR(255)');
    expect(sql).toContain('Preis DECIMAL(10,2)');
    const artikelType = /Artikelnummer (\S+)/.exec(sql)![1];
    expect(sql).toContain(`Ref ${artikelType}`);
  });
});

describe('sqlGenerator', () => {
  it('generates clean CREATE TABLE statements with PK and FK constraints', () => {
    expect(generateSqlFromRelationalModel([])).toBe('');

    const tables = deriveRelationalModel(DEMO_ERM_EN);
    const sql = generateSqlFromRelationalModel(tables);

    expect(sql).toContain('CREATE TABLE Student (');
    expect(sql).toContain('PRIMARY KEY (StudentID)');
    expect(sql).toContain('CREATE TABLE Module (');
    expect(sql).toContain('PRIMARY KEY (CourseID, ModuleNo)');
    expect(sql).toContain('FOREIGN KEY (CourseID) REFERENCES Course(CourseID)');
    expect(sql).toContain('CREATE TABLE "enrolls in" (');
    expect(sql).toContain('PRIMARY KEY (StudentID, CourseID)');
    expect(sql).toContain('CREATE TABLE Student_Phone (');
  });
});

describe('svgExport', () => {
  it('renders Chen ERM geometry including weak, identifying, multivalued, derived, PK/FK, and total participation', () => {
    const doc: ErmDocument = {
      ...DEMO_ERM_EN,
      nodes: [
        ...DEMO_ERM_EN.nodes,
        {
          id: 'attr_fk_demo',
          type: 'attribute',
          label: 'RefCode',
          x: 780,
          y: 120,
          width: 110,
          height: 52,
          isForeignKey: true,
        },
      ],
      edges: [
        ...DEMO_ERM_EN.edges.map((e) =>
          e.id === 'edge_teacher_teaches' ? { ...e, role: 'instructor' } : e,
        ),
        { id: 'edge_fk_demo', sourceId: 'ent_course', targetId: 'attr_fk_demo', cardinality: '' },
      ],
    };

    const svg = renderErmToSvgString(doc);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    // Weak entity has 2 rects
    expect(svg).toContain('data-node-id="ent_module"');
    // Identifying relationship has 2 polygons
    expect(svg).toContain('data-node-id="rel_contains"');
    // Multivalued attribute has 2 ellipses
    expect(svg).toContain('data-node-id="attr_student_phone"');
    // Derived attribute has dashed ellipse
    expect(svg).toContain('stroke-dasharray="6 4"');
    // PK underline
    expect(svg).toContain('text-decoration="underline"');
    // FK dashed underline
    expect(svg).toContain('stroke-dasharray="4 3"');
    // Cardinality and role labels
    expect(svg).toContain('>instructor</text>');
    expect(svg).toContain('>n</text>');

    const darkSvg = renderErmToSvgString(doc, { darkMode: true });
    expect(darkSvg).toContain('#0f172a');
  });
});
