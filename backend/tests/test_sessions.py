from __future__ import annotations

import uuid

from app.workers.processor import run_process_session, run_style_switch
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_blank_pdf_bytes,
    make_pptx_bytes,
    make_wav_bytes,
    register,
)

PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


async def _create_session(client: AsyncClient, token: str, **overrides) -> dict:
    data = {
        "title": "Algoritma dan Struktur Data",
        "style_mode": "GAMING",
        "speaker_label": "Dosen",
        "glossary": "algoritma, kompleksitas",
    }
    data.update(overrides)
    response = await client.post(
        "/api/v1/sessions",
        headers=auth_header(token),
        data=data,
        files=[
            ("audio", ("lecture.wav", make_wav_bytes(duration=3.0), "audio/wav")),
            ("documents", ("slides.pptx", make_pptx_bytes(), PPTX_MIME)),
        ],
    )
    assert response.status_code == 202, response.text
    return response.json()


async def test_full_session_pipeline_and_style_switch(client: AsyncClient) -> None:
    auth = await register(client)
    token = auth["access_token"]
    created = await _create_session(client, token)

    await run_process_session(uuid.UUID(created["job_id"]))

    detail = await client.get(
        f"/api/v1/sessions/{created['session_id']}", headers=auth_header(token)
    )
    assert detail.status_code == 200, detail.text
    session = detail.json()
    assert session["status"] == "READY", session
    assert session["latest_job"]["status"] == "SUCCEEDED"
    assert len(session["documents"]) == 1
    assert session["audio_duration_seconds"]
    assert "transkrip demo" in (session["raw_transcript"] or "").lower()

    module = await client.get(
        f"/api/v1/sessions/{created['session_id']}/modules/GAMING",
        headers=auth_header(token),
    )
    assert module.status_code == 200, module.text
    payload = module.json()
    assert payload["content_json"]["sections"]
    assert len(payload["quiz_json"]) == 3
    assert payload["model_name"] == "mock-narralearn"

    switched = await client.post(
        f"/api/v1/sessions/{created['session_id']}/modules",
        headers=auth_header(token),
        json={"style_mode": "SOSMED"},
    )
    assert switched.status_code == 202, switched.text
    switch_payload = switched.json()
    assert switch_payload["status"] == "QUEUED"
    await run_style_switch(uuid.UUID(switch_payload["job_id"]))
    new_module = await client.get(
        f"/api/v1/sessions/{created['session_id']}/modules/SOSMED",
        headers=auth_header(token),
    )
    assert new_module.status_code == 200
    assert new_module.json()["style_mode"] == "SOSMED"


async def test_session_list_update_cancel_and_isolation(client: AsyncClient) -> None:
    auth = await register(client)
    token = auth["access_token"]
    created = await _create_session(client, token, title="Sesi Pertama")

    listed = await client.get("/api/v1/sessions", headers=auth_header(token))
    assert listed.status_code == 200
    body = listed.json()
    assert body["items"][0]["title"] == "Sesi Pertama"
    assert body["items"][0]["latest_job"]["status"] == "QUEUED"

    patched = await client.patch(
        f"/api/v1/sessions/{created['session_id']}",
        headers=auth_header(token),
        json={"title": "Judul Baru"},
    )
    assert patched.status_code == 200
    assert patched.json()["title"] == "Judul Baru"

    await run_process_session(uuid.UUID(created["job_id"]))
    cancel_done = await client.post(
        f"/api/v1/sessions/{created['session_id']}/cancel",
        headers=auth_header(token),
    )
    assert cancel_done.status_code == 409

    other = await register(client)
    forbidden = await client.get(
        f"/api/v1/sessions/{created['session_id']}",
        headers=auth_header(other["access_token"]),
    )
    assert forbidden.status_code == 404

    deleted = await client.delete(
        f"/api/v1/sessions/{created['session_id']}", headers=auth_header(token)
    )
    assert deleted.status_code == 204
    missing = await client.get(
        f"/api/v1/sessions/{created['session_id']}", headers=auth_header(token)
    )
    assert missing.status_code == 404


async def test_cancel_queued_session(client: AsyncClient) -> None:
    auth = await register(client)
    token = auth["access_token"]
    created = await _create_session(client, token)
    response = await client.post(
        f"/api/v1/sessions/{created['session_id']}/cancel",
        headers=auth_header(token),
    )
    assert response.status_code == 202
    detail = await client.get(
        f"/api/v1/sessions/{created['session_id']}", headers=auth_header(token)
    )
    assert detail.json()["status"] == "CANCELED"


async def test_document_failure_and_retry(client: AsyncClient) -> None:
    auth = await register(client)
    token = auth["access_token"]
    response = await client.post(
        "/api/v1/sessions",
        headers=auth_header(token),
        data={"title": "Scan Gagal", "style_mode": "CASUAL_STORY"},
        files={
            "documents": ("scan.pdf", make_blank_pdf_bytes(), "application/pdf"),
            "audio": ("lecture.wav", make_wav_bytes(duration=2.0), "audio/wav"),
        },
    )
    assert response.status_code == 202, response.text
    created = response.json()
    await run_process_session(uuid.UUID(created["job_id"]))
    detail = await client.get(
        f"/api/v1/sessions/{created['session_id']}", headers=auth_header(token)
    )
    assert detail.json()["status"] == "FAILED"
    assert detail.json()["error_code"] == "SCANNED_PDF"

    retry = await client.post(
        f"/api/v1/sessions/{created['session_id']}/retry", headers=auth_header(token)
    )
    assert retry.status_code == 202, retry.text
    assert retry.json()["job_id"] != created["job_id"]


async def test_edit_transcript_and_regenerate_module(client: AsyncClient) -> None:
    auth = await register(client)
    token = auth["access_token"]

    response = await client.post(
        "/api/v1/sessions",
        headers=auth_header(token),
        data={"title": "Kuliah Basis Data", "style_mode": "CASUAL_STORY"},
        files={"audio": ("lecture.wav", make_wav_bytes(duration=2.0), "audio/wav")},
    )
    assert response.status_code == 202, response.text
    created = response.json()
    await run_process_session(uuid.UUID(created["job_id"]))

    patched = await client.patch(
        f"/api/v1/sessions/{created['session_id']}",
        headers=auth_header(token),
        json={"raw_transcript": "Normalisasi 3NF menghilangkan ketergantungan transitif pada tabel."},
    )
    assert patched.status_code == 200, patched.text
    assert "Normalisasi 3NF" in patched.json()["raw_transcript"]

    regen = await client.post(
        f"/api/v1/sessions/{created['session_id']}/modules",
        headers=auth_header(token),
        json={"style_mode": "CASUAL_STORY", "regenerate": True},
    )
    assert regen.status_code == 202, regen.text
    regen_data = regen.json()
    assert regen_data["status"] == "QUEUED"
    await run_style_switch(uuid.UUID(regen_data["job_id"]))

    module = await client.get(
        f"/api/v1/sessions/{created['session_id']}/modules/CASUAL_STORY",
        headers=auth_header(token),
    )
    assert module.status_code == 200, module.text
    assert "Normalisasi" in module.json()["content_json"]["summary"]
