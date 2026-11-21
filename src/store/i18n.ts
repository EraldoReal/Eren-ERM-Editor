import type { LanguageCode } from '../model/types.ts';
import { useEditorStore } from './editorStore.ts';

const de = {
  'app.name': 'ERM-Editor',
  'app.subtitle': 'Entity-Relationship-Modelle in Chen- & Min-Max-Notation',

  // Menus
  'menu.file': 'Datei',
  'menu.file.new': 'Neu',
  'menu.file.open': 'Öffnen…',
  'menu.file.recent': 'Zuletzt geöffnet',
  'menu.file.noRecent': 'Keine zuletzt geöffneten Dateien',
  'menu.file.clearRecent': 'Liste leeren',
  'menu.file.loadDemo': 'Beispiel laden',
  'menu.file.save': 'Speichern',
  'menu.file.saveAs': 'Speichern unter…',
  'menu.file.exportSvg': 'Als SVG exportieren…',
  'menu.file.exportPng1x': 'Als PNG (1x) exportieren…',
  'menu.file.exportPng2x': 'Als PNG (2x) exportieren…',
  'menu.file.exportPng3x': 'Als PNG (3x) exportieren…',
  'menu.file.screenshot': 'Screenshot in Zwischenablage',
  'menu.file.print': 'Drucken / PDF…',

  'menu.edit': 'Bearbeiten',
  'menu.edit.undo': 'Rückgängig',
  'menu.edit.redo': 'Wiederherstellen',
  'menu.edit.cut': 'Ausschneiden',
  'menu.edit.copy': 'Kopieren',
  'menu.edit.paste': 'Einfügen',
  'menu.edit.delete': 'Löschen',
  'menu.edit.selectAll': 'Alles auswählen',

  'menu.view': 'Ansicht',
  'menu.view.zoomIn': 'Vergrößern',
  'menu.view.zoomOut': 'Verkleinern',
  'menu.view.zoomReset': 'Zoom zurücksetzen (100%)',
  'menu.view.grid': 'Raster anzeigen',
  'menu.view.gridDots': 'Raster: Punkte',
  'menu.view.gridLines': 'Raster: Linien',
  'menu.view.snapToGrid': 'Am Raster ausrichten',
  'menu.view.notation': 'Notation',
  'menu.view.notationChen': 'Chen-Notation (1, n, m, c, cn)',
  'menu.view.notationMinMax': 'Min-Max-Notation (0,1), (1,n)',
  'menu.view.relationalSidebar': 'Relationenmodell-Seitenleiste',
  'menu.view.darkMode': 'Dunkelmodus',
  'menu.view.settings': 'Einstellungen…',

  'menu.help': 'Hilfe',
  'menu.help.shortcuts': 'Hilfe & Tastenkürzel',
  'menu.help.about': 'Über ERM-Editor',
  'menu.help.imprint': 'Impressum',
  'menu.help.checkUpdates': 'Nach Updates suchen…',

  // Tools & Toolbar
  'tool.select': 'Auswählen (V)',
  'tool.entity': 'Entität (E)',
  'tool.relationship': 'Beziehung (R)',
  'tool.attribute': 'Attribut (A)',
  'tool.connect': 'Verbinden (C)',

  'action.weakEntity': 'Schwache Entität',
  'action.identifyingRelationship': 'Identifizierende Beziehung',
  'action.primaryKey': 'Primärschlüssel (PK)',
  'action.foreignKey': 'Fremdschlüssel (FK)',
  'action.multivalued': 'Mehrwertiges Attribut',
  'action.derived': 'Abgeleitetes Attribut',
  'action.autoLayoutAttributes': 'Attribute automatisch anordnen',
  'action.totalParticipation': 'Totale Partizipation (Doppellinie)',
  'action.screenshot': '1-Klick-Screenshot',
  'action.toggleSidebar': 'Relationenmodell',
  'action.toggleTheme': 'Design wechseln',
  'action.language': 'Sprache',

  // Node types
  'node.entity': 'Entität',
  'node.relationship': 'Beziehung',
  'node.attribute': 'Attribut',

  // Cardinalities (Chen & Min-Max)
  'cardinality.label': 'Kardinalität',
  'cardinality.none': 'Keine',
  'cardinality.1': '1 (genau eins)',
  'cardinality.n': 'n (beliebig viele)',
  'cardinality.m': 'm (beliebig viele)',
  'cardinality.c': 'c (optional, 0 oder 1)',
  'cardinality.cn': 'cn (optional, 0 oder viele)',
  'cardinality.0_1': '(0,1) optional, höchstens eins',
  'cardinality.1_1': '(1,1) genau eins',
  'cardinality.0_n': '(0,n) beliebig viele',
  'cardinality.1_n': '(1,n) mindestens eins',
  'cardinality.0_star': '(0,*) beliebig viele',
  'edge.role': 'Rolle',
  'edge.rolePlaceholder': 'Optionale Rolle…',
  'edge.totalParticipation': 'Totale Partizipation',

  // Canvas & Context Menu
  'canvas.emptyHint':
    'Wähle ein Werkzeug oben (Entität, Beziehung, Attribut) oder doppelklicke auf die Zeichenfläche.',
  'canvas.addEntity': 'Entität hinzufügen',
  'canvas.addRelationship': 'Beziehung hinzufügen',
  'canvas.addAttribute': 'Attribut hinzufügen',
  'canvas.editLabel': 'Beschriftung bearbeiten',
  'canvas.duplicate': 'Duplizieren',
  'canvas.delete': 'Löschen',
  'canvas.autoLayout': 'Attribute anordnen',
  'canvas.connectHint': 'Ziehe oder klicke ein gültiges Ziel an',
  'canvas.invalidConnection': 'Ungültige Verbindung: Nur Entität↔Beziehung, Entität↔Attribut oder Beziehung↔Attribut.',

  // Tabs & Status bar
  'tabs.newTab': 'Neues ERM',
  'tabs.closeTab': 'Tab schließen',
  'tabs.unsavedChanges': 'Ungespeicherte Änderungen',
  'tabs.untitled': 'Unbenanntes ERM',
  'tabs.confirmClose': 'Ungespeicherte Änderungen verwerfen?',

  'status.zoom': 'Zoom',
  'status.nodes': 'Knoten',
  'status.edges': 'Kanten',
  'status.selected': 'Ausgewählt',
  'status.notation': 'Notation',
  'status.notationChen': 'Chen',
  'status.notationMinMax': 'Min-Max',
  'status.saved': 'Gespeichert',
  'status.unsaved': 'Ungespeichert',

  // Relational Model Sidebar & SQL Preview
  'sidebar.title': 'Relationenmodell & SQL',
  'sidebar.relationalTab': 'Relationenmodell',
  'sidebar.sqlTab': 'SQL CREATE TABLE',
  'sidebar.empty': 'Füge Entitäten und Attribute hinzu, um das Relationenmodell live abzuleiten.',
  'sidebar.copyRelational': 'Relationenmodell kopieren',
  'sidebar.copySql': 'SQL kopieren',
  'sidebar.copied': 'Kopiert!',
  'sidebar.includeDerived': 'Abgeleitete Attribute einbeziehen',
  'sidebar.pk': 'PK',
  'sidebar.fk': 'FK',
  'sidebar.tablesCount': '{count} Relationen',
  'sidebar.kindEntity': 'Entität',
  'sidebar.kindWeakEntity': 'Schwache Entität',
  'sidebar.kindRelationshipNm': 'n:m-Beziehung',
  'sidebar.kindMultivalued': 'Mehrwertiges Attribut',

  // Settings Modal
  'settings.title': 'Einstellungen',
  'settings.theme': 'Erscheinungsbild',
  'settings.themeLight': 'Hell',
  'settings.themeDark': 'Dunkel',
  'settings.themeSystem': 'System',
  'settings.language': 'Sprache',
  'settings.languageDe': 'Deutsch',
  'settings.languageEn': 'Englisch',
  'settings.defaultNotation': 'Standard-Notation',
  'settings.defaultGrid': 'Raster standardmäßig anzeigen',
  'settings.defaultGridStyle': 'Standard-Rasterstil',
  'settings.defaultSnapToGrid': 'Standardmäßig am Raster ausrichten',
  'settings.save': 'Speichern',
  'settings.close': 'Schließen',

  // Print Modal
  'print.title': 'Drucken / Als PDF speichern',
  'print.orientation': 'Ausrichtung',
  'print.portrait': 'Hochformat',
  'print.landscape': 'Querformat',
  'print.includeGrid': 'Raster mitdrucken',
  'print.print': 'Drucken…',
  'print.cancel': 'Abbrechen',

  // Help & Imprint Modal
  'help.title': 'Hilfe, Legende & Impressum',
  'help.tabShortcuts': 'Tastenkürzel',
  'help.tabLegend': 'Chen-Legende',
  'help.tabAbout': 'Über',
  'help.tabImprint': 'Impressum',
  'help.shortcutUndo': 'Rückgängig',
  'help.shortcutRedo': 'Wiederherstellen',
  'help.shortcutSave': 'Speichern',
  'help.shortcutCopy': 'Kopieren',
  'help.shortcutCut': 'Ausschneiden',
  'help.shortcutPaste': 'Einfügen',
  'help.shortcutDelete': 'Auswahl löschen',
  'help.shortcutSelectAll': 'Alles auswählen',
  'help.shortcutEdit': 'Beschriftung bearbeiten',
  'help.shortcutZoom': 'Zoomen (Mausrad)',
  'help.shortcutPan': 'Verschieben (Leertaste + Ziehen)',
  'help.aboutDescription':
    'ERM-Editor ist ein kostenloses Werkzeug zum Erstellen von Entity-Relationship-Diagrammen in Chen- und Min-Max-Notation mit automatischer Ableitung des Relationenmodells und SQL-DDL.',

  'imprint.title': 'Impressum',
  'imprint.operatorLabel': 'Betreiber',
  'imprint.operator': 'Eren Kazokoglu',
  'imprint.addressLabel': 'Anschrift',
  'imprint.address': 'Wiesach 13, 73230 Kirchheim unter Teck',
  'imprint.emailLabel': 'E-Mail',
  'imprint.email': 'info@best-tools.app',
  'imprint.legalBasis': 'Angaben gemäß § 5 DDG / § 18 Abs. 2 MStV',
  'imprint.legal':
    'Angaben gemäß § 5 DDG / § 18 Abs. 2 MStV: Eren Kazokoglu, Wiesach 13, 73230 Kirchheim unter Teck, E-Mail: info@best-tools.app',

  // Update Modal
  'update.title': 'Nach Updates suchen',
  'update.checking': 'Suche nach Updates…',
  'update.available': 'Neue Version verfügbar: {version}',
  'update.upToDate': 'Du verwendest bereits die neueste Version ({version}).',
  'update.error': 'Update-Prüfung fehlgeschlagen: {error}',
  'update.version': 'Aktuelle Version',
  'update.install': 'Update installieren & neu starten',
  'update.installing': 'Update wird installiert…',
  'update.close': 'Schließen',

  // Toasts
  'toast.saved': 'Datei gespeichert',
  'toast.exportedSvg': 'SVG exportiert',
  'toast.exportedPng': 'PNG exportiert',
  'toast.screenshotCopied': 'Screenshot in Zwischenablage kopiert',
  'toast.screenshotFailed': 'Screenshot konnte nicht kopiert werden',
  'toast.relationalCopied': 'Relationenmodell in Zwischenablage kopiert',
  'toast.sqlCopied': 'SQL in Zwischenablage kopiert',
  'toast.loadedDemo': 'Beispieldiagramm geladen',
  'toast.openedFile': 'Datei geöffnet: {name}',
  'toast.invalidFile': 'Ungültige .erm-Datei: {error}',
  'toast.invalidConnection': 'Diese beiden Elemente können nicht verbunden werden.',
} as const;

