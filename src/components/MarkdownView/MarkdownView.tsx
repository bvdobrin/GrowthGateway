import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './MarkdownView.module.css';

const SAFE_URL = /^(https?:\/\/|\/|#|mailto:)/i;

/** Inline Markdown: **bold**, *italic*, _italic_, `code` and [links](url). Never renders raw HTML. */
function inline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const k = `${key}-${i++}`;
    if (token.startsWith('**')) nodes.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) nodes.push(<code key={k}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('[')) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      if (url?.startsWith('/')) nodes.push(<Link key={k} to={url}>{label}</Link>);
      else if (url && SAFE_URL.test(url)) nodes.push(<a key={k} href={url} target="_blank" rel="noreferrer noopener">{label}</a>);
      else nodes.push(label ?? token);
    } else nodes.push(<em key={k}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const withBreaks = (lines: string[], key: string) =>
  lines.map((line, i) => (
    <Fragment key={`${key}-${i}`}>
      {i > 0 && <br />}
      {inline(line, `${key}-${i}`)}
    </Fragment>
  ));

export function MarkdownView({ source, compact = false }: { source: string; compact?: boolean }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let n = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${n++}`;
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + (compact ? 2 : 1), 6);
      const Tag = `h${level}` as 'h2';
      blocks.push(<Tag key={key}>{inline(heading[2], key)}</Tag>);
      i += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key} />);
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[][] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) items[items.length - 1].push(lines[i].trim());
        else items.push([lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '').replace(/^\[ \]\s*/, '☐ ').replace(/^\[x\]\s*/i, '☑ ')]);
        i += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={key}>
          {items.map((item, j) => (
            <li key={j}>{withBreaks(item, `${key}-${j}`)}</li>
          ))}
        </List>,
      );
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key}>{withBreaks(quote, key)}</blockquote>);
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|-{3,}$)/.test(lines[i])) paragraph.push(lines[i++]);
    blocks.push(<p key={key}>{withBreaks(paragraph, key)}</p>);
  }

  return <div className={`${styles.prose} ${compact ? styles.compact : ''}`}>{blocks}</div>;
}
