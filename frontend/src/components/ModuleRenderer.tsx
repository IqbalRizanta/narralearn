import { useMemo } from "react";
import katex from "katex";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import type {
  ContentBlock,
  ModuleContent,
  SourceCitation,
} from "../lib/types";
import { cn } from "../lib/utils";

const MARKDOWN_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeSanitize];

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
      {children}
    </ReactMarkdown>
  );
}

export function CitationRefs({
  refs,
  citations,
  className,
}: {
  refs: string[];
  citations: SourceCitation[];
  className?: string;
}) {
  if (!refs.length) return null;
  const indexById = new Map(
    citations.map((citation, index) => [citation.id, index]),
  );
  const valid = refs
    .map((ref) => ({
      ref,
      index: indexById.get(ref),
      citation: citations.find((citation) => citation.id === ref),
    }))
    .filter((entry) => entry.index !== undefined && entry.citation);

  if (!valid.length) return null;
  return (
    <span className={cn("citation-refs", className)}>
      {valid.map((entry) => (
        <a
          key={entry.ref}
          href={`#cite-${entry.index}`}
          className="citation-ref"
          title={entry.citation?.label}
          aria-label={`Sumber: ${entry.citation?.label}`}
        >
          {String((entry.index ?? 0) + 1).padStart(2, "0")}
        </a>
      ))}
    </span>
  );
}

function Block({
  block,
  citations,
}: {
  block: ContentBlock;
  citations: SourceCitation[];
}) {
  const refs = <CitationRefs refs={block.source_refs} citations={citations} />;
  const body = block.text ?? "";

  if (block.type === "callout") {
    return (
      <aside className="callout">
        <span className="callout-kicker">Catatan penting</span>
        <h3>{block.title}</h3>
        <div className="prose">
          <Markdown>{body}</Markdown>
        </div>
        {refs}
      </aside>
    );
  }

  if (block.type === "formula") {
    const html = katex.renderToString(block.latex ?? "", {
      throwOnError: false,
      displayMode: true,
      output: "html",
    });
    return (
      <figure className="formula-block">
        <span className="formula-kicker">Rumus</span>
        <div className="formula-expression" dangerouslySetInnerHTML={{ __html: html }} />
        {block.explanation && <figcaption>{block.explanation}</figcaption>}
        {refs}
      </figure>
    );
  }

  if (block.type === "example") {
    return (
      <div className="example-block">
        <div className="example-head">
          <span className="example-kicker">Contoh</span>
          {block.title && <strong>{block.title}</strong>}
        </div>
        <div className="prose">
          <Markdown>{body}</Markdown>
        </div>
        {refs}
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className="quote-block">
        <div className="prose">
          <Markdown>{body}</Markdown>
        </div>
        {refs}
      </blockquote>
    );
  }

  return (
    <div className="prose-block">
      <div className="prose">
        <Markdown>{body}</Markdown>
      </div>
      {refs}
    </div>
  );
}

export function ModuleRenderer({ content }: { content: ModuleContent }) {
  return (
    <div className="module-body">
      {content.sections.map((section, sectionIndex) => (
        <section key={`${section.heading}-${sectionIndex}`} className="module-section">
          <div className="section-heading-row">
            <span className="section-index">{String(sectionIndex + 1).padStart(2, "0")}</span>
            <h2>{section.heading}</h2>
          </div>
          <div className="section-blocks">
            {section.blocks.map((block, blockIndex) => (
              <Block
                key={`${block.type}-${blockIndex}`}
                block={block}
                citations={content.citations}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CitationList({ citations }: { citations: SourceCitation[] }) {
  if (!citations.length) return null;
  return (
    <ol className="citation-list">
      {citations.map((citation, index) => (
        <li key={citation.id} id={`cite-${index}`}>
          <span className="citation-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="citation-kind">
            {citation.kind === "audio" ? "Audio" : "Dokumen"}
          </span>
          <span>{citation.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function Formula({ latex }: { latex: string }) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
        output: "html",
      }),
    [latex],
  );
  return <div className="formula-expression" dangerouslySetInnerHTML={{ __html: html }} />;
}
