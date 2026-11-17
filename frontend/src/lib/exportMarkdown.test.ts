import { describe, expect, it } from "vitest";

import { moduleToMarkdown, slugifyFilename } from "./exportMarkdown";
import type { ModuleContent } from "./types";

const SAMPLE_MODULE: ModuleContent = {
  schema_version: "1.0",
  title: "Gaming: Algoritma Sorting",
  summary: "Ringkasan materi sorting.",
  sections: [
    {
      heading: "Konsep Dasar",
      blocks: [
        { type: "paragraph", text: "Sorting mengurutkan data.", source_refs: ["doc:1"] },
        { type: "callout", title: "Tips", text: "Perhatikan kompleksitas.", source_refs: [] },
        {
          type: "formula",
          latex: "O(n \\log n)",
          explanation: "Kompleksitas rata-rata Merge Sort.",
          source_refs: [],
        },
        { type: "example", text: "Mengurutkan skor leaderboard.", source_refs: [] },
        { type: "quote", text: "Pilih algoritma sesuai ukuran data.", source_refs: [] },
      ],
    },
  ],
  glossary: [{ term: "Big-O", definition: "Notasi kompleksitas.", source_refs: [] }],
  study_method: {
    name: "Feynman Technique",
    why: "Membantu memahami alur.",
    steps: ["Jelaskan ulang", "Cek celah pemahaman"],
    source_refs: [],
  },
  quiz: [
    {
      id: "q1",
      type: "multiple_choice",
      question: "Berapa kompleksitas Merge Sort?",
      options: ["O(n)", "O(n log n)", "O(n^2)"],
      answer_index: 1,
      explanation: "Merge sort membagi array secara logaritmik.",
      source_refs: ["doc:1"],
    },
  ],
  citations: [{ id: "doc:1", label: "slide.pdf", kind: "document" }],
};

describe("exportMarkdown", () => {
  it("formats sections, formulas, quiz, glossary, and citations", () => {
    const md = moduleToMarkdown(SAMPLE_MODULE, {
      sessionTitle: "Algoritma Sorting",
      styleMode: "GAMING",
    });
    expect(md).toContain("# Algoritma Sorting");
    expect(md).toContain("Gaya Narasi: **Gaming**");
    expect(md).toContain("## Konsep Dasar");
    expect(md).toContain("```latex\nO(n \\log n)\n```");
    expect(md).toContain("## Metode Belajar: Feynman Technique");
    expect(md).toContain("- **Big-O**: Notasi kompleksitas.");
    expect(md).toContain("**Jawaban:** B — Merge sort membagi array secara logaritmik.");
    expect(md).toContain("- `doc:1` (document): slide.pdf");
  });

  it("slugifies filenames safely", () => {
    expect(slugifyFilename("Algoritma & Struktur Data!")).toBe("algoritma-struktur-data");
    expect(slugifyFilename("   ")).toBe("narralearn-modul");
  });
});
