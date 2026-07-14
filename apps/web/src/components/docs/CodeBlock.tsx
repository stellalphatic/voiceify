/**
 * CodeBlock.tsx — Shiki syntax highlighter, theme-aware (dark/light).
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { useTheme } from '@/context/ThemeContext';

type CodeBlockProps = {
  code: string;
  language: string;
  filename?: string;
};

const SUPPORTED = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'json',
  'bash',
  'python',
  'html',
  'css',
] as const;
type SupportedLang = (typeof SUPPORTED)[number];

type ShikiTheme = 'github-dark' | 'github-light';

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import('@shikijs/themes/github-dark'), import('@shikijs/themes/github-light')],
      langs: [
        import('@shikijs/langs/typescript'),
        import('@shikijs/langs/javascript'),
        import('@shikijs/langs/tsx'),
        import('@shikijs/langs/jsx'),
        import('@shikijs/langs/json'),
        import('@shikijs/langs/bash'),
        import('@shikijs/langs/python'),
        import('@shikijs/langs/html'),
        import('@shikijs/langs/css'),
      ],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    });
  }
  return highlighterPromise;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeLang(lang: string): SupportedLang {
  const lower = (lang || '').toLowerCase();
  const aliases: Record<string, SupportedLang> = {
    ts: 'typescript',
    js: 'javascript',
    sh: 'bash',
    shell: 'bash',
    py: 'python',
    yml: 'json',
    yaml: 'json',
  };
  const mapped = aliases[lower] ?? (lower as SupportedLang);
  return (SUPPORTED as readonly string[]).includes(mapped) ? mapped : 'typescript';
}

export default function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const { theme } = useTheme();
  const shikiTheme: ShikiTheme = theme === 'light' ? 'github-light' : 'github-dark';
  const [highlighted, setHighlighted] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const lang = normalizeLang(language);

    getHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        try {
          const html = highlighter.codeToHtml(code, { lang, theme: shikiTheme });
          if (!cancelled) setHighlighted(html);
        } catch {
          if (!cancelled) {
            setHighlighted(
              `<pre class="shiki" style="margin:0;padding:16px 18px"><code>${escapeHtml(code)}</code></pre>`,
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHighlighted(`<pre style="margin:0;padding:16px 18px">${escapeHtml(code)}</pre>`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, language, shikiTheme]);

  const rendered = useMemo(
    () =>
      highlighted.replace(/<pre class="shiki/g, '<pre class="shiki docs-shiki-pre" style="margin:0;"'),
    [highlighted],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="docs-code-block">
      <div className="docs-code-block__header">
        <div className="docs-code-block__meta">
          {filename ? <span className="docs-code-block__filename">{filename}</span> : null}
          <span className="docs-code-block__lang">{language}</span>
        </div>
        <button
          type="button"
          className="docs-code-block__copy"
          aria-label="Copy code to clipboard"
          onClick={handleCopy}
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        </button>
      </div>

      <div
        className="docs-code-block__body"
        dangerouslySetInnerHTML={{
          __html:
            rendered ||
            `<pre style="margin:0;padding:16px 18px;color:var(--color-text-primary)">${escapeHtml(code)}</pre>`,
        }}
      />
    </div>
  );
}
