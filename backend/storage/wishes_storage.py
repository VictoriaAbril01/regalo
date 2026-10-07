import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from backend.schemas.wishes import WishesCreate, WishesSaved


class WishesStorage:
    def __init__(self, database_path: Path):
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS wishes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    place TEXT NOT NULL,
                    gift TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    message TEXT NOT NULL DEFAULT '',
                    email_status TEXT NOT NULL DEFAULT 'not_requested',
                    created_at TEXT NOT NULL
                )
            """)
            columns = {row[1] for row in connection.execute("PRAGMA table_info(wishes)")}
            if "message" not in columns:
                connection.execute("ALTER TABLE wishes ADD COLUMN message TEXT NOT NULL DEFAULT ''")
            if "email_status" not in columns:
                connection.execute("ALTER TABLE wishes ADD COLUMN email_status TEXT NOT NULL DEFAULT 'not_requested'")

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.database_path)

    def save(self, wishes: WishesCreate) -> WishesSaved:
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            cursor = connection.execute(
                "INSERT INTO wishes (place, gift, topic, message, created_at) VALUES (?, ?, ?, ?, ?)",
                (wishes.place, wishes.gift, wishes.topic, wishes.message, created_at),
            )
            return WishesSaved(id=cursor.lastrowid, created_at=created_at)

    def set_email_status(self, wish_id: int, email_status: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "UPDATE wishes SET email_status = ? WHERE id = ?",
                (email_status, wish_id),
            )
