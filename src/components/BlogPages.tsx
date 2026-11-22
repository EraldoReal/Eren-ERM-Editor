import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Code2,
  Database,
  Play,
  Table2,
} from 'lucide-react';
import { BLOG_POSTS, getBlogPostBySlug, type BlogPost } from '../data/blogPosts.ts';
import { getBlogExampleDocument } from '../data/blogExamples.ts';
import { deriveRelationalModel } from '../engine/relationalModel.ts';
import { generateSqlFromRelationalModel } from '../engine/sqlGenerator.ts';
import { renderErmToSvgString } from '../engine/svgExport.ts';
import { useEditorStore } from '../store/editorStore.ts';

export interface BlogPageProps {
  onLaunchEditor: () => void;
  onNavigate: (path: string) => void;
  onOpenImprint: () => void;
}

export interface BlogPostPageProps extends BlogPageProps {
  slug: string;
}

const CATEGORY_LABELS: Record<
  BlogPost['category'] | 'all',
  { de: string; en: string }
> = {
  all: { de: 'Alle (50)', en: 'All (50)' },
  comparison: { de: 'Vergleiche & Alternativen', en: 'Comparisons & Alternatives' },
  tutorial: { de: 'Notation & Funktionen', en: 'Notation & Features' },
  sql: { de: 'Relationenmodell & SQL', en: 'Relational Model & SQL' },
  abitur: { de: 'Schule & Abitur', en: 'School & Exams' },
  usecase: { de: 'Praxis-Beispiele', en: 'Examples' },
};

function setMetaDescription(content: string): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

const BlogHeader: React.FC<{
  isDe: boolean;
  onToggleLang: () => void;
  onNavigate: (path: string) => void;
  onLaunchEditor: () => void;
}> = ({ isDe, onToggleLang, onNavigate, onLaunchEditor }) => (
  <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
        >
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>ERM-Editor</span>
        </a>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <a
          href="/blog"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/blog');
          }}
          className="text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
        >
          Blog
        </a>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleLang}
          className="px-2.5 py-1 rounded-md text-xs font-mono border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          {isDe ? 'DE | EN' : 'EN | DE'}
        </button>
        <button
          type="button"
          onClick={onLaunchEditor}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
        >
          <span>{isDe ? 'Editor öffnen' : 'Open Editor'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </header>
);

