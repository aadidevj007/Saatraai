from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import User


class InvestigationApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.created_emails: list[str] = []

    def tearDown(self) -> None:
        with SessionLocal() as session:
            users = session.scalars(select(User).where(User.email.in_(self.created_emails))).all()
            for user in users:
                session.delete(user)
            session.commit()

    def create_authenticated_user(self) -> dict[str, str]:
        email = f"investigation-{uuid4()}@example.com"
        self.created_emails.append(email)
        registration = self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "correct-horse-battery-staple"},
        )
        self.assertEqual(registration.status_code, 201, registration.text)
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "correct-horse-battery-staple"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    def test_project_investigation_and_query_lifecycle(self) -> None:
        headers = self.create_authenticated_user()
        project_response = self.client.post(
            "/api/v1/projects",
            json={"name": "Coastal change", "description": "Owned investigation workspace"},
            headers=headers,
        )
        self.assertEqual(project_response.status_code, 201, project_response.text)
        project = project_response.json()

        projects_response = self.client.get(
            "/api/v1/projects?page=1&page_size=1&search=Coastal", headers=headers
        )
        self.assertEqual(projects_response.status_code, 200, projects_response.text)
        self.assertEqual(projects_response.json()["total"], 1)
        self.assertEqual(projects_response.json()["items"][0]["id"], project["id"])
        self.assertEqual(
            self.client.get(f"/api/v1/projects/{project['id']}", headers=headers).status_code,
            200,
        )

        investigation_response = self.client.post(
            "/api/v1/investigations",
            json={"project_id": project["id"], "title": "Harbor expansion review"},
            headers=headers,
        )
        self.assertEqual(investigation_response.status_code, 201, investigation_response.text)
        investigation = investigation_response.json()
        self.assertEqual(investigation["project_id"], project["id"])
        self.assertEqual(investigation["status"], "planned")

        listed = self.client.get(
            f"/api/v1/investigations?project_id={project['id']}&status=planned&search=Harbor",
            headers=headers,
        )
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual(listed.json()["total"], 1)
        self.assertEqual(listed.json()["items"][0]["id"], investigation["id"])
        self.assertEqual(
            self.client.get(f"/api/v1/investigations/{investigation['id']}", headers=headers).status_code,
            200,
        )

        query_response = self.client.post(
            f"/api/v1/investigations/{investigation['id']}/queries",
            json={"text": "What changed around the harbor?"},
            headers=headers,
        )
        self.assertEqual(query_response.status_code, 201, query_response.text)
        self.assertEqual(query_response.json()["sequence"], 1)

    def test_unauthorized_and_cross_user_access_return_error_envelopes(self) -> None:
        unauthorized = self.client.get("/api/v1/investigations")
        self.assertEqual(unauthorized.status_code, 401)
        self.assertEqual(unauthorized.json()["error"]["code"], "http_401")

        owner_headers = self.create_authenticated_user()
        other_headers = self.create_authenticated_user()
        project = self.client.post(
            "/api/v1/projects", json={"name": "Private"}, headers=owner_headers
        ).json()
        forbidden = self.client.post(
            "/api/v1/investigations",
            json={"project_id": project["id"], "title": "Unauthorized"},
            headers=other_headers,
        )
        self.assertEqual(forbidden.status_code, 404)
        self.assertEqual(forbidden.json()["error"]["code"], "http_404")

    def test_openapi_documents_investigation_endpoints(self) -> None:
        document = self.client.get("/openapi.json").json()
        operation = document["paths"]["/api/v1/investigations"]["post"]
        self.assertEqual(operation["summary"], "Create an investigation")
        self.assertIn("401", operation["responses"])
        self.assertIn("/api/v1/investigations/{investigation_id}/queries", document["paths"])
