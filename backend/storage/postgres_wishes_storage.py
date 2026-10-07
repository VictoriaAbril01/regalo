from datetime import datetime, timezone

import psycopg

from backend.schemas.wishes import WishesCreate, WishesSaved


class PostgresWishesStorage:
    def __init__(self, database_url: str):
        self.database_url = database_url
        with self._connect() as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS wishes (
                    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    place TEXT NOT NULL,
                    gift TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    message TEXT NOT NULL DEFAULT '',
                    email_status TEXT NOT NULL DEFAULT 'not_requested',
                    created_at TIMESTAMPTZ NOT NULL
                )
            """)

    def _connect(self):
        return psycopg.connect(self.database_url, connect_timeout=10)

    def save(self, wishes: WishesCreate) -> WishesSaved:
        created_at = datetime.now(timezone.utc)
        with self._connect() as connection:
            row = connection.execute(
                """INSERT INTO wishes (place, gift, topic, message, created_at)
                VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (wishes.place, wishes.gift, wishes.topic, wishes.message, created_at),
            ).fetchone()
        return WishesSaved(id=row[0], created_at=created_at.isoformat())

    def set_email_status(self, wish_id: int, email_status: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "UPDATE wishes SET email_status = %s WHERE id = %s",
                (email_status, wish_id),
            )
