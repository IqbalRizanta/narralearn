import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("shows the rounded value and accessible progress", () => {
    render(
      <ProgressRing
        value={42.4}
        label="kualitas vokal"
        sublabel="3 detik tersisa"
      />,
    );

    const ring = screen.getByRole("progressbar");
    expect(ring).toHaveAttribute("aria-valuenow", "42");
    expect(ring).toHaveAttribute("aria-label", "kualitas vokal");
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("3 detik tersisa")).toBeInTheDocument();
  });

  it("clamps values above 100 and below 0", () => {
    const { rerender } = render(<ProgressRing value={180} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );

    rerender(<ProgressRing value={-20} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("renders a fixed size and can hide the numeric value", () => {
    render(<ProgressRing value={75} size={90} showValue={false} label="gagal" />);
    const ring = screen.getByRole("progressbar");

    expect(ring).toHaveStyle({ width: "90px", height: "90px" });
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
    expect(screen.getByText("gagal")).toBeInTheDocument();
  });
});
