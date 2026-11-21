import type { RelationalColumn, RelationalTable } from './relationalModel.ts';

function formatIdentifier(name: string): string {
  const trimmed = name.trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  return `"${trimmed.replace(/"/g, '""')}"`;
}

function inferSqlType(column: RelationalColumn): string {
  const lower = column.name.toLowerCase();
  if (
    lower === 'id' ||
    lower.endsWith('id') ||
    lower.endsWith('nr') ||
    lower.endsWith('no') ||
    lower.includes('alter') ||
    lower.includes('age') ||
    lower.includes('anzahl') ||
    lower.includes('count')
  ) {
    return 'INT';
  }
  return 'VARCHAR(255)';
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

  for (const table of tables) {
    const lines: string[] = [];

    for (const col of table.columns) {
      const colName = formatIdentifier(col.name);
      const colType = inferSqlType(col);
      const notNull = col.isPrimaryKey || col.isNullable === false ? ' NOT NULL' : '';
      lines.push(`  ${colName} ${colType}${notNull}`);
    }

    const pkColumns = table.columns.filter((c) => c.isPrimaryKey);
    if (pkColumns.length > 0) {
      const pkList = pkColumns.map((c) => formatIdentifier(c.name)).join(', ');
      lines.push(`  PRIMARY KEY (${pkList})`);
    }

    const fkColumns = table.columns.filter(
      (c) => c.isForeignKey && c.referencesTable && c.referencesColumn,
    );
    for (const fk of fkColumns) {
      const colName = formatIdentifier(fk.name);
      const refTable = formatIdentifier(fk.referencesTable!);
      const refCol = formatIdentifier(fk.referencesColumn!);
      lines.push(`  FOREIGN KEY (${colName}) REFERENCES ${refTable}(${refCol})`);
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
