from backend.schemas.wishes import WishesCreate, WishesSaved
from backend.services.mail_notifier import MailNotifier
from backend.storage.wishes_storage import WishesStorage
from backend.storage.postgres_wishes_storage import PostgresWishesStorage


class WishesService:
    def __init__(self, storage: WishesStorage | PostgresWishesStorage, mailer: MailNotifier, require_delivery: bool = False):
        self.storage = storage
        self.mailer = mailer
        self.require_delivery = require_delivery

    def create(self, wishes: WishesCreate) -> WishesSaved:
        saved = self.storage.save(wishes)
        email_status = self.mailer.send(wishes)
        self.storage.set_email_status(saved.id, email_status)
        if self.require_delivery and wishes.message and email_status != "sent":
            raise RuntimeError("No se pudo completar el envío privado")
        return saved
