from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import User


class AuthenticationApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.created_emails: list[str] = []

    def tearDown(self) -> None:
        with SessionLocal() as session:
            users = session.scalars(select(User).where(User.email.in_(self.created_emails))).all()
            for user in users:
                session.delete(user)
            session.commit()

    def register_user(self, password: str = "correct-horse-battery-staple") -> tuple[str, dict]:
        email = f"auth-{uuid4()}@example.com"
        self.created_emails.append(email)
        response = self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "display_name": "Test User"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        return email, response.json()

    def login_headers(self, email: str, password: str = "correct-horse-battery-staple") -> dict[str, str]:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_registration_hashes_password(self) -> None:
        email, payload = self.register_user()
        self.assertEqual(payload["email"], email)
        self.assertNotIn("password", payload)

        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.email == email))
            self.assertIsNotNone(user)
            self.assertTrue(user.password_hash.startswith("$argon2"))
            self.assertNotEqual(user.password_hash, "correct-horse-battery-staple")

    def test_login_and_refresh_return_token_pairs(self) -> None:
        email, _ = self.register_user()
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "correct-horse-battery-staple"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        tokens = response.json()
        self.assertEqual(tokens["token_type"], "bearer")
        self.assertTrue(tokens["access_token"])
        self.assertTrue(tokens["refresh_token"])

        refresh_response = self.client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        self.assertEqual(refresh_response.status_code, 200, refresh_response.text)
        self.assertTrue(refresh_response.json()["access_token"])

    def test_invalid_credentials_are_rejected(self) -> None:
        email, _ = self.register_user()
        response = self.client.post(
            "/api/v1/auth/login", json={"email": email, "password": "wrong-password"}
        )
        self.assertEqual(response.status_code, 401)

    def test_missing_credentials_are_rejected(self) -> None:
        response = self.client.get("/api/v1/projects")
        self.assertEqual(response.status_code, 401)

    def test_current_user_requires_access_token(self) -> None:
        email, payload = self.register_user()
        unauthorized = self.client.get("/api/v1/users/me")
        self.assertEqual(unauthorized.status_code, 401)

        headers = self.login_headers(email)
        me = self.client.get("/api/v1/users/me", headers=headers)
        self.assertEqual(me.status_code, 200, me.text)
        body = me.json()
        self.assertEqual(body["id"], payload["id"])
        self.assertEqual(body["email"], email)
        self.assertNotIn("password_hash", body)

    def test_cross_user_project_and_investigation_access_is_denied(self) -> None:
        owner_email, _ = self.register_user()
        other_email, _ = self.register_user()
        owner_headers = self.login_headers(owner_email)
        other_headers = self.login_headers(other_email)

        project_response = self.client.post(
            "/api/v1/projects", json={"name": "Private project"}, headers=owner_headers
        )
        self.assertEqual(project_response.status_code, 201, project_response.text)
        project_id = project_response.json()["id"]

        investigation_response = self.client.post(
            "/api/v1/investigations",
            json={"project_id": project_id, "title": "Private investigation"},
            headers=owner_headers,
        )
        self.assertEqual(investigation_response.status_code, 201, investigation_response.text)
        investigation_id = investigation_response.json()["id"]

        self.assertEqual(
            self.client.get(f"/api/v1/projects/{project_id}", headers=other_headers).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(
                f"/api/v1/investigations/{investigation_id}", headers=other_headers
            ).status_code,
            404,
        )