export type TranslationKey = keyof typeof de;

const en: Record<TranslationKey, string> = {
  'app.name': 'ERM-Editor',
  'app.subtitle': 'Entity-Relationship Diagrams in Chen & Min-Max Notation',

  // Menus
  'menu.file': 'File',
  'menu.file.new': 'New',
  'menu.file.open': 'Open…',
  'menu.file.recent': 'Open Recent',
  'menu.file.noRecent': 'No recent files',
  'menu.file.clearRecent': 'Clear Recent',
  'menu.file.loadDemo': 'Load Example',
  'menu.file.save': 'Save',
  'menu.file.saveAs': 'Save As…',
  'menu.file.exportSvg': 'Export as SVG…',
  'menu.file.exportPng1x': 'Export as PNG (1x)…',
  'menu.file.exportPng2x': 'Export as PNG (2x)…',
  'menu.file.exportPng3x': 'Export as PNG (3x)…',
  'menu.file.screenshot': 'Copy Screenshot to Clipboard',
  'menu.file.print': 'Print / PDF…',

  'menu.edit': 'Edit',
  'menu.edit.undo': 'Undo',
  'menu.edit.redo': 'Redo',
  'menu.edit.cut': 'Cut',
  'menu.edit.copy': 'Copy',
  'menu.edit.paste': 'Paste',
  'menu.edit.delete': 'Delete',
  'menu.edit.selectAll': 'Select All',

  'menu.view': 'View',
  'menu.view.zoomIn': 'Zoom In',
  'menu.view.zoomOut': 'Zoom Out',
  'menu.view.zoomReset': 'Reset Zoom (100%)',
  'menu.view.grid': 'Show Grid',
  'menu.view.gridDots': 'Grid: Dots',
  'menu.view.gridLines': 'Grid: Lines',
  'menu.view.snapToGrid': 'Snap to Grid',
  'menu.view.notation': 'Notation',
  'menu.view.notationChen': 'Chen Notation (1, n, m, c, cn)',
  'menu.view.notationMinMax': 'Min-Max Notation (0,1), (1,n)',
  'menu.view.relationalSidebar': 'Relational Model Sidebar',
  'menu.view.darkMode': 'Dark Mode',
  'menu.view.settings': 'Settings…',

  'menu.help': 'Help',
  'menu.help.shortcuts': 'Help & Shortcuts',
  'menu.help.about': 'About ERM-Editor',
  'menu.help.imprint': 'Imprint',
  'menu.help.checkUpdates': 'Check for Updates…',

  // Tools & Toolbar
  'tool.select': 'Select (V)',
  'tool.entity': 'Entity (E)',
  'tool.relationship': 'Relationship (R)',
  'tool.attribute': 'Attribute (A)',
  'tool.connect': 'Connect (C)',

  'action.weakEntity': 'Weak Entity',
  'action.identifyingRelationship': 'Identifying Relationship',
  'action.primaryKey': 'Primary Key (PK)',
  'action.foreignKey': 'Foreign Key (FK)',
  'action.multivalued': 'Multivalued Attribute',
  'action.derived': 'Derived Attribute',
  'action.autoLayoutAttributes': 'Auto-Layout Attributes',
  'action.totalParticipation': 'Total Participation (Double Line)',
  'action.screenshot': '1-Click Screenshot',
  'action.toggleSidebar': 'Relational Model',
  'action.toggleTheme': 'Toggle Theme',
  'action.language': 'Language',

  // Node types
  'node.entity': 'Entity',
  'node.relationship': 'Relationship',
  'node.attribute': 'Attribute',

  // Cardinalities (Chen & Min-Max)
  'cardinality.label': 'Cardinality',
  'cardinality.none': 'None',
  'cardinality.1': '1 (exactly one)',
  'cardinality.n': 'n (many)',
  'cardinality.m': 'm (many)',
  'cardinality.c': 'c (optional, 0 or 1)',
  'cardinality.cn': 'cn (optional, 0 or many)',
  'cardinality.0_1': '(0,1) optional, at most one',
  'cardinality.1_1': '(1,1) exactly one',
  'cardinality.0_n': '(0,n) zero or more',
  'cardinality.1_n': '(1,n) one or more',
  'cardinality.0_star': '(0,*) zero or more',
  'edge.role': 'Role',
  'edge.rolePlaceholder': 'Optional role…',
  'edge.totalParticipation': 'Total Participation',

  // Canvas & Context Menu
  'canvas.emptyHint':
    'Select a tool above (Entity, Relationship, Attribute) or double-click on the canvas.',
  'canvas.addEntity': 'Add Entity',
  'canvas.addRelationship': 'Add Relationship',
  'canvas.addAttribute': 'Add Attribute',
  'canvas.editLabel': 'Edit Label',
  'canvas.duplicate': 'Duplicate',
  'canvas.delete': 'Delete',
  'canvas.autoLayout': 'Auto-Layout Attributes',
  'canvas.connectHint': 'Drag or click a valid target',
  'canvas.invalidConnection': 'Invalid connection: Only Entity↔Relationship, Entity↔Attribute, or Relationship↔Attribute.',

  // Tabs & Status bar
  'tabs.newTab': 'New ERM',
  'tabs.closeTab': 'Close Tab',
  'tabs.unsavedChanges': 'Unsaved changes',
  'tabs.untitled': 'Untitled ERM',
  'tabs.confirmClose': 'Discard unsaved changes?',

  'status.zoom': 'Zoom',
  'status.nodes': 'Nodes',
  'status.edges': 'Edges',
  'status.selected': 'Selected',
  'status.notation': 'Notation',
  'status.notationChen': 'Chen',
  'status.notationMinMax': 'Min-Max',
  'status.saved': 'Saved',
  'status.unsaved': 'Unsaved',

  // Relational Model Sidebar & SQL Preview
  'sidebar.title': 'Relational Model & SQL',
  'sidebar.relationalTab': 'Relational Model',
  'sidebar.sqlTab': 'SQL CREATE TABLE',
  'sidebar.empty': 'Add entities and attributes to derive the relational model live.',
  'sidebar.copyRelational': 'Copy Relational Model',
  'sidebar.copySql': 'Copy SQL',
  'sidebar.copied': 'Copied!',
  'sidebar.includeDerived': 'Include derived attributes',
  'sidebar.pk': 'PK',
  'sidebar.fk': 'FK',
  'sidebar.tablesCount': '{count} relations',
  'sidebar.kindEntity': 'Entity',
  'sidebar.kindWeakEntity': 'Weak Entity',
  'sidebar.kindRelationshipNm': 'n:m Relationship',
  'sidebar.kindMultivalued': 'Multivalued Attribute',

  // Settings Modal
  'settings.title': 'Settings',
  'settings.theme': 'Appearance',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeSystem': 'System',
  'settings.language': 'Language',
  'settings.languageDe': 'German',
  'settings.languageEn': 'English',
  'settings.defaultNotation': 'Default Notation',
  'settings.defaultGrid': 'Show grid by default',
  'settings.defaultGridStyle': 'Default Grid Style',
  'settings.defaultSnapToGrid': 'Snap to grid by default',
  'settings.save': 'Save',
  'settings.close': 'Close',

  // Print Modal
  'print.title': 'Print / Save as PDF',
  'print.orientation': 'Orientation',
  'print.portrait': 'Portrait',
  'print.landscape': 'Landscape',
  'print.includeGrid': 'Include grid',
  'print.print': 'Print…',
  'print.cancel': 'Cancel',

  // Help & Imprint Modal
  'help.title': 'Help, Legend & Imprint',
  'help.tabShortcuts': 'Shortcuts',
  'help.tabLegend': 'Chen Legend',
  'help.tabAbout': 'About',
  'help.tabImprint': 'Imprint',
  'help.shortcutUndo': 'Undo',
  'help.shortcutRedo': 'Redo',
  'help.shortcutSave': 'Save',
  'help.shortcutCopy': 'Copy',
  'help.shortcutCut': 'Cut',
  'help.shortcutPaste': 'Paste',
  'help.shortcutDelete': 'Delete selection',
  'help.shortcutSelectAll': 'Select all',
  'help.shortcutEdit': 'Edit label',
  'help.shortcutZoom': 'Zoom (scroll wheel)',
  'help.shortcutPan': 'Pan (Space + drag)',
  'help.aboutDescription':
    'ERM-Editor is a free tool for creating Entity-Relationship Diagrams in Chen and Min-Max notation with live relational model derivation and SQL DDL export.',

  'imprint.title': 'Imprint',
  'imprint.operatorLabel': 'Operator',
  'imprint.operator': 'Eren Kazokoglu',
  'imprint.addressLabel': 'Address',
  'imprint.address': 'Wiesach 13, 73230 Kirchheim unter Teck',
  'imprint.emailLabel': 'Email',
  'imprint.email': 'info@best-tools.app',
  'imprint.legalBasis': 'Information pursuant to § 5 DDG / § 18 Abs. 2 MStV',
  'imprint.legal':
    'Information pursuant to § 5 DDG / § 18 Abs. 2 MStV: Eren Kazokoglu, Wiesach 13, 73230 Kirchheim unter Teck, Email: info@best-tools.app',

  // Update Modal
  'update.title': 'Check for Updates',
  'update.checking': 'Checking for updates…',
  'update.available': 'New version available: {version}',
  'update.upToDate': 'You are already using the latest version ({version}).',
  'update.error': 'Update check failed: {error}',
  'update.version': 'Current Version',
  'update.install': 'Install Update & Restart',
  'update.installing': 'Installing update…',
  'update.close': 'Close',

  // Toasts
  'toast.saved': 'File saved',
  'toast.exportedSvg': 'SVG exported',
  'toast.exportedPng': 'PNG exported',
  'toast.screenshotCopied': 'Screenshot copied to clipboard',
  'toast.screenshotFailed': 'Failed to copy screenshot',
  'toast.relationalCopied': 'Relational model copied to clipboard',
  'toast.sqlCopied': 'SQL copied to clipboard',
  'toast.loadedDemo': 'Example diagram loaded',
  'toast.openedFile': 'Opened file: {name}',
  'toast.invalidFile': 'Invalid .erm file: {error}',
  'toast.invalidConnection': 'These two elements cannot be connected.',
};

export const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  de,
  en,
};

export function t(
  lang: LanguageCode,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = translations[lang] ?? translations.de;
  let text = dict[key] ?? translations.de[key] ?? key;
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(paramValue));
    }
  }
  return text;
}

export function useTranslation() {
  const language = useEditorStore((state) => state.appSettings.language);
  return {
    language,
    t: (key: TranslationKey, params?: Record<string, string | number>) => t(language, key, params),
  };
}
