import React, { useMemo, useState } from 'react';
import {
  Apple,
  ArrowRight,
  Camera,
  Check,
  Code2,
  Database,
  Download,
  GitBranch,
  Layers,
  Monitor,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { deriveRelationalModel } from '../engine/relationalModel';
import { generateSqlFromRelationalModel } from '../engine/sqlGenerator';
import { renderErmToSvgString } from '../engine/svgExport';
import { getDemoErmDocument } from '../model/demoErm';
import { useEditorStore } from '../store/editorStore';
import { DownloadNoticeModal, type DownloadPlatform } from './DownloadNoticeModal';

const GITHUB_REPO_URL = 'https://github.com/EraldoReal/Eren-ERM-Editor';

export interface LandingPageProps {
  onLaunchEditor: () => void;
  onNavigate?: (path: string) => void;
  onOpenImprint: () => void;
}

type PreviewTab = 'svg' | 'relational' | 'sql';

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchEditor,
  onNavigate,
  onOpenImprint,
}) => {
  const [downloadModal, setDownloadModal] = useState<DownloadPlatform | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('svg');
  const language = useEditorStore((s) => s.appSettings.language);
  const theme = useEditorStore((s) => s.appSettings.theme);
  const updateAppSettings = useEditorStore((s) => s.updateAppSettings);
  const isDe = language === 'de';

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const demoDoc = useMemo(() => getDemoErmDocument(language), [language]);

  const demoSvg = useMemo(
    () =>
      renderErmToSvgString(demoDoc, {
        darkMode: isDark,
        padding: 20,
      }),
    [demoDoc, isDark]
  );

  const relationalTables = useMemo(() => deriveRelationalModel(demoDoc), [demoDoc]);
  const generatedSql = useMemo(
    () => generateSqlFromRelationalModel(relationalTables),
    [relationalTables]
  );

  const chenElements = isDe
    ? [
        { key: 'E', name: 'Entitätstyp', syntax: 'Rechteck · z. B. Schüler, Kurs' },
        { key: 'W', name: 'Schwache Entität', syntax: 'Doppeltes Rechteck · existenzabhängig' },
        { key: 'R', name: 'Beziehungstyp', syntax: 'Raute · mit 1:1, 1:n, n:m oder (min,max)' },
        { key: 'I', name: 'Identifizierende Beziehung', syntax: 'Doppelte Raute · für schwache Entitäten' },
        { key: 'A', name: 'Attribut & Primärschlüssel', syntax: 'Oval · unterstrichen = PK · gestrichelt = FK' },
        { key: 'M', name: 'Mehrwertiges Attribut', syntax: 'Doppeltes Oval · erzeugt eigene Tabelle' },
        { key: 'D', name: 'Abgeleitetes Attribut', syntax: 'Gestricheltes Oval · z. B. Alter' },
      ]
    : [
        { key: 'E', name: 'Entity Type', syntax: 'Rectangle · e.g. Student, Course' },
        { key: 'W', name: 'Weak Entity', syntax: 'Double rectangle · existence-dependent' },
        { key: 'R', name: 'Relationship Type', syntax: 'Diamond · with 1:1, 1:n, n:m or (min,max)' },
        { key: 'I', name: 'Identifying Relationship', syntax: 'Double diamond · links weak entities' },
        { key: 'A', name: 'Attribute & Primary Key', syntax: 'Oval · underlined = PK · dashed = FK' },
        { key: 'M', name: 'Multivalued Attribute', syntax: 'Double oval · derives its own table' },
        { key: 'D', name: 'Derived Attribute', syntax: 'Dashed oval · e.g. Age' },
      ];

  const faqs = isDe
    ? [
        {
          q: 'Welche Notationen unterstützt ERM-Editor?',
          a: 'ERM-Editor unterstützt die klassische Chen-Notation (1, n, m, c, cn) sowie die Min-Max-Notation ((0,1), (1,1), (0,n), (1,n), (0,*)) — per 1-Klick umschaltbar.',
        },
        {
          q: 'Wie funktioniert die Ableitung von Relationenmodell und SQL?',
          a: 'Während du dein ER-Diagramm zeichnest, leitet ERM-Editor automatisch alle Tabellen, Primär- und Fremdschlüssel (inkl. n:m-Zwischentabellen, schwachen Entitäten und mehrwertigen Attributen) sowie fertige SQL CREATE TABLE Statements ab.',
        },
        {
          q: 'Welche Dateiformate werden unterstützt?',
          a: 'Diagramme werden als offenes JSON-Format (.erm) gespeichert. Für Abgaben und Dokumentation stehen verlustfreies SVG, hochauflösendes PNG (1x/2x/3x), 1-Klick-Screenshot und PDF/Druck zur Verfügung.',
        },
        {
          q: 'Werden meine Diagramme auf einen Server hochgeladen?',
          a: 'Nein. Alle Diagramme, Einstellungen und Fonts bleiben zu 100 % lokal im Browser bzw. auf deinem Rechner. Kein Tracking, keine Registrierung, keine Cloud-Pflicht.',
        },
      ]
    : [
        {
          q: 'Which notations does ERM-Editor support?',
          a: 'ERM-Editor supports classic Chen notation (1, n, m, c, cn) as well as Min-Max notation ((0,1), (1,1), (0,n), (1,n), (0,*)) — switchable with a single click.',
        },
        {
          q: 'How does live Relational Model & SQL derivation work?',
          a: 'As you draw your ER diagram, ERM-Editor automatically derives all relational tables, primary/foreign keys (including n:m junction tables, weak entities, and multivalued attributes), and ready-to-use SQL CREATE TABLE statements.',
        },
        {
          q: 'Which file and export formats are supported?',
          a: 'Diagrams are saved in the open .erm JSON format. For assignments and documentation, you can export lossless SVG, high-res PNG (1x/2x/3x), 1-click clipboard screenshots, and PDF/Print.',
        },
        {
          q: 'Are my diagrams uploaded to any server?',
          a: 'No. All diagrams, settings, and fonts stay 100% local in your browser or on your machine. Zero tracking, zero sign-up, no cloud lock-in.',
        },
      ];

  return (
    <div
      className="h-screen w-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-text"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(148, 163, 184, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.16) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-300 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-600 text-white font-bold text-xs">
              E
            </span>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              ERM-Editor
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Chen &amp; Min-Max · v1.0.0
            </span>
          </div>

          <nav
            aria-label={isDe ? 'Hauptnavigation' : 'Main navigation'}
            className="flex items-center gap-2 sm:gap-3"
          >
            <a
              href="/chen-notation"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/chen-notation');
                }
              }}
              className="hidden md:inline-block px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              {isDe ? 'Chen-Notation' : 'Chen Notation'}
            </a>
            <a
              href="/relationenmodell"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/relationenmodell');
                }
              }}
              className="hidden lg:inline-block px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              {isDe ? 'Relationenmodell' : 'Relational Model'}
            </a>
            <a
              href="/yed-alternative"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/yed-alternative');
                }
              }}
              className="hidden lg:inline-block px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              yEd-Alternative
            </a>
            <a
              href="/faq"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/faq');
                }
              }}
              className="hidden md:inline-block px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              FAQ
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <Code2 className="w-3.5 h-3.5" />
              GitHub
            </a>

            {/* DE | EN Switcher */}
            <div className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => updateAppSettings({ language: 'de' })}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  isDe
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => updateAppSettings({ language: 'en' })}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  !isDe
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={onLaunchEditor}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              {isDe ? 'Editor öffnen' : 'Open Editor'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                {isDe ? 'Chen- & Min-Max-ERM-Editor' : 'Chen & Min-Max ERM Editor'}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {isDe ? '100 % Lokal · Ohne Installation' : '100% Local · Zero Install'}
              </span>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                Open Source (MIT)
              </a>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {isDe
                ? 'ER-Diagramme in Chen-Notation zeichnen — mit Live-Relationenmodell & SQL.'
                : 'Design Chen ER Diagrams — with Live Relational Model & SQL.'}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {isDe ? (
                <>
                  Die fokussierte Alternative zu <strong>yEd</strong> und Draw.io für
                  Informatik-Unterricht, Studium und Datenbank-Entwurf: exakte{' '}
                  <strong>Chen- &amp; Min-Max-Notation</strong>, automatische Ableitung von{' '}
                  <strong>Relationenmodell &amp; SQL</strong>, Attribut-Auto-Layout und 1-Klick-Export.
                </>
              ) : (
                <>
                  The focused alternative to <strong>yEd</strong> and Draw.io for computer science
                  courses and database design: exact <strong>Chen &amp; Min-Max notation</strong>,
                  live <strong>relational schema &amp; SQL</strong> generation, attribute
                  auto-layout, and 1-click export.
                </>
              )}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onLaunchEditor}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {isDe ? 'Editor im Browser öffnen →' : 'Open Editor in Browser →'}
              </button>

              <button
                type="button"
                onClick={() => setDownloadModal('mac')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Apple className="w-4 h-4" />
                macOS (.dmg)
              </button>

              <button
                type="button"
                onClick={() => setDownloadModal('windows')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                Windows (.exe)
              </button>
            </div>

            {/* Compact Spec Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
              <div>
                <div className="text-slate-400 text-[10px]">NOTATION</div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">Chen · Min-Max</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">{isDe ? 'ABLEITUNG' : 'DERIVATION'}</div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">Rel. · SQL</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">EXPORT</div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">SVG · PNG · PDF</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">{isDe ? 'LIZENZ' : 'LICENSE'}</div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {isDe ? 'Kostenlos · MIT' : 'Free · MIT'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Rendered ERM + Relational Model + SQL */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-xs font-mono text-slate-600 dark:text-slate-300">
              <span>{isDe ? 'beispiel_schulverwaltung.erm' : 'example_school_db.erm'}</span>
              <div className="inline-flex items-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewTab('svg')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    previewTab === 'svg'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isDe ? 'ERM-Diagramm (SVG)' : 'ER Diagram (SVG)'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('relational')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    previewTab === 'relational'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isDe ? 'Relationenmodell' : 'Relational Model'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('sql')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    previewTab === 'sql'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  SQL (CREATE TABLE)
                </button>
              </div>
            </div>

            {previewTab === 'svg' && (
              <div className="p-4 sm:p-5 bg-white dark:bg-slate-950 flex items-center justify-center overflow-x-auto min-h-[340px]">
                <div
                  className="w-full flex justify-center [&>svg]:w-full [&>svg]:max-w-[760px] [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: demoSvg }}
                />
              </div>
            )}

            {previewTab === 'relational' && (
              <div className="p-4 sm:p-5 bg-white dark:bg-slate-950 space-y-2.5 min-h-[340px] max-h-[440px] overflow-y-auto font-mono text-xs">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isDe
                    ? 'Automatisch aus dem Beispiel-ERM abgeleitet (Primärschlüssel unterstrichen, Fremdschlüssel mit ↑):'
                    : 'Automatically derived from the example ERM (Primary Keys underlined, Foreign Keys marked with ↑):'}
                </p>
                <div className="space-y-2">
                  {relationalTables.map((table) => (
                    <div
                      key={table.name}
                      className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70"
                    >
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        {table.name}
                      </span>
                      <span className="text-slate-500"> (</span>
                      {table.columns.map((col, idx) => (
                        <React.Fragment key={`${table.name}-${col.name}-${idx}`}>
                          {idx > 0 && <span className="text-slate-400">, </span>}
                          <span
                            className={`${
                              col.isPrimaryKey
                                ? 'underline decoration-2 underline-offset-2 font-semibold text-slate-900 dark:text-white'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {col.isForeignKey ? `↑${col.name}` : col.name}
                          </span>
                        </React.Fragment>
                      ))}
                      <span className="text-slate-500">)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewTab === 'sql' && (
              <div className="p-4 sm:p-5 bg-slate-950 text-slate-100 min-h-[340px] max-h-[440px] overflow-auto">
                <pre className="text-xs font-mono leading-relaxed whitespace-pre">
                  {generatedSql}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Feature Cards + Chen Reference */}
        <section id="elemente" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Chen Notation Reference */}
          <article className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isDe
                  ? 'Vollständige Chen-Notation & Erweiterungen'
                  : 'Complete Chen Notation & Extensions'}
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Chen · Min-Max
              </span>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-md divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {chenElements.map((el) => (
                <div
                  key={el.key}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                      {el.key}
                    </kbd>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {el.name}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {el.syntax}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* Right: Core Capabilities */}
          <article className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isDe
                ? 'Entwickelt für Datenbank-Entwurf & Unterricht'
                : 'Built for Database Design & Education'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {isDe ? 'Live-Relationenmodell & SQL' : 'Live Relational Model & SQL'}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isDe
                    ? 'Automatische Überführung in Tabellen inkl. PK/FK-Markierung und SQL CREATE TABLE Vorschau.'
                    : 'Automatic transformation into tables with PK/FK markers and SQL CREATE TABLE preview.'}
                </p>
              </div>

              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  <GitBranch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {isDe ? 'Exakte Geometrie & Auto-Layout' : 'Exact Geometry & Auto-Layout'}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isDe
                    ? 'Kanten treffen exakt auf Rechteck-, Rauten- und Ellipsenränder. Attribute per 1-Klick anordnen.'
                    : 'Edges anchor cleanly on rectangle, diamond, and ellipse borders. Auto-arrange attributes in 1 click.'}
                </p>
              </div>

              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {isDe ? '1-Klick-Screenshot' : '1-Click Screenshot'}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isDe
                    ? 'Das komplette ER-Diagramm gestochen scharf (2x PNG) direkt in die Zwischenablage kopieren.'
                    : 'Copy the entire ER diagram as a crisp 2x PNG directly to your clipboard.'}
                </p>
              </div>

              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {isDe ? 'SVG, PNG & Druck / PDF' : 'SVG, PNG & Print / PDF'}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isDe
                    ? 'Verlustfreies SVG für Word & LaTeX, PNG bis 3x Auflösung sowie Druckvorschau für PDF.'
                    : 'Lossless SVG for Word & LaTeX, up to 3x PNG export, and print preview for PDF.'}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* Downloads */}
        <section
          id="downloads"
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-700 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isDe
                  ? 'v1.0.0 · Native Desktop-Apps & Browser-Version'
                  : 'v1.0.0 · Native Desktop Apps & Browser Edition'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isDe
                ? 'Download für macOS & Windows — oder direkt im Browser starten'
                : 'Download for macOS & Windows — or launch right in your browser'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {isDe
                ? 'Native Datei-Dialoge für .erm, Dark & Light Mode, keine Java-Installation nötig.'
                : 'Native file dialogs for .erm, Dark & Light Mode, zero Java installation required.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDownloadModal('mac')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              macOS (.dmg)
            </button>
            <button
              type="button"
              onClick={() => setDownloadModal('windows')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Windows (.exe)
            </button>
            <button
              type="button"
              onClick={onLaunchEditor}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {isDe ? 'Editor im Browser öffnen →' : 'Open Editor in Browser →'}
            </button>
          </div>
        </section>

        {/* Comparison: yEd vs ERM-Editor + Guide */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <article className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isDe
                ? 'Vergleich: yEd Graph Editor vs. ERM-Editor'
                : 'Comparison: yEd Graph Editor vs. ERM-Editor'}
            </h2>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2">{isDe ? 'Funktion' : 'Feature'}</th>
                    <th className="px-3 py-2">yEd</th>
                    <th className="px-3 py-2 text-blue-700 dark:text-blue-400">ERM-Editor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="px-3 py-2 font-medium">
                      {isDe ? 'Direkt im Browser nutzbar' : 'Runs in Browser'}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {isDe ? 'Eingeschränkt (yEd Live)' : 'Limited (yEd Live)'}
                    </td>
                    <td className="px-3 py-2 font-medium text-emerald-700 dark:text-emerald-400">
                      ✓ {isDe ? 'Sofort & 100 % lokal' : 'Instant & 100% local'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">
                      {isDe ? 'Spezialisiert auf Chen & Min-Max' : 'Dedicated Chen & Min-Max'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {isDe ? 'Manuelle Paletten-Suche' : 'Manual shape palette'}
                    </td>
                    <td className="px-3 py-2 font-medium text-emerald-700 dark:text-emerald-400">
                      ✓ {isDe ? '1-Klick-Flags (PK, FK, Schwach…)' : '1-click flags (PK, FK, Weak…)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">
                      {isDe ? 'Live-Relationenmodell & SQL' : 'Live Relational Model & SQL'}
                    </td>
                    <td className="px-3 py-2 text-slate-400">—</td>
                    <td className="px-3 py-2 font-medium text-emerald-700 dark:text-emerald-400">
                      ✓ {isDe ? 'Automatische Ableitung' : 'Automatic derivation'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">
                      {isDe ? 'Java-Installation nötig?' : 'Java required?'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {isDe ? 'Ja (Desktop-Version)' : 'Yes (Desktop app)'}
                    </td>
                    <td className="px-3 py-2 font-medium text-emerald-700 dark:text-emerald-400">
                      ✓ {isDe ? 'Nein (Web & Nativ)' : 'No (Web & Native)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">
                      {isDe ? 'Open Source & Dark Mode' : 'Open Source & Dark Mode'}
                    </td>
                    <td className="px-3 py-2 text-slate-400">— (Proprietary)</td>
                    <td className="px-3 py-2 font-medium text-emerald-700 dark:text-emerald-400">
                      ✓ MIT · DE/EN · Dark Mode
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {isDe
                ? 'Vom Entity-Relationship-Modell direkt zur Datenbank'
                : 'From Entity-Relationship Model Straight to SQL'}
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                {isDe ? (
                  <>
                    Ein <strong>Entity-Relationship-Modell (ERM)</strong> nach Peter Chen ist der
                    Standard für die konzeptionelle Datenmodellierung in Schule, Abitur und Studium.
                    Entitäten, Beziehungen und Attribute werden eindeutig getrennt und mit
                    Kardinalitäten verknüpft.
                  </>
                ) : (
                  <>
                    An <strong>Entity-Relationship Model (ERM)</strong> in Chen notation is the
                    standard for conceptual database design in computer science education and
                    software engineering.
                  </>
                )}
              </p>
              <p>
                {isDe ? (
                  <>
                    Im <strong>ERM-Editor</strong> verbindest du Entitäten, Beziehungen und Attribute
                    mit automatischer Validierung (ungültige Verbindungen werden verhindert),
                    ordnest Attribute per Klick rund um Entitäten an und prüfst in der
                    Seitenleiste sofort das resultierende <strong>Relationenmodell</strong> und{' '}
                    <strong>SQL</strong>.
                  </>
                ) : (
                  <>
                    In <strong>ERM-Editor</strong>, connect entities, relationships, and attributes
                    with automatic validation, auto-layout attributes with a single click, and
                    inspect the resulting <strong>relational schema</strong> and{' '}
                    <strong>SQL</strong> live in the sidebar.
                  </>
                )}
              </p>
            </div>
          </article>
        </section>

        {/* FAQ (SEO) */}
        <section
          id="faq"
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 sm:p-6 shadow-xs space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isDe ? 'Häufige Fragen (FAQ)' : 'Frequently Asked Questions'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            {faqs.map((item) => (
              <div key={item.q} className="space-y-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.q}</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Best-Tools Informatik-Suite */}
        <section
          id="tools"
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isDe
                  ? 'Weitere Informatik-Tools aus der Best-Tools Suite'
                  : 'More Computer Science Tools from Best-Tools'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isDe
                  ? 'Kostenlose, datenschutzfreundliche Werkzeuge für Informatik-Unterricht, Abitur und Studium — direkt im Browser oder als Desktop-App.'
                  : 'Free, privacy-friendly tools for computer science classes, exams, and university — in your browser or as a native desktop app.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://strukto.best-tools.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Eren Struktogrammer
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    DIN 66261
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isDe
                    ? 'Moderner Struktogramm-Editor nach DIN 66261 (Nassi-Shneiderman) als Alternative zum klassischen HuS Struktogrammer — mit Verzweigungen, Schleifen, SVG/PNG-Export, 1-Klick-Screenshot sowie macOS- und Windows-App.'
                    : 'Modern Nassi-Shneiderman structogram editor (DIN 66261) — with branches, loops, lossless SVG/PNG export, 1-click screenshot, and native macOS/Windows desktop apps.'}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-blue-600 dark:text-blue-400">
                <span>strukto.best-tools.app</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>

            <a
              href="https://erm.best-tools.app"
              className="group p-4 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-500 transition-colors flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    ERM-Editor
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Chen &amp; Min-Max
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isDe
                    ? 'Spezialisierter Editor für Entity-Relationship-Modelle in Chen- und Min-Max-Notation (Alternative zu yEd) — mit schwachen Entitäten, Auto-Layout, Live-Ableitung des Relationenmodells und SQL CREATE TABLE-Vorschau.'
                    : 'Dedicated Entity-Relationship diagram editor in Chen & Min-Max notation — featuring weak entities, auto-layout, live relational schema derivation, and SQL CREATE TABLE preview.'}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-blue-600 dark:text-blue-400">
                <span>erm.best-tools.app</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>

            <a
              href="https://sql.best-tools.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    SQL-Trainer
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    SQLite Sandbox
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isDe
                    ? 'Interaktiver SQL-Trainer & SQLite-Sandbox direkt im Browser — ideal, um die aus dem ERM-Editor abgeleiteten CREATE TABLE-Statements und Abfragen sofort auszuführen und zu üben.'
                    : 'Interactive SQL trainer & SQLite sandbox right in the browser — ideal for running and practicing the CREATE TABLE statements and queries derived from ERM-Editor.'}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-blue-600 dark:text-blue-400">
                <span>sql.best-tools.app</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          </div>
        </section>

        {/* Discreet Collapsible Changelog */}
        <section id="changelog">
          <details className="group bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
            <summary className="list-none cursor-pointer px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 select-none">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  Changelog
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  v1.0.2
                </span>
                <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                  — {isDe ? 'Versionshinweise & Änderungen anzeigen' : 'Show release notes & changes'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>

            <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">v1.0.2</span>
                  <span className="text-[11px] font-mono text-slate-400">2026-11-21</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    {isDe ? 'Aktuell' : 'Latest'}
                  </span>
                </div>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  {isDe ? (
                    <>
                      <li>
                        <strong>24h-Link-Teilen (E2E-verschlüsselt):</strong> Unter{' '}
                        <em>Datei → Link erstellen (24h)</em> &amp; <em>Link öffnen…</em> lassen
                        sich ERM-Modelle clientseitig per WebCrypto AES-GCM verschlüsselt teilen
                        (inkl. URL-Auto-Open über <code>#s=…</code>).
                      </li>
                      <li>
                        <strong>Smart-Tab-Handling:</strong> Geteilte Modelle ersetzen leere,
                        unbenutzte Tabs direkt oder öffnen andernfalls einen neuen Tab.
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <strong>24h E2E-Encrypted Share Links:</strong> Share ERM models directly
                        via <em>File → Create Share Link (24h)</em> &amp;{' '}
                        <em>Open Share Link…</em> using client-side WebCrypto AES-GCM (with{' '}
                        <code>#s=…</code> auto-open).
                      </li>
                      <li>
                        <strong>Smart Tab Handling:</strong> Shared models reuse an untouched empty
                        tab or open in a new tab.
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">v1.0.1</span>
                  <span className="text-[11px] font-mono text-slate-400">2026-11-21</span>
                </div>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  {isDe ? (
                    <>
                      <li>
                        <strong>Maximierter Start:</strong> Die Desktop-App öffnet sich
                        standardmäßig maximiert (<code>maximized: true</code>).
                      </li>
                      <li>
                        <strong>Direkte Downloads &amp; Auto-Updater:</strong> macOS
                        (<code>.dmg</code>) und Windows (<code>.exe</code>) laden direkt vom
                        Server; signierte In-App-Updates über <code>latest.json</code>.
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <strong>Maximized Startup:</strong> Desktop app now opens maximized by
                        default (<code>maximized: true</code>).
                      </li>
                      <li>
                        <strong>Direct Downloads &amp; Auto-Updater:</strong> Direct macOS
                        (<code>.dmg</code>) and Windows (<code>.exe</code>) downloads plus signed
                        in-app updates via <code>latest.json</code>.
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">v1.0.0</span>
                  <span className="text-[11px] font-mono text-slate-400">2026-11-21</span>
                </div>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  {isDe ? (
                    <>
                      <li>
                        <strong>Chen- &amp; Min-Max-Notation:</strong> Genormte SVG-Geometrie für
                        Entitäten, schwache Entitäten, Beziehungen, identifizierende Beziehungen
                        sowie Attribute (PK, FK/Teilschlüssel, mehrwertig, abgeleitet).
                      </li>
                      <li>
                        <strong>Live-Relationenmodell &amp; SQL:</strong> Automatische Ableitung
                        inkl. <code>n:m</code>-Zwischentabellen, <code>↑</code>-Fremdschlüsselpfeilen
                        und <code>CREATE TABLE</code>-Vorschau.
                      </li>
                      <li>
                        <strong>Editor-UX &amp; Export:</strong> Multi-Tab-Projekte (<code>.erm</code>),
                        Auto-Layout für Attribute, Linksklick-Canvas-Panning, UI-Skalierung
                        (80 %–140 %), 1-Klick-2x-PNG-Screenshot, SVG/PNG/PDF-Export und Dark Mode.
                      </li>
                      <li>
                        <strong>Desktop-Apps (Tauri v2):</strong> Native Builds für macOS
                        (<code>.dmg</code>) und Windows (<code>.exe</code>) mit integriertem
                        Auto-Updater unter <em>Hilfe → Nach Updates suchen…</em>.
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <strong>Chen &amp; Min-Max Notation:</strong> Precision SVG geometry for
                        entities, weak entities, relationships, identifying relationships, and
                        attributes (PK, FK/partial key, multivalued, derived).
                      </li>
                      <li>
                        <strong>Live Relational Model &amp; SQL:</strong> Automatic schema
                        derivation with <code>n:m</code> junction tables, <code>↑</code> FK arrows,
                        and <code>CREATE TABLE</code> preview.
                      </li>
                      <li>
                        <strong>Editor UX &amp; Export:</strong> Multi-tab projects (<code>.erm</code>),
                        attribute auto-layout, left-drag canvas panning, UI scaling (80%–140%),
                        1-click 2x PNG screenshot, SVG/PNG/PDF export, and Dark Mode.
                      </li>
                      <li>
                        <strong>Desktop Apps (Tauri v2):</strong> Native builds for macOS
                        (<code>.dmg</code>) and Windows (<code>.exe</code>) with built-in
                        auto-updater under <em>Help → Check for Updates…</em>.
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </details>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 mt-4">
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>ERM-Editor · Chen &amp; Min-Max ERM · Eren Kazokoglu</span>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white underline underline-offset-4"
            >
              Open Source (GitHub)
            </a>
            <button
              type="button"
              onClick={onOpenImprint}
              className="hover:text-slate-900 dark:hover:text-white underline underline-offset-4 cursor-pointer"
            >
              {isDe ? 'Impressum & Datenschutz' : 'Imprint & Privacy'}
            </button>
            <a
              href="mailto:info@best-tools.app"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              info@best-tools.app
            </a>
          </div>
        </div>
      </footer>

      <DownloadNoticeModal
        platform={downloadModal}
        onClose={() => setDownloadModal(null)}
        language={language}
      />
    </div>
  );
};
