"""End-to-end API smoke test against a running NarraLearn backend.

Usage:
    backend/.venv/Scripts/python.exe scripts/smoke_api.py

Requires the API in demo mode (SQLite + QUEUE_MODE=inline works best) and the
backend dev extras for reportlab. Exits non-zero on the first failed assertion.
"""

from __future__ import annotations

import io
import time
import uuid

import httpx
from reportlab.pdfgen import canvas

BASE_URL = "http://127.0.0.1:8000"


def build_pdf() -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, "NarraLearn: algoritma, graph, dan kompleksitas waktu.")
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def main() -> None:
    pdf_bytes = build_pdf()

    with httpx.Client(base_url=BASE_URL, timeout=60, follow_redirects=True) as client:
        health = client.get("/healthz")
        health.raise_for_status()
        assert health.json()["status"] == "ok"

        email = f"smoke{uuid.uuid4().hex[:10]}@example.com"
        register = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Smoke Test",
                "email": email,
                "password": "smoke-password-123",
                "consent_accepted": True,
                "consent_version": "1.0",
            },
        )
        register.raise_for_status()
        token = register.json()["access_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": str(uuid.uuid4()),
        }

        created = client.post(
            "/api/v1/sessions",
            headers=headers,
            data={
                "title": "Smoke Test — Algoritma",
                "style_mode": "GAMING",
                "speaker_label": "Dosen Uji",
            },
            files={
                "documents": (
                    "materi.pdf",
                    pdf_bytes,
                    "application/pdf",
                )
            },
        )
        created.raise_for_status()
        session_id = created.json()["session_id"]
        job_id = created.json()["job_id"]
        print(f"created session={session_id} job={job_id}")

        job = {}
        for _ in range(90):
            status = client.get(f"/api/v1/jobs/{job_id}", headers=headers)
            status.raise_for_status()
            job = status.json()
            if job["status"] in {"SUCCEEDED", "FAILED", "CANCELED"}:
                break
            time.sleep(0.5)
        print(
            f"job status={job.get('status')} stage={job.get('stage')} "
            f"progress={job.get('progress')} error={job.get('error_code')}"
        )
        assert job.get("status") == "SUCCEEDED", job

        detail = client.get(f"/api/v1/sessions/{session_id}", headers=headers)
        detail.raise_for_status()
        session = detail.json()
        print(
            f"session status={session['status']} modules={len(session['modules'])} "
            f"documents={len(session['documents'])}"
        )
        assert session["status"] == "READY"
        assert session["modules"], "no module generated"
        assert session["documents"], "document metadata missing"

        module = client.get(
            f"/api/v1/sessions/{session_id}/modules/GAMING", headers=headers
        )
        module.raise_for_status()
        content = module.json()["content_json"]
        print(
            f"module title={content['title']!r} sections={len(content['sections'])} "
            f"quiz={len(content['quiz'])} model={module.json()['model_name']}"
        )
        assert content["sections"], "module has no sections"
        assert content["quiz"], "module has no quiz"
        assert content["citations"], "module has no citations"

        switched = client.post(
            f"/api/v1/sessions/{session_id}/modules",
            headers=headers,
            json={"style_mode": "NOVEL"},
        )
        switched.raise_for_status()
        switch_body = switched.json()
        assert switch_body["status"] in {"READY", "QUEUED"}
        if switch_body["status"] == "QUEUED":
            for _ in range(90):
                status = client.get(
                    f"/api/v1/jobs/{switch_body['job_id']}", headers=headers
                )
                status.raise_for_status()
                if status.json()["status"] in {"SUCCEEDED", "FAILED", "CANCELED"}:
                    break
                time.sleep(0.5)
            assert status.json()["status"] == "SUCCEEDED", status.json()
        novel = client.get(
            f"/api/v1/sessions/{session_id}/modules/NOVEL", headers=headers
        )
        novel.raise_for_status()
        print(f"style switch ok: {novel.json()['content_json']['title']!r}")

        me = client.get("/api/v1/auth/me", headers=headers)
        me.raise_for_status()
        assert me.json()["email"] == email

    print("SMOKE OK")


if __name__ == "__main__":
    main()
