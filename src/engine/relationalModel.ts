import type { ErmCardinality, ErmDocument, ErmEdge, ErmNode } from '../model/types.ts';

export interface RelationalColumn {
  name: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
  /** Columns sharing the same group form one (composite) foreign key constraint. */
  fkGroup?: string;
  isNullable?: boolean;
}

export interface RelationalTable {
  name: string;
  columns: RelationalColumn[];
  sourceKind: 'entity' | 'weak_entity' | 'relationship_nm' | 'multivalued_attribute';
  sourceNodeId: string;
}

function isManyCardinality(cardinality: ErmCardinality): boolean {
  return (
    cardinality === 'n' ||
    cardinality === 'm' ||
    cardinality === 'cn' ||
    cardinality === '(0,n)' ||
    cardinality === '(1,n)' ||
    cardinality === '(0,*)'
  );
}

function makeUniqueColumnName(
  existingColumns: readonly RelationalColumn[],
  desiredName: string,
  fallbackPrefix?: string,
): string {
  const existingNames = new Set(existingColumns.map((c) => c.name));
  if (!existingNames.has(desiredName)) {
    return desiredName;
  }
  const prefixed = fallbackPrefix ? `${fallbackPrefix}_${desiredName}` : desiredName;
  if (!existingNames.has(prefixed)) {
    return prefixed;
  }
  let idx = 2;
  while (existingNames.has(`${prefixed}_${idx}`)) {
    idx += 1;
  }
  return `${prefixed}_${idx}`;
}

function getDirectAttributes(
  nodeId: string,
  nodeById: ReadonlyMap<string, ErmNode>,
  edges: readonly ErmEdge[],
  includeDerived: boolean,
): ErmNode[] {
  const attrs: ErmNode[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    let otherId: string | null = null;
    if (edge.sourceId === nodeId) otherId = edge.targetId;
    else if (edge.targetId === nodeId) otherId = edge.sourceId;

    if (!otherId || seen.has(otherId)) continue;
    const other = nodeById.get(otherId);
    if (other?.type !== 'attribute') continue;
    if (other.isDerived && !includeDerived) continue;

    seen.add(otherId);
    attrs.push(other);
  }

  return attrs;
}

/**
 * Returns the primary-key columns of a table. If the table has none, a synthetic
 * `<table>_id` key column is added to the table itself, so that foreign keys
 * referencing it always point to an existing column.
 */
function getPrimaryKeyColumns(table: RelationalTable): RelationalColumn[] {
  const pks = table.columns.filter((c) => c.isPrimaryKey);
  if (pks.length > 0) {
    return pks;
  }
  const synthetic: RelationalColumn = {
    name: makeUniqueColumnName(table.columns, `${table.name}_id`),
    isPrimaryKey: true,
    isForeignKey: false,
    isNullable: false,
  };
  table.columns.unshift(synthetic);
  return [synthetic];
}

/**
 * Entities that identify (own) `weak` through the identifying relationship `rel`.
 * Strong entities always own. If another weak entity is involved (chained weak
 * entities), the one on the "1" side owns the one on the "n" side; when the
 * cardinalities do not tell, the earlier node owns the later one, which keeps
 * the ownership graph acyclic.
 */
function getIdentifyingOwners(
  weak: ErmNode,
  rel: ErmNode,
  edges: readonly ErmEdge[],
  nodeById: ReadonlyMap<string, ErmNode>,
  nodeOrder: ReadonlyMap<string, number>,
): ErmNode[] {
  const links: Array<{ entity: ErmNode; edge: ErmEdge }> = [];
  for (const edge of edges) {
    if (edge.sourceId !== rel.id && edge.targetId !== rel.id) continue;
    const other = nodeById.get(edge.sourceId === rel.id ? edge.targetId : edge.sourceId);
    if (other?.type === 'entity') links.push({ entity: other, edge });
  }
  const weakLink = links.find((l) => l.entity.id === weak.id);
  if (!weakLink) return [];

  const owners: ErmNode[] = [];
  for (const link of links) {
    if (link.entity.id === weak.id || owners.some((o) => o.id === link.entity.id)) continue;
    if (!link.entity.isWeak) {
      owners.push(link.entity);
      continue;
    }
    const otherMany = isManyCardinality(link.edge.cardinality);
    const weakMany = isManyCardinality(weakLink.edge.cardinality);
    if (otherMany !== weakMany) {
      if (weakMany) owners.push(link.entity);
    } else if ((nodeOrder.get(link.entity.id) ?? 0) < (nodeOrder.get(weak.id) ?? 0)) {
      owners.push(link.entity);
    }
  }
  return owners;
}

