import logging
import os
from logging.handlers import TimedRotatingFileHandler

# 프로젝트 루트 기준 logs 폴더
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

LOGGER_NAME = "api_server"


def _build_logger() -> logging.Logger:
    logger = logging.getLogger(LOGGER_NAME)

    # 모듈이 여러 번 import 되어도 핸들러 중복 추가를 막는다.
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    file_handler = TimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, "server.log"),
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


_logger = _build_logger()


def get_logger() -> logging.Logger:
    return _logger
