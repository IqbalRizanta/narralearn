import type { ModuleContent, StyleMode } from "./types";
import { STYLE_META } from "./utils";

/**
 * Format a NarraLearn module into a printable, offline-friendly Markdown document.
 */
export function moduleToMarkdown(
  content: ModuleContent,
  options?: {
    sessionTitle?: string;
    styleMode?: StyleMode;
  },
): string {
  const lines: string[] = [];
  const heading = options?.sessionTitle?.trim() || content.title;
  const styleLabel = options?.styleMode ? STYLE_META[options.styleMode].label : null;

  lines.push(`# ${heading}`);
  if (styleLabel) {
    lines.push(`> Gaya Narasi: **${styleLabel}** | Skema v${content.schema_version}`);
  }
  lines.push("");
  lines.push("## Ringkasan");
  lines.push(content.summary);
  lines.push("");

  for (const section of content.sections) {
    lines.push(`## ${section.heading}`);
    lines.push("");
    for (const block of section.blocks) {
      if (block.type === "paragraph" && block.text) {
        lines.push(block.text);
      } else if (block.type === "callout" && block.text) {
        lines.push(`> **${block.title || "Catatan"}**`);
        lines.push(`> ${block.text}`);
      } else if (block.type === "formula" && block.latex) {
        lines.push("```latex");
        lines.push(block.latex);
        lines.push("```");
        if (block.explanation) {
          lines.push(`*Penjelasan:* ${block.explanation}`);
        }
      } else if (block.type === "example" && block.text) {
        lines.push(`**Contoh:** ${block.text}`);
      } else if (block.type === "quote" && block.text) {
        lines.push(`> "${block.text}"`);
      }
      lines.push("");
    }
  }

  lines.push(`## Metode Belajar: ${content.study_method.name}`);
  lines.push(content.study_method.why);
  lines.push("");
  content.study_method.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });
  lines.push("");

  if (content.glossary.length > 0) {
    lines.push("## Glosarium");
    lines.push("");
    for (const item of content.glossary) {
      lines.push(`- **${item.term}**: ${item.definition}`);
    }
    lines.push("");
  }

  if (content.quiz.length > 0) {
    lines.push("## Kuis Latihan");
    lines.push("");
    content.quiz.forEach((item, index) => {
      lines.push(`### ${index + 1}. ${item.question}`);
      item.options.forEach((option, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        lines.push(`- ${letter}. ${option}`);
      });
      const answerLetter = String.fromCharCode(65 + item.answer_index);
      lines.push("");
      lines.push(`**Jawaban:** ${answerLetter} — ${item.explanation}`);
      lines.push("");
    });
  }

  if (content.citations.length > 0) {
    lines.push("## Referensi Sumber");
    lines.push("");
    for (const citation of content.citations) {
      lines.push(`- \`${citation.id}\` (${citation.kind}): ${citation.label}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function slugifyFilename(value: string): string {
  const clean = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "narralearn-modul";
}

export function downloadMarkdownFile(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