/**
 * Orders weak entities so that every weak entity comes after the weak entities
 * that own it through an identifying relationship. Cycles fall back to input order.
 */
function orderWeakEntitiesByOwnership(
  weakEntities: readonly ErmNode[],
  relationships: readonly ErmNode[],
  edges: readonly ErmEdge[],
  nodeById: ReadonlyMap<string, ErmNode>,
  nodeOrder: ReadonlyMap<string, number>,
): ErmNode[] {
  const weakIds = new Set(weakEntities.map((w) => w.id));
  const ownersOf = new Map<string, Set<string>>();
  for (const w of weakEntities) {
    const owners = new Set<string>();
    for (const rel of relationships) {
      if (!rel.isIdentifying) continue;
      for (const o of getIdentifyingOwners(w, rel, edges, nodeById, nodeOrder)) {
        if (weakIds.has(o.id)) owners.add(o.id);
      }
    }
    ownersOf.set(w.id, owners);
  }

  const ordered: ErmNode[] = [];
  const done = new Set<string>();
  let remaining = [...weakEntities];
  while (remaining.length > 0) {
    const ready = remaining.filter((w) =>
      [...(ownersOf.get(w.id) ?? [])].every((o) => done.has(o)),
    );
    // Cycle: no weak entity is ready -> take the first one to guarantee progress
    const batch = ready.length > 0 ? ready : [remaining[0]];
    for (const w of batch) {
      ordered.push(w);
      done.add(w.id);
    }
    remaining = remaining.filter((w) => !done.has(w.id));
  }
  return ordered;
}

let fkGroupCounter = 0;
function nextFkGroup(): string {
  fkGroupCounter += 1;
  return `fk${fkGroupCounter}`;
}

/**
 * Derives a normalized relational schema (tables, primary keys, foreign keys)
 * from an ERM document following Chen / Min-Max transformation rules.
 */
