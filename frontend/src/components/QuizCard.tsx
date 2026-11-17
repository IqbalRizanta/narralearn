import { Check, X } from "lucide-react";

import type { QuizItem, SourceCitation } from "../lib/types";
import { cn } from "../lib/utils";
import { CitationRefs } from "./ModuleRenderer";

export function QuizCard({
  item,
  index,
  selected,
  citations,
  onSelect,
}: {
  item: QuizItem;
  index: number;
  selected?: number;
  citations: SourceCitation[];
  onSelect: (optionIndex: number) => void;
}) {
  const answered = selected !== undefined;
  const correct = answered && selected === item.answer_index;

  return (
    <article className={cn("quiz-card", answered && (correct ? "is-correct" : "is-wrong"))}>
      <div className="quiz-head">
        <span className="quiz-index">Kuis {String(index + 1).padStart(2, "0")}</span>
        {answered && (
          <span className={cn("quiz-result", correct ? "is-correct" : "is-wrong")}>
            {correct ? <Check size={14} /> : <X size={14} />}
            {correct ? "Tepat" : "Belum tepat"}
          </span>
        )}
      </div>
      <h3 className="quiz-question">{item.question}</h3>
      <div className="quiz-options" role="group" aria-label={`Pilihan jawaban kuis ${index + 1}`}>
        {item.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const isAnswer = item.answer_index === optionIndex;
          return (
            <button
              key={`${item.id}-${optionIndex}`}
              type="button"
              className={cn(
                "quiz-option",
                isSelected && "is-selected",
                answered && isAnswer && "is-answer",
                answered && isSelected && !isAnswer && "is-wrong",
              )}
              onClick={() => onSelect(optionIndex)}
              aria-pressed={isSelected}
            >
              <span className="quiz-letter">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span>{option}</span>
              {answered && isAnswer && <Check size={16} className="quiz-mark" />}
              {answered && isSelected && !isAnswer && (
                <X size={16} className="quiz-mark" />
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="quiz-explanation">
          <strong>{correct ? "Kenapa tepat?" : "Jawaban yang tepat:"}</strong>
          <p>{item.explanation}</p>
          <CitationRefs refs={item.source_refs} citations={citations} />
        </div>
      )}
    </article>
  );
}
