import type { ErmCardinality, ErmDocument, ErmEdge, ErmNode } from '../model/types.ts';

export interface RelationalColumn {
  name: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
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

function getPrimaryKeyColumns(table: RelationalTable): RelationalColumn[] {
  const pks = table.columns.filter((c) => c.isPrimaryKey);
  if (pks.length > 0) {
    return pks;
  }
  return [
    {
      name: `${table.name}_id`,
      isPrimaryKey: true,
      isForeignKey: false,
      isNullable: false,
    },
  ];
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
  const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));

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

  // Resolve identifying relationships for weak entities (supports chained weak entities)
  for (const weak of weakEntities) {
    const weakTable = tableByEntityId.get(weak.id);
    if (!weakTable) continue;

    for (const rel of relationships) {
      if (!rel.isIdentifying) continue;

      const relEdges = doc.edges.filter(
        (e) => e.sourceId === rel.id || e.targetId === rel.id,
      );
      const connectedEntities = relEdges
        .map((e) => {
          const otherId = e.sourceId === rel.id ? e.targetId : e.sourceId;
          return nodeById.get(otherId);
        })
        .filter((n): n is ErmNode => n?.type === 'entity');

      if (!connectedEntities.some((e) => e.id === weak.id)) {
        continue;
      }

      const owners = connectedEntities.filter((e) => e.id !== weak.id);
      if (owners.length === 0) continue;

      handledRelationshipIds.add(rel.id);

      for (const owner of owners) {
        const ownerTable = tableByEntityId.get(owner.id);
        if (!ownerTable) continue;

        const ownerPks = getPrimaryKeyColumns(ownerTable);
        const migratedCols: RelationalColumn[] = ownerPks.map((pk) => ({
          name: makeUniqueColumnName(weakTable.columns, pk.name, ownerTable.name),
          isPrimaryKey: true,
          isForeignKey: true,
          referencesTable: ownerTable.name,
          referencesColumn: pk.name,
          isNullable: false,
        }));
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
        for (const pk of pks) {
          const prefix = edge.role?.trim() || `${targetTable.name}_${idx + 1}`;
          junctionCols.push({
            name: makeUniqueColumnName(junctionCols, pk.name, prefix),
            isPrimaryKey: true,
            isForeignKey: true,
            referencesTable: targetTable.name,
            referencesColumn: pk.name,
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
        for (const pk of pks) {
          const prefix = edge.role?.trim() || `${targetTable.name}_${idx + 1}`;
          junctionCols.push({
            name: makeUniqueColumnName(junctionCols, pk.name, prefix),
            isPrimaryKey: true,
            isForeignKey: true,
            referencesTable: targetTable.name,
            referencesColumn: pk.name,
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
      for (const pk of refPks) {
        const prefix = fkSide.edge.role?.trim() || refTable.name;
        fkTable.columns.push({
          name: makeUniqueColumnName(fkTable.columns, pk.name, prefix),
          isPrimaryKey: false,
          isForeignKey: true,
          referencesTable: refTable.name,
          referencesColumn: pk.name,
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
      for (const pk of refPks) {
        const prefix = fkSide.edge.role?.trim() || refTable.name;
        fkTable.columns.push({
          name: makeUniqueColumnName(fkTable.columns, pk.name, prefix),
          isPrimaryKey: false,
          isForeignKey: true,
          referencesTable: refTable.name,
          referencesColumn: pk.name,
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
    const cols: RelationalColumn[] = entityPks.map((pk) => ({
      name: pk.name,
      isPrimaryKey: true,
      isForeignKey: true,
      referencesTable: entityTable.name,
      referencesColumn: pk.name,
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
