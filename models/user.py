from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.core.db import Base


class User(Base):
	__tablename__ = "users"

	id: Mapped[int] = mapped_column(primary_key=True)
	username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
	email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
	password: Mapped[str] = mapped_column(String(255), nullable=False)
	age: Mapped[int | None] = mapped_column(nullable=True)