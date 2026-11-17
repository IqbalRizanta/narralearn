# ADR 0001 — PDF Parser & Licensing

**Status:** Accepted  
**Date:** 2026-11-14

## Context

The original plan selected PyMuPDF (`fitz`) for PDF extraction. PyMuPDF is
distributed under **AGPL-3.0** or a commercial license from Artifex. A
proprietary/SaaS deployment using AGPL code may trigger source-disclosure
obligations.

## Decision

Use **`pypdf` (BSD)** as the default PDF text extractor. Use **`pdfplumber`
(MIT)** only if/where layout/table extraction is needed. Use **`python-pptx`
(MIT)** for PPTX. Do **not** ship PyMuPDF unless a commercial license is
purchased and recorded.

For scanned PDFs, detect empty text and fail with a clear error. OCR
(Tesseract, Apache-2.0) is a v1.1 feature behind a config flag.

## Consequences

- Avoids AGPL exposure.
- Text extraction is slightly slower/less layout-aware than PyMuPDF.
- Scanned PDFs are rejected until OCR is added.
- Any future PDF library must pass the license audit in
  `Plan/9_revised_execution_plan.md` §9.6.
