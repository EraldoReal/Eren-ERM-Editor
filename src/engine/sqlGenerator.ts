import type { RelationalColumn, RelationalTable } from './relationalModel.ts';

function formatIdentifier(name: string): string {
  const trimmed = name.trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  return `"${trimmed.replace(/"/g, '""')}"`;
}

function splitIdentifierTokens(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/)
    .filter(Boolean);
}

const INT_TOKENS = new Set([
  'id', 'nr', 'no', 'num', 'anzahl', 'count', 'alter', 'age', 'menge', 'qty', 'quantity',
]);
const DECIMAL_TOKENS = new Set(['preis', 'price', 'betrag', 'gehalt', 'salary', 'kosten', 'cost']);

function inferBaseSqlType(column: RelationalColumn): string {
  const tokens = splitIdentifierTokens(column.name);
  const last = tokens[tokens.length - 1] ?? '';
  const lower = column.name.toLowerCase();
  if (
    tokens.some((t) => INT_TOKENS.has(t)) ||
    // glued German form such as "Kundennr"
    (last.length > 3 && last.endsWith('nr'))
  ) {
    return 'INT';
  }
  if (tokens.some((t) => DECIMAL_TOKENS.has(t)) || lower === 'preis') {
    return 'DECIMAL(10,2)';
  }
  return 'VARCHAR(255)';
}

/**
 * Foreign-key columns inherit the SQL type of the referenced column, so that the
 * constraint is always type-compatible. Other columns use a naming heuristic.
 */
function resolveSqlType(
  column: RelationalColumn,
  tableByName: ReadonlyMap<string, RelationalTable>,
  depth = 0,
): string {
  if (column.isForeignKey && column.referencesTable && column.referencesColumn && depth < 8) {
    const refCol = tableByName
      .get(column.referencesTable)
      ?.columns.find((c) => c.name === column.referencesColumn);
    if (refCol && refCol !== column) {
      return resolveSqlType(refCol, tableByName, depth + 1);
    }
  }
  return inferBaseSqlType(column);
}

/**
 * Generates clean ANSI SQL CREATE TABLE statements from a derived relational model,
 * including PRIMARY KEY and FOREIGN KEY ... REFERENCES constraints.
 */
export function generateSqlFromRelationalModel(tables: readonly RelationalTable[]): string {
  if (tables.length === 0) {
    return '';
  }

  const statements: string[] = [];
  const tableByName = new Map(tables.map((t) => [t.name, t]));

  for (const table of tables) {
    const lines: string[] = [];

    for (const col of table.columns) {
      const colName = formatIdentifier(col.name);
      const colType = resolveSqlType(col, tableByName);
      const notNull = col.isPrimaryKey || col.isNullable === false ? ' NOT NULL' : '';
      lines.push(`  ${colName} ${colType}${notNull}`);
    }

    const pkColumns = table.columns.filter((c) => c.isPrimaryKey);
    if (pkColumns.length > 0) {
      const pkList = pkColumns.map((c) => formatIdentifier(c.name)).join(', ');
      lines.push(`  PRIMARY KEY (${pkList})`);
    }

    const fkGroups = new Map<string, RelationalColumn[]>();
    for (const c of table.columns) {
      if (!c.isForeignKey || !c.referencesTable || !c.referencesColumn) continue;
      const key = c.fkGroup ?? `${c.referencesTable}#${c.name}`;
      const group = fkGroups.get(key);
      if (group) group.push(c);
      else fkGroups.set(key, [c]);
    }
    for (const group of fkGroups.values()) {
      const cols = group.map((c) => formatIdentifier(c.name)).join(', ');
      const refTable = formatIdentifier(group[0].referencesTable!);
      const refCols = group.map((c) => formatIdentifier(c.referencesColumn!)).join(', ');
      lines.push(`  FOREIGN KEY (${cols}) REFERENCES ${refTable}(${refCols})`);
    }

    const tableName = formatIdentifier(table.name);
    if (lines.length === 0) {
      statements.push(`CREATE TABLE ${tableName} ();`);
    } else {
      statements.push(`CREATE TABLE ${tableName} (\n${lines.join(',\n')}\n);`);
    }
  }

  return statements.join('\n\n');
}