export function deriveRelationalModel(
  doc: ErmDocument,
  options?: { includeDerived?: boolean },
): RelationalTable[] {
  const includeDerived = options?.includeDerived ?? false;
  fkGroupCounter = 0;
  const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));
  const nodeOrder = new Map(doc.nodes.map((n, i) => [n.id, i]));

  const entities = doc.nodes.filter((n) => n.type === 'entity');
  const strongEntities = entities.filter((n) => !n.isWeak);
  const weakEntities = entities.filter((n) => Boolean(n.isWeak));
  const relationships = doc.nodes.filter((n) => n.type === 'relationship');

  const tableByEntityId = new Map<string, RelationalTable>();
  const tables: RelationalTable[] = [];
  const multivaluedEntries: Array<{ entityId: string; attr: ErmNode }> = [];

  // 1. Strong entities -> tables
  for (const entity of strongEntities) {
    const attrs = getDirectAttributes(entity.id, nodeById, doc.edges, includeDerived);
    const columns: RelationalColumn[] = [];

    for (const attr of attrs) {
      if (attr.isMultivalued) {
        multivaluedEntries.push({ entityId: entity.id, attr });
        continue;
      }
      const isPk = Boolean(attr.isPrimaryKey);
      columns.push({
        name: attr.label.trim(),
        isPrimaryKey: isPk,
        isForeignKey: Boolean(attr.isForeignKey),
        isNullable: !isPk,
      });
    }

    const table: RelationalTable = {
      name: entity.label.trim(),
      columns,
      sourceKind: 'entity',
      sourceNodeId: entity.id,
    };
    tableByEntityId.set(entity.id, table);
    tables.push(table);
  }

  // 2. Weak entities + identifying relationships
  const handledRelationshipIds = new Set<string>();

  // Create weak entity tables with their own attributes first
  for (const weak of weakEntities) {
    const attrs = getDirectAttributes(weak.id, nodeById, doc.edges, includeDerived);
    const columns: RelationalColumn[] = [];

    for (const attr of attrs) {
      if (attr.isMultivalued) {
        multivaluedEntries.push({ entityId: weak.id, attr });
        continue;
      }
      const isPartialKey = Boolean(attr.isPrimaryKey);
      columns.push({
        name: attr.label.trim(),
        isPrimaryKey: isPartialKey,
        isForeignKey: Boolean(attr.isForeignKey),
        isNullable: !isPartialKey,
      });
    }

    const table: RelationalTable = {
      name: weak.label.trim(),
      columns,
      sourceKind: 'weak_entity',
      sourceNodeId: weak.id,
    };
    tableByEntityId.set(weak.id, table);
    tables.push(table);
  }

  // Resolve identifying relationships for weak entities (supports chained weak entities).
  // Weak entities are processed owners-first so that a chained weak entity migrates
  // the complete (already extended) key of its weak owner.
  const orderedWeakEntities = orderWeakEntitiesByOwnership(
    weakEntities,
    relationships,
    doc.edges,
    nodeById,
    nodeOrder,
  );
  for (const weak of orderedWeakEntities) {
    const weakTable = tableByEntityId.get(weak.id);
    if (!weakTable) continue;

    for (const rel of relationships) {
      if (!rel.isIdentifying) continue;

      const connectedToWeak = doc.edges.some(
        (e) =>
          (e.sourceId === rel.id && e.targetId === weak.id) ||
          (e.targetId === rel.id && e.sourceId === weak.id),
      );
      if (!connectedToWeak) continue;

      const owners = getIdentifyingOwners(weak, rel, doc.edges, nodeById, nodeOrder);
      if (owners.length === 0) continue;

      handledRelationshipIds.add(rel.id);

      for (const owner of owners) {
        const ownerTable = tableByEntityId.get(owner.id);
        if (!ownerTable) continue;

        const ownerPks = getPrimaryKeyColumns(ownerTable);
        const group = nextFkGroup();
        const migratedCols: RelationalColumn[] = [];
        for (const pk of ownerPks) {
          migratedCols.push({
            name: makeUniqueColumnName(
              [...weakTable.columns, ...migratedCols],
              pk.name,
              ownerTable.name,
            ),
            isPrimaryKey: true,
            isForeignKey: true,
            referencesTable: ownerTable.name,
            referencesColumn: pk.name,
            fkGroup: group,
            isNullable: false,
          });
        }
        // Prepend owner PKs before partial key for clean composite PK ordering
        weakTable.columns.unshift(...migratedCols);
      }

      // Add any direct attributes of the identifying relationship
      const relAttrs = getDirectAttributes(rel.id, nodeById, doc.edges, includeDerived);
      for (const attr of relAttrs) {
        if (attr.isMultivalued) continue;
        weakTable.columns.push({
          name: makeUniqueColumnName(weakTable.columns, attr.label.trim(), rel.label.trim()),
          isPrimaryKey: false,
          isForeignKey: Boolean(attr.isForeignKey),
          isNullable: true,
        });
      }
    }
  }

  // 3. Remaining relationships (1:1, 1:n, n:m, n-ary)
  for (const rel of relationships) {
    if (handledRelationshipIds.has(rel.id)) continue;

    const entityLinks: Array<{ entity: ErmNode; edge: ErmEdge }> = [];
    for (const edge of doc.edges) {
      if (edge.sourceId !== rel.id && edge.targetId !== rel.id) continue;
      const otherId = edge.sourceId === rel.id ? edge.targetId : edge.sourceId;
      const other = nodeById.get(otherId);
      if (other?.type === 'entity') {
        entityLinks.push({ entity: other, edge });
      }
    }

    if (entityLinks.length < 2) continue;

    const relAttrs = getDirectAttributes(rel.id, nodeById, doc.edges, includeDerived);

    if (entityLinks.length > 2) {
      // N-ary relationship -> junction table
      const junctionCols: RelationalColumn[] = [];
      entityLinks.forEach(({ entity, edge }, idx) => {
        const targetTable = tableByEntityId.get(entity.id);
        if (!targetTable) return;
        const pks = getPrimaryKeyColumns(targetTable);
        const group = nextFkGroup();
        for (const pk of pks) {
          const prefix = edge.role?.trim() || `${targetTable.name}_${idx + 1}`;
          junctionCols.push({
            name: makeUniqueColumnName(junctionCols, pk.name, prefix),
            isPrimaryKey: true,
            isForeignKey: true,
            referencesTable: targetTable.name,
            referencesColumn: pk.name,
            fkGroup: group,
            isNullable: false,
          });
        }
      });
      for (const attr of relAttrs) {
        if (attr.isMultivalued) continue;
        junctionCols.push({
          name: makeUniqueColumnName(junctionCols, attr.label.trim()),
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: true,
        });
      }
      tables.push({
        name: rel.label.trim(),
        columns: junctionCols,
        sourceKind: 'relationship_nm',
        sourceNodeId: rel.id,
      });
      continue;
    }

    const [linkA, linkB] = entityLinks;
    const manyA = isManyCardinality(linkA.edge.cardinality);
    const manyB = isManyCardinality(linkB.edge.cardinality);

    if (manyA && manyB) {
      // n:m relationship -> junction table
      const junctionCols: RelationalColumn[] = [];
      const links = [linkA, linkB];
      links.forEach(({ entity, edge }, idx) => {
        const targetTable = tableByEntityId.get(entity.id);
        if (!targetTable) return;
        const pks = getPrimaryKeyColumns(targetTable);
        const group = nextFkGroup();
        for (const pk of pks) {
          const prefix = edge.role?.trim() || `${targetTable.name}_${idx + 1}`;
          junctionCols.push({
            name: makeUniqueColumnName(junctionCols, pk.name, prefix),
            isPrimaryKey: true,
            isForeignKey: true,
            referencesTable: targetTable.name,
            referencesColumn: pk.name,
            fkGroup: group,
            isNullable: false,
          });
        }
      });

      for (const attr of relAttrs) {
        if (attr.isMultivalued) continue;
        junctionCols.push({
          name: makeUniqueColumnName(junctionCols, attr.label.trim()),
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: true,
        });
      }

      tables.push({
        name: rel.label.trim(),
        columns: junctionCols,
        sourceKind: 'relationship_nm',
        sourceNodeId: rel.id,
      });
    } else if (manyA !== manyB) {
      // 1:n relationship -> FK on n-side (or max=1 side in minmax mode)
      const isMinMax = doc.notationMode === 'minmax';
      const fkSide = isMinMax ? (manyA ? linkB : linkA) : manyA ? linkA : linkB;
      const refSide = fkSide === linkA ? linkB : linkA;

      const fkTable = tableByEntityId.get(fkSide.entity.id);
      const refTable = tableByEntityId.get(refSide.entity.id);
      if (!fkTable || !refTable) continue;

      const refPks = getPrimaryKeyColumns(refTable);
      const group = nextFkGroup();
      for (const pk of refPks) {
        const prefix = fkSide.edge.role?.trim() || refTable.name;
        fkTable.columns.push({
          name: makeUniqueColumnName(fkTable.columns, pk.name, prefix),
          isPrimaryKey: false,
          isForeignKey: true,
          referencesTable: refTable.name,
          referencesColumn: pk.name,
          fkGroup: group,
          isNullable: !fkSide.edge.isTotalParticipation,
        });
      }

      for (const attr of relAttrs) {
        if (attr.isMultivalued) continue;
        fkTable.columns.push({
          name: makeUniqueColumnName(fkTable.columns, attr.label.trim(), rel.label.trim()),
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: true,
        });
      }
    } else {
      // 1:1 relationship -> FK on side with total participation / (1,1), else linkB
      const fkOnA =
        Boolean(linkA.edge.isTotalParticipation) && !linkB.edge.isTotalParticipation;
      const fkSide = fkOnA ? linkA : linkB;
      const refSide = fkOnA ? linkB : linkA;

      const fkTable = tableByEntityId.get(fkSide.entity.id);
      const refTable = tableByEntityId.get(refSide.entity.id);
      if (!fkTable || !refTable) continue;

      const refPks = getPrimaryKeyColumns(refTable);
      const group = nextFkGroup();
      for (const pk of refPks) {
        const prefix = fkSide.edge.role?.trim() || refTable.name;
        fkTable.columns.push({
          name: makeUniqueColumnName(fkTable.columns, pk.name, prefix),
          isPrimaryKey: false,
          isForeignKey: true,
          referencesTable: refTable.name,
          referencesColumn: pk.name,
          fkGroup: group,
          isNullable: !fkSide.edge.isTotalParticipation,
        });
      }

      for (const attr of relAttrs) {
        if (attr.isMultivalued) continue;
        fkTable.columns.push({
          name: makeUniqueColumnName(fkTable.columns, attr.label.trim(), rel.label.trim()),
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: true,
        });
      }
    }
  }

  // 4. Multivalued attributes -> own table (Entity_PK, attr)
  for (const { entityId, attr } of multivaluedEntries) {
    const entityTable = tableByEntityId.get(entityId);
    if (!entityTable) continue;

    const entityPks = getPrimaryKeyColumns(entityTable);
    const mvGroup = nextFkGroup();
    const cols: RelationalColumn[] = entityPks.map((pk) => ({
      name: pk.name,
      isPrimaryKey: true,
      isForeignKey: true,
      referencesTable: entityTable.name,
      referencesColumn: pk.name,
      fkGroup: mvGroup,
      isNullable: false,
    }));

    cols.push({
      name: makeUniqueColumnName(cols, attr.label.trim(), 'value'),
      isPrimaryKey: true,
      isForeignKey: false,
      isNullable: false,
    });

    tables.push({
      name: `${entityTable.name}_${attr.label.trim()}`,
      columns: cols,
      sourceKind: 'multivalued_attribute',
      sourceNodeId: attr.id,
    });
  }

  return tables;
}
