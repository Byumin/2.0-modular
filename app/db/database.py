from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# SQLite 파일 DB (프로젝트 루트에 app.db 생성)
DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite에서 필요
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal() # DB 세션 생성 (DB 연결)
    try:
        yield db 
        # yield를 쓰는 이유는 return과 비교하면 되는데, 
        # return은 함수가 실행되면서 일방향으로 진행되어 종료됨. 
        # 반면에 yield를 통해 세션을 반환하고, 받은 엔드포인트가 일을 다 끝내면 해당 함수가 이어서 실행됨.
    finally:
        db.close()
