import React, { useEffect, useState } from 'react';
import {
  Apple,
  Download,
  HelpCircle,
  Info,
  Keyboard,
  Layers,
  Monitor,
  Scale,
  X,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { useTranslation } from '../store/i18n';
import { DownloadNoticeModal, type DownloadPlatform } from './DownloadNoticeModal';

export type HelpTab = 'legend' | 'shortcuts' | 'download' | 'about' | 'imprint';

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: HelpTab;
}

const CHEN_LEGEND_ITEMS = [
  {
    id: 'entity',
    de: 'Entität',
    en: 'Entity',
    descDe: 'Rechteck für eigenständige Objekte (z. B. Schüler, Kunde, Artikel).',
    descEn: 'Rectangle for independent objects (e.g. Student, Customer, Article).',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <rect x="12" y="12" width="96" height="32" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="60" y="32" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">
          Kunde
        </text>
      </svg>
    ),
  },
  {
    id: 'weak-entity',
    de: 'Schwache Entität',
    en: 'Weak Entity',
    descDe: 'Doppeltes Rechteck: Existenz hängt von einer starken Entität ab.',
    descEn: 'Double rectangle: existence depends on a strong owner entity.',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <rect x="10" y="10" width="100" height="36" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="15" y="15" width="90" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <text x="60" y="32" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="currentColor">
          Position
        </text>
      </svg>
    ),
  },
  {
    id: 'relationship',
    de: 'Beziehung',
    en: 'Relationship',
    descDe: 'Raute zwischen Entitäten (z. B. bestellt, besucht, enthält).',
    descEn: 'Diamond connecting entities (e.g. orders, attends, contains).',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <polygon points="60,6 110,28 60,50 10,28" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="60" y="32" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="currentColor">
          bestellt
        </text>
      </svg>
    ),
  },
  {
    id: 'identifying',
    de: 'Identifizierende Beziehung',
    en: 'Identifying Relationship',
    descDe: 'Doppelte Raute: verknüpft eine schwache Entität mit ihrem Eigentümer.',
    descEn: 'Double diamond: connects a weak entity to its identifying owner.',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <polygon points="60,5 112,28 60,51 8,28" fill="none" stroke="currentColor" strokeWidth="2" />
        <polygon points="60,11 102,28 60,45 18,28" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <text x="60" y="31.5" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor">
          enthält
        </text>
      </svg>
    ),
  },
  {
    id: 'attribute',
    de: 'Attribut & Primärschlüssel (PK)',
    en: 'Attribute & Primary Key (PK)',
    descDe: 'Ellipse für Eigenschaften; Primärschlüssel wird durchgehend unterstrichen.',
    descEn: 'Oval for properties; primary key is underlined with a solid line.',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <ellipse cx="60" cy="28" rx="48" ry="18" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="60" y="31" textAnchor="middle" fontSize="11" fontWeight="600" textDecoration="underline" fill="currentColor">
          KundenNr
        </text>
      </svg>
    ),
  },
  {
    id: 'multivalued',
    de: 'Mehrwertiges Attribut',
    en: 'Multivalued Attribute',
    descDe: 'Doppelte Ellipse: kann mehrere Werte pro Entität speichern (z. B. Telefon).',
    descEn: 'Double oval: can hold multiple values per entity (e.g. Phone).',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <ellipse cx="60" cy="28" rx="50" ry="20" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="60" cy="28" rx="44" ry="15" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <text x="60" y="31.5" textAnchor="middle" fontSize="10.5" fill="currentColor">
          Telefon
        </text>
      </svg>
    ),
  },
  {
    id: 'derived',
    de: 'Abgeleitetes Attribut',
    en: 'Derived Attribute',
    descDe: 'Gestrichelte Ellipse: wird aus anderen Attributen berechnet (z. B. Alter).',
    descEn: 'Dashed oval: computed from other attributes (e.g. Age).',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <ellipse
          cx="60"
          cy="28"
          rx="46"
          ry="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
        <text x="60" y="31.5" textAnchor="middle" fontSize="10.5" fill="currentColor">
          Alter
        </text>
      </svg>
    ),
  },
  {
    id: 'fk',
    de: 'Fremdschlüssel (FK)',
    en: 'Foreign Key (FK)',
    descDe: 'Gestrichelt unterstrichenes Attribut (z. B. Teilschlüssel schwacher Entitäten).',
    descEn: 'Dashed-underlined attribute (e.g. partial key / foreign key reference).',
    svg: (
      <svg viewBox="0 0 120 56" className="w-28 h-14">
        <ellipse cx="60" cy="28" rx="48" ry="18" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="60" y="30" textAnchor="middle" fontSize="10.5" fill="currentColor">
          PosNr
        </text>
        <line x1="38" y1="34" x2="82" y2="34" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2" />
      </svg>
    ),
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'legend',
}) => {
  const theme = useEditorStore((s) => s.appSettings.theme);
  const { t, language } = useTranslation();
  const isDe = language === 'de';

  const [tab, setTab] = useState<HelpTab>(initialTab);
  const [downloadModal, setDownloadModal] = useState<DownloadPlatform | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const shortcutRows: Array<{ keys: string; label: string }> = [
    { keys: 'V / E / R / A / C', label: isDe ? 'Werkzeug: Auswählen / Entität / Beziehung / Attribut / Verbinden' : 'Tool: Select / Entity / Relationship / Attribute / Connect' },
    { keys: 'Ctrl / Cmd + S', label: t('help.shortcutSave') },
    { keys: 'Ctrl / Cmd + Z', label: t('help.shortcutUndo') },
    { keys: 'Ctrl / Cmd + Shift + Z', label: t('help.shortcutRedo') },
    { keys: 'Ctrl / Cmd + C / X / V', label: `${t('help.shortcutCopy')} / ${t('help.shortcutCut')} / ${t('help.shortcutPaste')}` },
    { keys: 'Ctrl / Cmd + A', label: t('help.shortcutSelectAll') },
    { keys: 'Delete / Backspace', label: t('help.shortcutDelete') },
    { keys: 'Double-Click / F2', label: t('help.shortcutEdit') },
    { keys: 'Ctrl / Cmd + Wheel', label: t('help.shortcutZoom') },
    { keys: 'Space + Drag', label: t('help.shortcutPan') },
    { keys: 'Esc', label: isDe ? 'Auswahl / Werkzeug zurücksetzen' : 'Clear selection / reset tool' },
  ];

  const panelBg = isDark
    ? 'bg-slate-900 text-slate-100 border-slate-700'
    : 'bg-white text-slate-900 border-slate-200';
  const tabActive = isDark
    ? 'border-blue-500 text-blue-400 bg-slate-800/60'
    : 'border-blue-600 text-blue-600 bg-blue-50/60';
  const tabInactive = isDark
    ? 'border-transparent text-slate-400 hover:text-slate-200'
    : 'border-transparent text-slate-500 hover:text-slate-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${panelBg}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('help.title')}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-base font-semibold">{t('app.name')} — {t('help.title')}</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('app.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            aria-label={t('settings.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className={`flex flex-wrap border-b px-5 gap-1 ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <button
            type="button"
            onClick={() => setTab('legend')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              tab === 'legend' ? tabActive : tabInactive
            }`}
          >
            <Layers className="w-4 h-4" />
            {t('help.tabLegend')}
          </button>
          <button
            type="button"
            onClick={() => setTab('shortcuts')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              tab === 'shortcuts' ? tabActive : tabInactive
            }`}
          >
            <Keyboard className="w-4 h-4" />
            {t('help.tabShortcuts')}
          </button>
          <button
            type="button"
            onClick={() => setTab('download')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              tab === 'download' ? tabActive : tabInactive
            }`}
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            type="button"
            onClick={() => setTab('about')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              tab === 'about' ? tabActive : tabInactive
            }`}
          >
            <Info className="w-4 h-4" />
            {t('help.tabAbout')}
          </button>
          <button
            type="button"
            onClick={() => setTab('imprint')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              tab === 'imprint' ? tabActive : tabInactive
            }`}
          >
            <Scale className="w-4 h-4" />
            {t('help.tabImprint')}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'legend' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHEN_LEGEND_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="shrink-0 text-blue-600 dark:text-blue-400">{item.svg}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{isDe ? item.de : item.en}</div>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isDe ? item.descDe : item.descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'shortcuts' && (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border rounded-xl border-slate-200 dark:border-slate-800 overflow-hidden">
              {shortcutRows.map((row) => (
                <div
                  key={row.keys}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs sm:text-sm"
                >
                  <span>{row.label}</span>
                  <kbd
                    className={`px-2 py-1 rounded font-mono text-xs shrink-0 border ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    {row.keys}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {tab === 'download' && (
            <div className="space-y-4">
              <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {isDe
                  ? 'ERM-Editor ist als native Desktop-App für macOS und Windows verfügbar — kostenlos, offlinefähig und ohne Registrierung.'
                  : 'ERM-Editor is available as a native desktop app for macOS and Windows — free, offline-ready, and without registration.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                    isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 text-white dark:bg-slate-700 shrink-0">
                      <Apple className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">macOS (Apple Silicon &amp; Intel)</h3>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Universal DMG · v1.0.0
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDownloadModal('mac')}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    macOS (.dmg)
                  </button>
                </div>

                <div
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                    isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Windows (64-Bit)</h3>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        EXE-Installer (NSIS) · v1.0.0
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDownloadModal('windows')}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Windows (.exe)
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="space-y-4 text-sm leading-relaxed">
              <div
                className={`rounded-xl border p-4 space-y-2 ${
                  isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <h3 className="font-semibold text-base">ERM-Editor (v1.0.0)</h3>
                <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  {t('help.aboutDescription')}
                </p>
              </div>
              <div
                className={`rounded-xl border p-4 space-y-1.5 text-xs ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  {isDe ? 'Datenschutz & lokale Verarbeitung' : 'Privacy & Local Processing'}
                </h4>
                <p>
                  {isDe
                    ? 'ERM-Editor verarbeitet alle Diagramme, Dateien und Einstellungen ausschließlich lokal in Ihrem Browser bzw. auf Ihrem Gerät. Es findet keine Übertragung an externe Server statt.'
                    : 'ERM-Editor processes all diagrams, files, and settings exclusively locally in your browser or on your device. No data is transmitted to external servers.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'imprint' && (
            <div className="space-y-4 text-sm leading-relaxed">
              <div
                className={`rounded-xl border p-4 space-y-2 ${
                  isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <h3 className="font-semibold text-base">Impressum</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Angaben gemäß § 5 DDG / § 18 Abs. 2 MStV
                </p>
                <div className="pt-1 space-y-1">
                  <p className="font-medium">Eren Kazokoglu</p>
                  <p>Wiesach 13</p>
                  <p>73230 Kirchheim unter Teck</p>
                </div>
                <div className="pt-2 space-y-1">
                  <p>
                    <span className="font-medium">E-Mail:</span>{' '}
                    <a
                      href="mailto:info@best-tools.app"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      info@best-tools.app
                    </a>
                  </p>
                </div>
                <div className="pt-2 text-xs opacity-85 space-y-1">
                  <p>
                    Eren Kazokoglu, Wiesach 13, 73230 Kirchheim unter Teck, E-Mail: info@best-tools.app (§ 5 DDG / § 18 Abs. 2 MStV)
                  </p>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 space-y-1.5 text-xs ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  Hinweis zu Datenschutz &amp; lokaler Verarbeitung
                </h4>
                <p>
                  ERM-Editor verarbeitet alle ER-Diagramme, Dateien und Einstellungen
                  ausschließlich lokal in Ihrem Browser bzw. auf Ihrem Gerät. Es findet
                  keine Übertragung an externe Server statt, alle Schriftarten sind lokal
                  eingebunden und es werden keine Tracking-Cookies eingesetzt.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex justify-end px-5 py-3.5 border-t ${
            isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {t('settings.close')}
          </button>
        </div>
      </div>

      <DownloadNoticeModal
        platform={downloadModal}
        onClose={() => setDownloadModal(null)}
        language={language}
      />
    </div>
  );
};
