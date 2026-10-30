
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Integer,
    String,
    text,
)

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    email = Column(String(255), unique=True, nullable=False, index=True)

    full_name = Column(String(100), nullable=False)

    password_hash = Column(String(255), nullable=False)

    role = Column(
        Enum("user", "admin", name="user_role"),
        nullable=False,
        default="user",
        server_default=text("'user'"),
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("1"),
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
