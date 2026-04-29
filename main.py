"""Compatibility entrypoint for tools that still import `main:app`.

The actual application composition lives in `app.main`.
Run the server with:

    uvicorn app.main:app --reload --host 127.0.0.1 --port 8120
"""

from app.main import app
