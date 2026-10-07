import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from backend.api.router import router
from backend.services.mail_notifier import MailNotifier
from backend.services.wishes_service import WishesService
from backend.storage.wishes_storage import WishesStorage
from backend.storage.postgres_wishes_storage import PostgresWishesStorage

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


class FreshStaticFiles(StaticFiles):
    def file_response(self, full_path, stat_result, scope, status_code=200):
        response = super().file_response(full_path, stat_result, scope, status_code)
        response.headers["Cache-Control"] = "no-store"
        return response


def create_app(database_path: Path | None = None, mailer: MailNotifier | None = None) -> FastAPI:
    app = FastAPI(title="Para ti")
    start_value = os.getenv("GIFT_START_AT", "").strip()
    gift_start = datetime.fromisoformat(start_value) if start_value else None
    if gift_start is not None and gift_start.utcoffset() is None:
        raise ValueError("GIFT_START_AT debe incluir zona horaria, por ejemplo -06:00")
    gift_end = gift_start + timedelta(hours=24) if gift_start else None
    postgres_url = os.getenv("DATABASE_URL", "").strip() if database_path is None else ""
    storage = PostgresWishesStorage(postgres_url) if postgres_url else WishesStorage(
        database_path or Path(os.getenv("WISHES_DB_PATH", ROOT / "backend/storage/wishes.sqlite3"))
    )
    require_delivery = os.getenv("REQUIRE_EMAIL_DELIVERY", "").lower() in {"1", "true", "yes"}
    app.state.wishes_service = WishesService(storage, mailer or MailNotifier.from_env(), require_delivery)

    @app.middleware("http")
    async def gift_window(request, call_next):
        if gift_start and request.url.path != "/api/health":
            now = datetime.now(timezone.utc)
            if now < gift_start:
                return PlainTextResponse("Esta carta se abrirá pronto 💛", status_code=403, headers={"Cache-Control": "no-store"})
            if now >= gift_end:
                return PlainTextResponse("Esta carta ya terminó su recorrido 💛", status_code=410, headers={"Cache-Control": "no-store"})
        return await call_next(request)
    app.include_router(router)
    app.mount("/css", FreshStaticFiles(directory=FRONTEND / "css"), name="css")
    app.mount("/js", FreshStaticFiles(directory=FRONTEND / "js"), name="js")
    app.mount("/assets", StaticFiles(directory=FRONTEND / "assets"), name="assets")

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(FRONTEND / "index.html", headers={"Cache-Control": "no-store"})

    return app


app = create_app()