export const BlogIndexPage: React.FC<BlogPageProps> = ({
  onLaunchEditor,
  onNavigate,
  onOpenImprint,
}) => {
  const language = useEditorStore((s) => s.appSettings.language);
  const updateAppSettings = useEditorStore((s) => s.updateAppSettings);
  const isDe = language === 'de';

  const [category, setCategory] = useState<BlogPost['category'] | 'all'>('all');

  useEffect(() => {
    document.title = isDe
      ? 'Blog & Ratgeber (50 Artikel) — ERM-Editor (Chen & Min-Max)'
      : 'Blog & Guides (50 Articles) — ERM-Editor (Chen & Min-Max)';
    setMetaDescription(
      isDe
        ? '50 Fachartikel, Vergleiche (yEd, Draw.io, Lucidchart, Mermaid) und interaktive ERM-Beispiele für Schule, Abitur und Datenbankdesign.'
        : '50 guides, tool comparisons (yEd, Draw.io, Lucidchart, Mermaid), and interactive ERM examples for students and database engineers.',
    );
  }, [isDe]);

  const filteredPosts = useMemo(() => {
    if (category === 'all') return BLOG_POSTS;
    return BLOG_POSTS.filter((p) => p.category === category);
  }, [category]);

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <BlogHeader
        isDe={isDe}
        onToggleLang={() => updateAppSettings({ language: isDe ? 'en' : 'de' })}
        onNavigate={onNavigate}
        onLaunchEditor={onLaunchEditor}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-700 dark:text-blue-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isDe ? 'ERM-Wissensarchiv · 50 Beiträge' : 'ERM Knowledge Base · 50 Articles'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isDe
              ? 'ERM-Editor Blog: Chen-Notation, Alternativen & Praxisbeispiele'
              : 'ERM-Editor Blog: Chen Notation, Alternatives & Live Examples'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            {isDe
              ? 'Alle Artikel auf Deutsch und Englisch — jeweils mit interaktivem ERM-Beispiel, das du mit einem Klick direkt im Editor öffnen kannst.'
              : 'All articles in German and English — each with an interactive ERM example you can open directly in the editor.'}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as (BlogPost['category'] | 'all')[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                category === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isDe ? CATEGORY_LABELS[cat].de : CATEGORY_LABELS[cat].en}
            </button>
          ))}
        </div>

        {/* Post List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => {
            const loc = isDe ? post.de : post.en;
            return (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/blog/${post.slug}`);
                }}
                className="group p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                    <span>#{String(post.index).padStart(2, '0')}</span>
                    <span>{isDe ? CATEGORY_LABELS[post.category].de : CATEGORY_LABELS[post.category].en}</span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {loc.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {loc.metaDescription}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-blue-600 dark:text-blue-400 pt-1">
                  <span>{isDe ? 'Artikel & Beispiel lesen' : 'Read article & example'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>ERM-Editor · Blog</span>
          <div className="flex items-center gap-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="hover:underline"
            >
              {isDe ? 'Startseite' : 'Home'}
            </a>
            <button type="button" onClick={onOpenImprint} className="hover:underline cursor-pointer">
              {isDe ? 'Impressum & Datenschutz' : 'Imprint & Privacy'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const BlogPostPage: React.FC<BlogPostPageProps> = ({
  slug,
  onLaunchEditor,
  onNavigate,
  onOpenImprint,
}) => {
  const language = useEditorStore((s) => s.appSettings.language);
  const updateAppSettings = useEditorStore((s) => s.updateAppSettings);
  const loadDocumentInTab = useEditorStore((s) => s.loadDocumentInTab);
  const showToast = useEditorStore((s) => s.showToast);
  const theme = useEditorStore((s) => s.appSettings.theme);
  const isDe = language === 'de';
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const post = getBlogPostBySlug(slug);
  const [previewTab, setPreviewTab] = useState<'erm' | 'relational' | 'sql'>('erm');

  useEffect(() => {
    if (!post) return;
    const loc = isDe ? post.de : post.en;
    document.title = `${loc.title} — ERM-Editor Blog`;
    setMetaDescription(loc.metaDescription);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [post, isDe]);

  const exampleDoc = useMemo(
    () => (post ? getBlogExampleDocument(post.exampleKey, language) : null),
    [post, language],
  );

  const svgMarkup = useMemo(
    () => (exampleDoc ? renderErmToSvgString(exampleDoc, { darkMode: isDark, padding: 24 }) : ''),
    [exampleDoc, isDark],
  );

  const tables = useMemo(
    () => (exampleDoc ? deriveRelationalModel(exampleDoc) : []),
    [exampleDoc],
  );

  const sqlDdl = useMemo(
    () => (tables.length > 0 ? generateSqlFromRelationalModel(tables) : ''),
    [tables],
  );

  if (!post || !exampleDoc) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <BlogHeader
          isDe={isDe}
          onToggleLang={() => updateAppSettings({ language: isDe ? 'en' : 'de' })}
          onNavigate={onNavigate}
          onLaunchEditor={onLaunchEditor}
        />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-xl font-bold">
            {isDe ? 'Blog-Beitrag nicht gefunden' : 'Blog post not found'}
          </h1>
          <button
            type="button"
            onClick={() => onNavigate('/blog')}
            className="px-4 py-2 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            {isDe ? '← Zurück zur Blog-Übersicht' : '← Back to Blog Index'}
          </button>
        </main>
      </div>
    );
  }

  const loc = isDe ? post.de : post.en;
  const currentIdx = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIdx > 0 ? BLOG_POSTS[currentIdx - 1] : null;
  const nextPost = currentIdx >= 0 && currentIdx < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIdx + 1] : null;

  const handleOpenExampleInEditor = () => {
    loadDocumentInTab(exampleDoc, { filePath: null, fileHandle: null });
    showToast(
      isDe
        ? `Beispiel im Editor geöffnet: ${exampleDoc.name}`
        : `Opened example in editor: ${exampleDoc.name}`,
      'success',
    );
    onLaunchEditor();
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <BlogHeader
        isDe={isDe}
        onToggleLang={() => updateAppSettings({ language: isDe ? 'en' : 'de' })}
        onNavigate={onNavigate}
        onLaunchEditor={onLaunchEditor}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <article className="space-y-6">
          {/* Meta & Breadcrumb */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <a
                href="/blog"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/blog');
                }}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                ← {isDe ? 'Alle 50 Beiträge' : 'All 50 Posts'}
              </a>
              <span>·</span>
              <span>#{String(post.index).padStart(2, '0')} / 50</span>
              <span>·</span>
              <span>{isDe ? CATEGORY_LABELS[post.category].de : CATEGORY_LABELS[post.category].en}</span>
              <span>·</span>
              <span>{post.publishedAt}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {loc.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {loc.intro}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {loc.keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Example Box */}
          <section className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab('erm')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                    previewTab === 'erm'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>ERM (Chen)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('relational')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                    previewTab === 'relational'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>{isDe ? 'Relationenmodell' : 'Relational Model'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('sql')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                    previewTab === 'sql'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>SQL</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenExampleInEditor}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {isDe ? 'Dieses Beispiel im Editor öffnen →' : 'Open This Example in Editor →'}
                </span>
              </button>
            </div>

            <div className="p-4">
              {previewTab === 'erm' && (
                <div
                  className="w-full overflow-x-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              )}

              {previewTab === 'relational' && (
                <div className="space-y-2 font-mono text-xs">
                  {tables.map((tbl) => (
                    <div
                      key={tbl.name}
                      className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">{tbl.name}</span>
                      <span>(</span>
                      {tbl.columns.map((col, i) => (
                        <React.Fragment key={`${tbl.name}-${col.name}`}>
                          {i > 0 && ', '}
                          <span
                            className={
                              col.isPrimaryKey
                                ? 'underline decoration-2 underline-offset-2 font-semibold text-blue-700 dark:text-blue-300'
                                : col.isForeignKey
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : ''
                            }
                          >
                            {col.isForeignKey ? `↑${col.name}` : col.name}
                          </span>
                        </React.Fragment>
                      ))}
                      <span>)</span>
                    </div>
                  ))}
                </div>
              )}

              {previewTab === 'sql' && (
                <pre className="p-3 rounded bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                  {sqlDdl}
                </pre>
              )}
            </div>
          </section>

          {/* Article Body Sections */}
          <div className="space-y-5">
            {loc.sections.map((sec) => (
              <section key={sec.heading} className="space-y-1.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{sec.heading}</h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {sec.body}
                </p>
              </section>
            ))}

            <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-sm text-blue-950 dark:text-blue-100">
              <strong>{isDe ? 'Fazit:' : 'Takeaway:'}</strong> {loc.takeaway}
            </div>
          </div>
        </article>

        {/* Previous / Next Post Navigation */}
        <nav
          aria-label={isDe ? 'Beitragsnavigation' : 'Post navigation'}
          className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {prevPost ? (
            <a
              href={`/blog/${prevPost.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(`/blog/${prevPost.slug}`);
              }}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 transition-colors flex flex-col gap-1"
            >
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <ArrowLeft className="w-3 h-3" />
                {isDe ? 'Vorheriger Beitrag' : 'Previous Post'} (#{prevPost.index})
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                {isDe ? prevPost.de.title : prevPost.en.title}
              </span>
            </a>
          ) : (
            <div />
          )}

          {nextPost ? (
            <a
              href={`/blog/${nextPost.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(`/blog/${nextPost.slug}`);
              }}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 transition-colors flex flex-col items-end text-right gap-1"
            >
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                {isDe ? 'Nächster Beitrag' : 'Next Post'} (#{nextPost.index})
                <ArrowRight className="w-3 h-3" />
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                {isDe ? nextPost.de.title : nextPost.en.title}
              </span>
            </a>
          ) : (
            <div />
          )}
        </nav>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>ERM-Editor · Blog</span>
          <div className="flex items-center gap-4">
            <a
              href="/blog"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/blog');
              }}
              className="hover:underline"
            >
              {isDe ? 'Alle Beiträge' : 'All Posts'}
            </a>
            <button type="button" onClick={onOpenImprint} className="hover:underline cursor-pointer">
              {isDe ? 'Impressum & Datenschutz' : 'Imprint & Privacy'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
