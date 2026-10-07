import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

import httpx

from backend.schemas.wishes import WishesCreate

logger = logging.getLogger(__name__)


class MailNotifier:
    def __init__(
        self,
        recipient: str,
        username: str,
        password: str,
        host: str = "smtp.gmail.com",
        port: int = 465,
        resend_api_key: str = "",
        resend_from: str = "onboarding@resend.dev",
    ):
        self.recipient = recipient
        self.username = username
        self.password = password
        self.host = host
        self.port = port
        self.resend_api_key = resend_api_key
        self.resend_from = resend_from

    @classmethod
    def from_env(cls) -> "MailNotifier":
        recipient = os.getenv("WISHES_EMAIL_TO", "akane8264@gmail.com").strip()
        return cls(
            recipient=recipient,
            username=os.getenv("SMTP_USER", recipient).strip(),
            password=os.getenv("SMTP_APP_PASSWORD", "").replace(" ", ""),
            host=os.getenv("SMTP_HOST", "smtp.gmail.com").strip(),
            port=int(os.getenv("SMTP_PORT", "465")),
            resend_api_key=os.getenv("RESEND_API_KEY", "").strip(),
            resend_from=os.getenv("RESEND_FROM", "onboarding@resend.dev").strip(),
        )

    def send(self, wishes: WishesCreate) -> str:
        if not wishes.message:
            return "not_requested"
        email = EmailMessage()
        email["Subject"] = "Un mensaje de Sebastián 💛"
        email["From"] = self.username
        email["To"] = self.recipient
        email.set_content(
            "Sebastián te dejó este mensaje:\n\n"
            f"{wishes.message}\n\n"
            "También respondió:\n\n"
            f"Lugar para ir juntos: {wishes.place}\n\n"
            f"Regalo que le gustaría: {wishes.gift}\n\n"
            f"Tema para platicar: {wishes.topic}\n"
        )

        if self.resend_api_key:
            try:
                response = httpx.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {self.resend_api_key}"},
                    json={
                        "from": self.resend_from,
                        "to": [self.recipient],
                        "subject": email["Subject"],
                        "text": email.get_content(),
                    },
                    timeout=12,
                )
                response.raise_for_status()
            except httpx.HTTPError:
                logger.exception("No se pudo enviar la notificación por Resend")
                return "failed"
            return "sent"

        if not all((self.recipient, self.username, self.password, self.host)):
            return "not_configured"

        try:
            context = ssl.create_default_context()
            if self.port == 465:
                with smtplib.SMTP_SSL(self.host, self.port, timeout=12, context=context) as server:
                    server.login(self.username, self.password)
                    server.send_message(email)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=12) as server:
                    server.starttls(context=context)
                    server.login(self.username, self.password)
                    server.send_message(email)
        except (OSError, smtplib.SMTPException):
            logger.exception("No se pudo enviar la notificación por correo")
            return "failed"
        return "sent"
