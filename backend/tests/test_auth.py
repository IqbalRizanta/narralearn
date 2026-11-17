from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_header, register


async def test_register_login_me_and_refresh(client: AsyncClient) -> None:
    email = "rani@example.com"
    data = await register(client, email=email)
    assert data["user"]["email"] == email
    assert data["access_token"]
    assert client.cookies.get("narralearn_refresh")

    me = await client.get("/api/v1/auth/me", headers=auth_header(data["access_token"]))
    assert me.status_code == 200
    assert me.json()["full_name"] == "Rani Belajar"

    old_refresh = client.cookies.get("narralearn_refresh")
    refreshed = await client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200, refreshed.text
    assert refreshed.json()["access_token"]
    assert client.cookies.get("narralearn_refresh") != old_refresh

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password12345"},
    )
    assert login.status_code == 200
    wrong = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrong-password"},
    )
    assert wrong.status_code == 401


async def test_duplicate_email_and_logout(client: AsyncClient) -> None:
    email = "duplicate@example.com"
    await register(client, email=email)
    duplicate = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Orang Lain",
            "email": email,
            "password": "password12345",
            "consent_accepted": True,
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "EMAIL_TAKEN"

    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 401


async def test_consent_required_and_delete_account(client: AsyncClient) -> None:
    data = await register(client, consent=False)
    headers = auth_header(data["access_token"])

    blocked = await client.post(
        "/api/v1/sessions",
        headers=headers,
        data={"title": "Sesi tanpa consent"},
    )
    assert blocked.status_code == 403
    assert blocked.json()["code"] == "CONSENT_REQUIRED"

    consent = await client.post("/api/v1/auth/consent", headers=headers, json={"version": "1.0"})
    assert consent.status_code == 200
    assert consent.json()["consent_accepted_at"]

    deleted = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=headers,
        json={"password": "password12345"},
    )
    assert deleted.status_code == 200
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 401


async def test_invalid_token(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401
