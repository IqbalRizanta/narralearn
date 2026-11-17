import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { QuizItem, SourceCitation } from "../lib/types";
import { QuizCard } from "./QuizCard";

const citations: SourceCitation[] = [
  { id: "c1", label: "Slide 4 — Sorting", kind: "document" },
];

const item: QuizItem = {
  id: "q1",
  type: "multiple_choice",
  question: "Manakah kompleksitas rata-rata quicksort?",
  options: ["O(n)", "O(n log n)", "O(n²)"],
  answer_index: 1,
  explanation: "Partisi membagi data dan kedalaman rekursi sekitar log n.",
  source_refs: ["c1"],
};

describe("QuizCard", () => {
  it("renders the question and calls onSelect with the chosen index", () => {
    const onSelect = vi.fn();
    render(
      <QuizCard
        item={item}
        index={0}
        citations={citations}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Kuis 01")).toBeInTheDocument();
    expect(screen.getByText(item.question)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /O\(n log n\)/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("shows positive feedback and explanation for a correct answer", () => {
    render(
      <QuizCard
        item={item}
        index={0}
        selected={1}
        citations={citations}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText("Tepat")).toBeInTheDocument();
    expect(screen.getByText("Kenapa tepat?")).toBeInTheDocument();
    expect(
      screen.getByText(/Partisi membagi data dan kedalaman rekursi/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Sumber: Slide 4 — Sorting")).toBeInTheDocument();
  });

  it("marks a wrong answer and reveals the correct option", () => {
    render(
      <QuizCard
        item={item}
        index={1}
        selected={0}
        citations={citations}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText("Belum tepat")).toBeInTheDocument();
    expect(screen.getByText("Jawaban yang tepat:")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("is-wrong");
  });
});
