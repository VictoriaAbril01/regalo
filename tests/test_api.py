import sqlite3
from datetime import datetime, timedelta, timezone

import httpx
from fastapi.testclient import TestClient

from backend.main import create_app
from backend.schemas.wishes import WishesCreate
from backend.services.mail_notifier import MailNotifier


class FakeMailer:
    def __init__(self):
        self.sent = []

    def send(self, wishes):
        self.sent.append(wishes)
        return "sent"


def test_health(tmp_path):
    with TestClient(create_app(tmp_path / "wishes.sqlite3", FakeMailer())) as client:
        assert client.get("/api/health").json() == {"status": "ok"}


def test_frontend_serves_current_download_label_without_caching(tmp_path):
    with TestClient(create_app(tmp_path / "wishes.sqlite3", FakeMailer())) as client:
        response = client.get("/js/activities/LetterActivity.js")
        assert response.status_code == 200
        assert "Por si no la quieres perder, descárgala" in response.text
        assert response.headers["cache-control"] == "no-store"
        assert client.get("/").headers["cache-control"] == "no-store"


def test_valid_wishes_are_persisted(tmp_path):
    path = tmp_path / "wishes.sqlite3"
    mailer = FakeMailer()
    with TestClient(create_app(path, mailer)) as client:
        response = client.post("/api/wishes", json={"place": "  Chapultepec  ", "gift": "Un libro", "topic": "Música", "message": "  Te amo mucho 💛  "})
    assert response.status_code == 201
    assert response.json()["id"] == 1
    assert "email_status" not in response.json()
    assert mailer.sent[0].message == "Te amo mucho 💛"
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT place, gift, topic, message, email_status FROM wishes").fetchone() == ("Chapultepec", "Un libro", "Música", "Te amo mucho 💛", "sent")


def test_empty_and_too_long_fields(tmp_path):
    with TestClient(create_app(tmp_path / "wishes.sqlite3", FakeMailer())) as client:
        valid = {"place": "Un lugar", "gift": "Un regalo", "topic": "Un tema"}
        assert client.post("/api/wishes", json={**valid, "place": "  \n "}).status_code == 422
        assert client.post("/api/wishes", json={**valid, "gift": "x" * 301}).status_code == 422
        assert client.post("/api/wishes", json={**valid, "message": "x" * 2001}).status_code == 422


def test_existing_database_is_upgraded(tmp_path):
    path = tmp_path / "old.sqlite3"
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE wishes (id INTEGER PRIMARY KEY AUTOINCREMENT, place TEXT NOT NULL, gift TEXT NOT NULL, topic TEXT NOT NULL, created_at TEXT NOT NULL)")
    with TestClient(create_app(path, FakeMailer())) as client:
        response = client.post("/api/wishes", json={"place": "Un lugar", "gift": "Un libro", "topic": "Música"})
    assert response.status_code == 201
    assert "email_status" not in response.json()
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT message, email_status FROM wishes").fetchone() == ("", "sent")


def test_mail_notifier_uses_smtp_without_network(monkeypatch):
    captured = []

    class FakeSMTP:
        def __init__(self, host, port, timeout, context):
            assert (host, port) == ("smtp.gmail.com", 465)

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def login(self, username, password):
            assert (username, password) == ("sender@gmail.com", "app-password")

        def send_message(self, message):
            captured.append(message)

    monkeypatch.setattr("backend.services.mail_notifier.smtplib.SMTP_SSL", FakeSMTP)
    wishes = WishesCreate(place="Un lugar", gift="Un libro", topic="Música", message="Hola Abril")
    notifier = MailNotifier("akane8264@gmail.com", "sender@gmail.com", "app-password")
    assert notifier.send(wishes) == "sent"
    assert captured[0]["To"] == "akane8264@gmail.com"
    assert "Hola Abril" in captured[0].get_content()
    assert MailNotifier("akane8264@gmail.com", "sender@gmail.com", "").send(wishes) == "not_configured"


