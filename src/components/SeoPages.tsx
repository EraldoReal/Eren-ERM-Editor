import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { deriveRelationalModel } from '../engine/relationalModel';
import { generateSqlFromRelationalModel } from '../engine/sqlGenerator';
import { renderErmToSvgString } from '../engine/svgExport';
import { getDemoErmDocument } from '../model/demoErm';
import { useEditorStore } from '../store/editorStore';
import { DownloadNoticeModal, type DownloadPlatform } from './DownloadNoticeModal';

const GITHUB_REPO_URL = 'https://github.com/EraldoReal/Eren-ERM-Editor';

export type SeoPageRoute =
  | '/chen-notation'
  | '/relationenmodell'
  | '/yed-alternative'
  | '/faq';

export interface SeoPageProps {
  route: SeoPageRoute;
  onNavigate: (path: string) => void;
  onLaunchEditor: () => void;
  onOpenImprint: () => void;
}

const PAGE_META: Record<
  SeoPageRoute,
  { de: { title: string; description: string }; en: { title: string; description: string } }
> = {
  '/chen-notation': {
    de: {
      title: 'Chen-Notation & Min-Max für ER-Diagramme erklärt | ERM-Editor',
      description:
        'Alle Elemente der Chen-Notation einfach erklärt: Entität, schwache Entität, Beziehung, identifizierende Beziehung, Attribut, Primärschlüssel, mehrwertig & abgeleitet.',
    },
    en: {
      title: 'Chen Notation & Min-Max for ER Diagrams Explained | ERM-Editor',
      description:
        'All Chen notation symbols explained: Entity, Weak Entity, Relationship, Identifying Relationship, Attribute, Primary Key, Multivalued & Derived Attributes.',
    },
  },
  '/relationenmodell': {
    de: {
      title: 'ERM ins Relationenmodell & SQL überführen (Regeln & Beispiel) | ERM-Editor',
      description:
        'Transformationsregeln vom ER-Diagramm zum Relationenmodell und SQL CREATE TABLE: 1:1, 1:n, n:m-Zwischentabellen, schwache Entitäten und mehrwertige Attribute.',
    },
    en: {
      title: 'ER Diagram to Relational Model & SQL Derivation | ERM-Editor',
      description:
        'Transformation rules from ERM to Relational Schema and SQL CREATE TABLE: 1:1, 1:n, n:m junction tables, weak entities, and multivalued attributes.',
    },
  },
  '/yed-alternative': {
    de: {
      title: 'yEd Alternative für ER-Diagramme (Browser, Mac & Windows) | ERM-Editor',
      description:
        'Moderne yEd-Alternative speziell für Chen- & Min-Max-ERM: Läuft direkt im Browser sowie nativ unter macOS & Windows mit Live-Relationenmodell und SQL-Export.',
    },
    en: {
      title: 'Modern yEd Alternative for ER Diagrams (Browser, Mac & Windows) | ERM-Editor',
      description:
        'A focused yEd alternative built for Chen & Min-Max ER diagrams: runs in your browser and natively on macOS & Windows with live relational schema & SQL.',
    },
  },
  '/faq': {
    de: {
      title: 'Häufige Fragen (FAQ) – ER-Diagramme online erstellen | ERM-Editor',
      description:
        'Antworten zu .erm-Dateiformat, Chen vs. Min-Max, SQL-Ableitung, Datenschutz, 1-Klick-Screenshot und Desktop-Downloads für macOS und Windows.',
    },
    en: {
      title: 'Frequently Asked Questions (FAQ) – ERM-Editor',
      description:
        'Answers on .erm file format, Chen vs. Min-Max notation, SQL derivation, privacy, 1-click screenshots, and macOS/Windows desktop downloads.',
    },
  },
};

