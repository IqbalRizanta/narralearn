import { describe, expect, it } from "vitest";

import { ApiError } from "./api";
import {
  errorMessage,
  formatBytes,
  formatDuration,
  initials,
  isStyleMode,
  jobStageLabel,
  pluralize,
} from "./utils";

describe("utils", () => {
  it("validates style mode params", () => {
    expect(isStyleMode("GAMING")).toBe(true);
    expect(isStyleMode("CASUAL_STORY")).toBe(true);
    expect(isStyleMode("podcast")).toBe(false);
    expect(isStyleMode(undefined)).toBe(false);
  });

  it("formats durations and byte sizes for Indonesian UI", () => {
    expect(formatDuration(0)).toBe("—");
    expect(formatDuration(42)).toBe("42 dtk");
    expect(formatDuration(125)).toBe("2 mnt 05 dtk");
    expect(formatBytes(0)).toBe("—");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("pluralizes counts", () => {
    expect(pluralize(1, "modul", "modul")).toBe("1 modul");
    expect(pluralize(0, "gaya", "gaya")).toBe("0 gaya");
  });

  it("builds initials from the first two words", () => {
    expect(initials("Rani Putri Maharani")).toBe("RP");
    expect(initials("  budi  ")).toBe("B");
    expect(initials("")).toBe("");
  });

  it("maps job stages to friendly labels", () => {
    expect(jobStageLabel("TRANSCRIBING")).toBe("Mentranskrip rekaman");
    expect(jobStageLabel(null)).toBe("Menunggu antrean");
    expect(jobStageLabel("CUSTOM_STAGE")).toBe("CUSTOM_STAGE");
  });

  it("extracts useful messages from ApiError and other errors", () => {
    expect(
      errorMessage(new ApiError(422, "VALIDATION_ERROR", "Judul wajib diisi.")),
    ).toBe("Judul wajib diisi.");
    expect(
      errorMessage(new ApiError(0, "NETWORK_ERROR", "Tidak dapat terhubung.")),
    ).toBe("Tidak dapat terhubung.");
    expect(errorMessage(new Error("Boom"))).toBe("Boom");
    expect(errorMessage("unknown")).toBe("Terjadi kesalahan. Coba lagi.");
  });
});
