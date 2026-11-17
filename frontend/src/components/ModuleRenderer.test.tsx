import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ModuleContent } from "../lib/types";
import { CitationList, ModuleRenderer } from "./ModuleRenderer";

const content: ModuleContent = {
  schema_version: "1.0",
  title: "Algoritma dan Kompleksitas",
  summary: "Ringkasan singkat tentang cara mengukur efisiensi algoritma.",
  sections: [
    {
      heading: "Bagian Satu",
      blocks: [
        {
          type: "paragraph",
          text: "Kompleksitas waktu mengukur **pertumbuhan** langkah algoritma.",
          source_refs: ["c1"],
        },
        {
          type: "callout",
          title: "Ingat",
          text: "Konstanta diabaikan pada notasi Big-O.",
          source_refs: [],
        },
        {
          type: "formula",
          latex: "T(n) = O(n \\log n)",
          explanation: "Contoh kompleksitas merge sort.",
          source_refs: ["c2"],
        },
        {
          type: "quote",
          text: "Ukur, jangan hanya menebak.",
          source_refs: [],
        },
      ],
    },
  ],
  glossary: [],
  study_method: {
    name: "Recall aktif",
    why: "Menguji ingatan lebih kuat daripada membaca ulang.",
    steps: ["Baca", "Tutup", "Jelaskan"],
    source_refs: [],
  },
  quiz: [],
  citations: [
    { id: "c1", label: "Slide 4 — Sorting", kind: "document" },
    { id: "c2", label: "Rekaman 00:12", kind: "audio" },
  ],
};

describe("ModuleRenderer", () => {
  it("renders headings, sanitized markdown, callouts, and formulas", () => {
    const { container } = render(<ModuleRenderer content={content} />);

    expect(
      screen.getByRole("heading", { name: "Bagian Satu" }),
    ).toBeInTheDocument();
    expect(screen.getByText("pertumbuhan")).toBeInTheDocument();
    expect(screen.getByText("Ingat")).toBeInTheDocument();
    expect(screen.getByText("Contoh kompleksitas merge sort.")).toBeInTheDocument();
    expect(container.querySelector(".formula-expression .katex")).not.toBeNull();
    expect(screen.getByText("Ukur, jangan hanya menebak.")).toBeInTheDocument();
  });

  it("links inline citation refs to the citation list", () => {
    render(<ModuleRenderer content={content} />);

    const refs = screen.getAllByRole("link", { name: /^Sumber:/ });
    expect(refs.length).toBeGreaterThanOrEqual(2);
    expect(refs[0]).toHaveAttribute("href", "#cite-0");
    expect(refs[0]).toHaveAttribute("title", "Slide 4 — Sorting");
  });

  it("renders a numbered citation list", () => {
    render(<CitationList citations={content.citations} />);

    expect(screen.getByText("Slide 4 — Sorting")).toBeInTheDocument();
    expect(screen.getByText("Audio")).toBeInTheDocument();
    expect(screen.getByText("Rekaman 00:12")).toBeInTheDocument();
  });
});