export const SeoSubPage: React.FC<SeoPageProps> = ({
  route,
  onNavigate,
  onLaunchEditor,
  onOpenImprint,
}) => {
  const [downloadModal, setDownloadModal] = useState<DownloadPlatform | null>(null);
  const language = useEditorStore((s) => s.appSettings.language);
  const theme = useEditorStore((s) => s.appSettings.theme);
  const updateAppSettings = useEditorStore((s) => s.updateAppSettings);
  const isDe = language === 'de';

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const meta = isDe ? PAGE_META[route].de : PAGE_META[route].en;
    document.title = meta.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      descEl.setAttribute('content', meta.description);
    }
    window.scrollTo({ top: 0 });
  }, [route, isDe]);

  const demoDoc = useMemo(() => getDemoErmDocument(language), [language]);
  const exampleSvg = useMemo(
    () => renderErmToSvgString(demoDoc, { darkMode: isDark, padding: 16 }),
    [demoDoc, isDark]
  );
  const relationalTables = useMemo(() => deriveRelationalModel(demoDoc), [demoDoc]);
  const generatedSql = useMemo(
    () => generateSqlFromRelationalModel(relationalTables),
    [relationalTables]
  );

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
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-600 text-white font-bold text-xs">
                E
              </span>
              <span className="truncate">ERM-Editor</span>
            </button>
          </div>

          <nav
            aria-label={isDe ? 'Ratgeber-Navigation' : 'Guide navigation'}
            className="flex items-center gap-2 sm:gap-3"
          >
            <button
              type="button"
              onClick={() => onNavigate('/chen-notation')}
              className={`hidden md:inline-block px-2 py-1 text-xs rounded cursor-pointer ${
                route === '/chen-notation'
                  ? 'font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isDe ? 'Chen-Notation' : 'Chen Notation'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/relationenmodell')}
              className={`hidden md:inline-block px-2 py-1 text-xs rounded cursor-pointer ${
                route === '/relationenmodell'
                  ? 'font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isDe ? 'Relationenmodell' : 'Relational Model'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/yed-alternative')}
              className={`hidden lg:inline-block px-2 py-1 text-xs rounded cursor-pointer ${
                route === '/yed-alternative'
                  ? 'font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              yEd-Alternative
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/faq')}
              className={`hidden sm:inline-block px-2 py-1 text-xs rounded cursor-pointer ${
                route === '/faq'
                  ? 'font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              FAQ
            </button>

            {/* DE | EN Switcher */}
            <div className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => updateAppSettings({ language: 'de' })}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  isDe
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
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
                    : 'text-slate-500 dark:text-slate-400'
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

      <main className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isDe ? 'Zurück zur Startseite' : 'Back to Home'}
        </button>

        {route === '/chen-notation' && (
          <article className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono text-blue-700 dark:text-blue-400">
                {isDe ? 'CHEN-NOTATION REFERENZ' : 'CHEN NOTATION REFERENCE'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {isDe
                  ? 'ER-Diagramm Symbole in Chen-Notation & Min-Max'
                  : 'ER Diagram Symbols in Chen & Min-Max Notation'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                {isDe
                  ? 'Die Chen-Notation (nach Peter Chen, 1976) trennt konsequent zwischen Entitäten, Beziehungen und Attributen und bildet die Grundlage für den Datenbank-Entwurf.'
                  : 'Chen notation (introduced by Peter Chen, 1976) cleanly separates entities, relationships, and attributes as the foundation of relational database design.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 space-y-3 text-xs sm:text-sm">
                {(isDe
                  ? [
                      {
                        t: '1. Entität (Rechteck)',
                        d: 'Repräsentiert ein eigenständiges Objekt der realen Welt, z. B. Schüler, Kurs oder Lehrer.',
                      },
                      {
                        t: '2. Schwache Entität (Doppeltes Rechteck)',
                        d: 'Existiert nur in Abhängigkeit von einer übergeordneten starken Entität (z. B. Lernmodul eines Kurses) und wird über eine identifizierende Beziehung (doppelte Raute) verknüpft.',
                      },
                      {
                        t: '3. Beziehung (Raute)',
                        d: 'Beschreibt die logische Verknüpfung zwischen Entitäten mit Kardinalitäten wie 1:1, 1:n, n:m oder Min-Max ((0,1), (1,n)). Totale Partizipation wird als Doppellinie gezeichnet.',
                      },
                      {
                        t: '4. Attribute (Oval)',
                        d: 'Eigenschaften von Entitäten oder Beziehungen. Primärschlüssel werden durchgezogen unterstrichen, Fremdschlüssel gestrichelt, mehrwertige Attribute als doppeltes Oval und abgeleitete als gestricheltes Oval.',
                      },
                    ]
                  : [
                      {
                        t: '1. Entity (Rectangle)',
                        d: 'Represents an independent real-world object such as Student, Course, or Teacher.',
                      },
                      {
                        t: '2. Weak Entity (Double Rectangle)',
                        d: 'Depends for its existence on a parent strong entity (e.g. a Course Module) and connects via an identifying relationship (double diamond).',
                      },
                      {
                        t: '3. Relationship (Diamond)',
                        d: 'Describes associations between entities with cardinalities like 1:1, 1:n, n:m or Min-Max ((0,1), (1,n)). Total participation is drawn as a double line.',
                      },
                      {
                        t: '4. Attributes (Oval)',
                        d: 'Properties of entities or relationships. Primary keys have a solid underline, foreign keys a dashed underline, multivalued attributes a double oval, and derived attributes a dashed oval.',
                      },
                    ]
                ).map((item) => (
                  <div
                    key={item.t}
                    className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                  >
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">{item.t}</h2>
                    <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {item.d}
                    </p>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-6 border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  {isDe
                    ? 'Live-Beispiel: Schulverwaltung (1:n, n:m, schwache Entität)'
                    : 'Live Example: School DB (1:n, n:m, weak entity)'}
                </div>
                <div
                  className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: exampleSvg }}
                />
                <button
                  type="button"
                  onClick={onLaunchEditor}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  {isDe ? 'Selbst im Editor ausprobieren' : 'Try in Editor Now'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </article>
        )}

        {route === '/relationenmodell' && (
          <article className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-blue-700 dark:text-blue-400">
                  {isDe ? 'ERM → RELATIONENMODELL → SQL' : 'ERM → RELATIONAL MODEL → SQL'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {isDe
                    ? 'Vom ER-Diagramm zum Relationenmodell & SQL'
                    : 'Transforming ER Diagrams to Relational Schema & SQL'}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                  {isDe
                    ? 'ERM-Editor wendet die standardisierten Transformationsregeln in Echtzeit auf dein Diagramm an und zeigt Relationen sowie SQL CREATE TABLE direkt in der Seitenleiste.'
                    : 'ERM-Editor applies standard transformation rules to your diagram in real time, displaying relational tables and SQL CREATE TABLE statements in the sidebar.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onLaunchEditor}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer"
              >
                {isDe ? 'Im Editor öffnen' : 'Open in Editor'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              {(isDe
                ? [
                    {
                      t: '1:n-Beziehung',
                      d: 'Der Primärschlüssel der 1-Seite wandert als Fremdschlüssel (↑) in die Tabelle der n-Seite. Etwaige Beziehungsattribute folgen ebenfalls auf die n-Seite.',
                    },
                    {
                      t: 'n:m-Beziehung',
                      d: 'Erzeugt eine eigene Zwischentabelle mit den Primärschlüsseln beider beteiligter Entitäten als zusammengesetzten Primär- und Fremdschlüssel.',
                    },
                    {
                      t: 'Schwache Entität',
                      d: 'Übernimmt den Primärschlüssel der identifizierenden starken Entität als Teil ihres zusammengesetzten Primärschlüssels.',
                    },
                    {
                      t: 'Mehrwertige & Abgeleitete Attribute',
                      d: 'Mehrwertige Attribute erhalten eine eigene Relation (Entitäts-PK, Attribut). Abgeleitete Attribute werden im Relationenmodell standardmäßig ausgelassen.',
                    },
                  ]
                : [
                    {
                      t: '1:n Relationship',
                      d: 'The primary key of the 1-side is added as a foreign key (↑) to the n-side table, along with any relationship attributes.',
                    },
                    {
                      t: 'n:m Relationship',
                      d: 'Creates a dedicated junction table whose composite primary key combines the primary keys of both participating entities.',
                    },
                    {
                      t: 'Weak Entity',
                      d: 'Inherits the primary key of its identifying strong entity as part of a composite primary key.',
                    },
                    {
                      t: 'Multivalued & Derived Attributes',
                      d: 'Multivalued attributes produce their own table (Entity_PK, attribute). Derived attributes are omitted by default.',
                    },
                  ]
              ).map((rule) => (
                <div
                  key={rule.t}
                  className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1"
                >
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">{rule.t}</h2>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{rule.d}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50 dark:bg-slate-950 font-mono text-xs space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  {isDe ? 'Abgeleitetes Relationenmodell (Live)' : 'Derived Relational Model (Live)'}
                </div>
                {relationalTables.map((table) => (
                  <div key={table.name} className="text-slate-800 dark:text-slate-200">
                    <span className="font-bold text-blue-700 dark:text-blue-400">{table.name}</span>
                    {' ('}
                    {table.columns.map((c, i) => (
                      <React.Fragment key={`${table.name}-${c.name}-${i}`}>
                        {i > 0 && ', '}
                        <span className={c.isPrimaryKey ? 'underline font-semibold' : ''}>
                          {c.isForeignKey ? `↑${c.name}` : c.name}
                        </span>
                      </React.Fragment>
                    ))}
                    {')'}
                  </div>
                ))}
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-950 text-slate-100 overflow-x-auto">
                <div className="text-xs font-mono text-slate-400 mb-2">SQL CREATE TABLE (Live)</div>
                <pre className="text-xs font-mono leading-relaxed whitespace-pre">
                  {generatedSql}
                </pre>
              </div>
            </div>
          </article>
        )}

        {route === '/yed-alternative' && (
          <article className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono text-blue-700 dark:text-blue-400">
                YED ALTERNATIVE
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {isDe
                  ? 'Die moderne yEd Alternative für ER-Diagramme — direkt im Browser'
                  : 'The Modern yEd Alternative for ER Diagrams — Right in Your Browser'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                {isDe
                  ? 'Während yEd ein allgemeines Diagramm-Werkzeug mit Java-Desktop-Client ist, wurde ERM-Editor gezielt für Entity-Relationship-Modelle entwickelt — inklusive Chen- & Min-Max-Notation, Live-Relationenmodell und SQL-Generierung.'
                  : 'While yEd is a general-purpose desktop diagramming tool, ERM-Editor is built specifically for Entity-Relationship modeling — complete with Chen & Min-Max notation, live relational schema derivation, and SQL generation.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              {(isDe
                ? [
                    'Keine Java-Installation und kein Account erforderlich',
                    'Läuft direkt im Browser sowie nativ unter macOS & Windows',
                    '1-Klick-Toggles für PK, FK, Mehrwertig, Abgeleitet & Schwache Entität',
                    'Automatisches Relationenmodell & SQL CREATE TABLE in Echtzeit',
                    'Attribut-Auto-Layout & exakte Kantenanker auf Rauten/Ellipsen',
                    '1-Klick-Screenshot (2x PNG), verlustfreies SVG & PDF-Druck',
                  ]
                : [
                    'No Java runtime and no sign-up required',
                    'Runs directly in your browser and natively on macOS & Windows',
                    '1-click toggles for PK, FK, Multivalued, Derived & Weak Entity',
                    'Real-time Relational Model & SQL CREATE TABLE derivation',
                    'Attribute auto-layout & exact border anchors on diamonds/ellipses',
                    '1-click 2x PNG screenshot, lossless SVG & PDF print preview',
                  ]
              ).map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-2.5 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                >
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{point}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onLaunchEditor}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isDe ? 'Editor im Browser öffnen →' : 'Open Editor in Browser →'}
              </button>
              <button
                type="button"
                onClick={() => setDownloadModal('mac')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                macOS (.dmg)
              </button>
              <button
                type="button"
                onClick={() => setDownloadModal('windows')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Windows (.exe)
              </button>
            </div>
          </article>
        )}

        {route === '/faq' && (
          <article className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-blue-700 dark:text-blue-400">
                FAQ &amp; {isDe ? 'HILFE' : 'HELP'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {isDe ? 'Häufige Fragen zu ERM-Editor' : 'Frequently Asked Questions — ERM-Editor'}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              {(isDe
                ? [
                    {
                      q: 'Wie speichere ich mein ER-Diagramm?',
                      a: 'Über Datei → Speichern (Strg/Cmd+S) speicherst du dein Diagramm als .erm-Datei. In modernen Chromium-Browsern überschreibt Strg/Cmd+S direkt die geöffnete Datei.',
                    },
                    {
                      q: 'Kann ich zwischen Chen und Min-Max wechseln?',
                      a: 'Ja. In der Toolbar und unter Ansicht kannst du jederzeit zwischen Chen-Notation (1, n, m, c, cn) und Min-Max-Notation ((0,1), (1,1), (0,n), (1,n), (0,*)) umschalten.',
                    },
                    {
                      q: 'Wie mache ich einen Screenshot für meine Abgabe?',
                      a: 'Klicke in der Toolbar auf „Screenshot“ — das komplette ER-Diagramm wird automatisch als gestochen scharfes 2x-PNG in die Zwischenablage kopiert.',
                    },
                    {
                      q: 'Wie funktioniert das Attribut-Auto-Layout?',
                      a: 'Wähle eine Entität oder Beziehung aus und klicke auf „Auto-Layout“ — alle direkt verbundenen Attribute werden automatisch kreisförmig und überschneidungsfrei angeordnet.',
                    },
                    {
                      q: 'Welche Verbindungen sind im ERM erlaubt?',
                      a: 'ERM-Editor prüft Verbindungen automatisch: Entität ↔ Beziehung, Entität ↔ Attribut und Beziehung ↔ Attribut sind erlaubt; direkte Entität ↔ Entität-Verbindungen werden verhindert.',
                    },
                    {
                      q: 'Werden meine Daten an einen Server gesendet?',
                      a: 'Nein. Alles läuft zu 100 % lokal im Browser bzw. in der nativen Desktop-App. Keine Cloud-Pflicht, kein Tracking.',
                    },
                  ]
                : [
                    {
                      q: 'How do I save my ER diagram?',
                      a: 'Use File → Save (Ctrl/Cmd+S) to save your diagram as an .erm file. In Chromium browsers, Ctrl/Cmd+S overwrites the opened file directly.',
                    },
                    {
                      q: 'Can I switch between Chen and Min-Max notation?',
                      a: 'Yes. Use the toolbar or View menu to switch between Chen (1, n, m, c, cn) and Min-Max ((0,1), (1,1), (0,n), (1,n), (0,*)) at any time.',
                    },
                    {
                      q: 'How do I take a screenshot for documentation?',
                      a: 'Click "Screenshot" in the toolbar to copy the entire ER diagram as a crisp 2x PNG directly to your clipboard.',
                    },
                    {
                      q: 'How does Attribute Auto-Layout work?',
                      a: 'Select an entity or relationship and click "Auto-Layout" — all directly connected attributes are arranged cleanly around it without overlapping.',
                    },
                    {
                      q: 'Which connections are allowed?',
                      a: 'ERM-Editor validates connections automatically: Entity ↔ Relationship, Entity ↔ Attribute, and Relationship ↔ Attribute are permitted.',
                    },
                    {
                      q: 'Are my diagrams sent to any server?',
                      a: 'No. Everything runs 100% locally in your browser or native desktop app. Zero tracking, no cloud lock-in.',
                    },
                  ]
              ).map((item) => (
                <div
                  key={item.q}
                  className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5"
                >
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">{item.q}</h2>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </article>
        )}
      </main>

      <footer className="border-t border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 mt-6">
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
              className="hover:text-slate-900 dark:hover:text-white"
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