def test_mail_notifier_uses_resend_over_https(monkeypatch):
    captured = []

    def fake_post(url, *, headers, json, timeout):
        captured.append((url, headers, json, timeout))
        return httpx.Response(200, request=httpx.Request("POST", url), json={"id": "email-1"})

    monkeypatch.setattr("backend.services.mail_notifier.httpx.post", fake_post)
    wishes = WishesCreate(place="Un lugar", gift="Un libro", topic="Música", message="Hola Abril")
    notifier = MailNotifier("akane8264@gmail.com", "", "", resend_api_key="secret-key")
    assert notifier.send(wishes) == "sent"
    url, headers, payload, timeout = captured[0]
    assert url == "https://api.resend.com/emails"
    assert headers["Authorization"] == "Bearer secret-key"
    assert payload["to"] == ["akane8264@gmail.com"]
    assert "Hola Abril" in payload["text"]
    assert timeout == 12


def test_resend_sends_answers_without_optional_message(monkeypatch):
    captured = []

    def fake_post(url, *, headers, json, timeout):
        captured.append(json)
        return httpx.Response(200, request=httpx.Request("POST", url), json={"id": "email-2"})

    monkeypatch.setattr("backend.services.mail_notifier.httpx.post", fake_post)
    wishes = WishesCreate(place="Chapultepec", gift="Un libro", topic="Música")
    notifier = MailNotifier("akane8264@gmail.com", "", "", resend_api_key="secret-key")
    assert notifier.send(wishes) == "sent"
    assert "Chapultepec" in captured[0]["text"]
    assert "Un libro" in captured[0]["text"]
    assert "Música" in captured[0]["text"]
    assert "te dejó este mensaje" not in captured[0]["text"]


def test_required_delivery_does_not_confirm_failed_email(tmp_path, monkeypatch):
    class FailedMailer:
        def send(self, wishes):
            return "failed"

    monkeypatch.setenv("REQUIRE_EMAIL_DELIVERY", "true")
    path = tmp_path / "wishes.sqlite3"
    with TestClient(create_app(path, FailedMailer())) as client:
        response = client.post("/api/wishes", json={"place": "Un lugar", "gift": "Un libro", "topic": "Música", "message": "Hola"})
    assert response.status_code == 503
    assert "correo" not in response.json()["detail"]
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT message, email_status FROM wishes").fetchone() == ("Hola", "failed")


def test_required_delivery_of_answers_without_optional_message(tmp_path, monkeypatch):
    class FailedMailer:
        def send(self, wishes):
            return "failed"

    monkeypatch.setenv("REQUIRE_EMAIL_DELIVERY", "true")
    path = tmp_path / "wishes.sqlite3"
    with TestClient(create_app(path, FailedMailer())) as client:
        response = client.post("/api/wishes", json={"place": "Un lugar", "gift": "Un libro", "topic": "Música"})
    assert response.status_code == 503
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT message, email_status FROM wishes").fetchone() == ("", "failed")


def test_gift_window_limits_public_access_to_24_hours(tmp_path, monkeypatch):
    now = datetime.now(timezone.utc)
    for offset, expected_status in [(timedelta(hours=1), 403), (-timedelta(hours=1), 200), (-timedelta(hours=25), 410)]:
        monkeypatch.setenv("GIFT_START_AT", (now + offset).isoformat())
        with TestClient(create_app(tmp_path / f"wishes-{expected_status}.sqlite3", FakeMailer())) as client:
            assert client.get("/").status_code == expected_status
            assert client.get("/api/health").status_code == 200


def test_letter_pdf_download(tmp_path):
    with TestClient(create_app(tmp_path / "wishes.sqlite3", FakeMailer())) as client:
        response = client.post("/api/letter.pdf", json={"letter": "**Para el amor de mi vida:**\n\nTe elijo a ti.\n\nTe amo."})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "Carta_para_Sebastian.pdf" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 1000
