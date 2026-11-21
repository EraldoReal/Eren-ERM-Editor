export type ErmNodeType = 'entity' | 'relationship' | 'attribute';

export type NotationMode = 'chen' | 'minmax';

export type GridStyle = 'dots' | 'grid';

export type ErmCardinality =
  | '1'
  | 'n'
  | 'm'
  | 'c'
  | 'cn'
  | '(0,1)'
  | '(1,1)'
  | '(0,n)'
  | '(1,n)'
  | '(0,*)'
  | '';

export interface ErmNodeStyle {
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface ErmNode {
  id: string;
  type: ErmNodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Entity: weak entity (double rectangle) */
  isWeak?: boolean;
  /** Relationship: identifying relationship for a weak entity (double diamond) */
  isIdentifying?: boolean;
  /** Attribute: primary key (underlined label) */
  isPrimaryKey?: boolean;
  /** Attribute: foreign key (dashed underline) */
  isForeignKey?: boolean;
  /** Attribute: multivalued attribute (double oval) */
  isMultivalued?: boolean;
  /** Attribute: derived attribute (dashed oval) */
  isDerived?: boolean;
  /** Optional custom visual styling */
  style?: ErmNodeStyle;
}

export interface ErmEdge {
  id: string;
  sourceId: string;
  targetId: string;
  cardinality: ErmCardinality;
  role?: string;
  isTotalParticipation?: boolean;
}

export interface ErmDocument {
  id: string;
  name: string;
  notationMode: NotationMode;
  nodes: ErmNode[];
  edges: ErmEdge[];
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  gridStyle: GridStyle;
  snapToGrid: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type LanguageCode = 'de' | 'en';

export interface RecentFileEntry {
  name: string;
  path?: string;
  lastOpenedAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  language: LanguageCode;
  defaultNotationMode: NotationMode;
  defaultShowGrid: boolean;
  defaultGridStyle: GridStyle;
  defaultSnapToGrid: boolean;
  uiScale?: number;
  recentFiles: RecentFileEntry[];
}
