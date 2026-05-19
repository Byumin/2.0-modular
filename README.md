# 2.0 Modular

## Local Setup

This project is intended to run on Python 3.12.3.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
