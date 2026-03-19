from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.repositories.assessment_repository import get_assessment_stats_rows
from app.services.admin.auth import get_current_admin
from app.services.admin.clients import list_admin_clients
from app.services.admin.custom_tests import list_admin_custom_tests


def admin_assessment_stats(db: Session, admin_session: str | None, days: int = 14) -> dict:
    admin = get_current_admin(db, admin_session)
    safe_days = min(max(days, 7), 60)
    from_date = date.today() - timedelta(days=safe_days - 1)

    rows = get_assessment_stats_rows(db, admin_user_id=admin.id, from_date=from_date)
    by_day = {row.assessed_on.isoformat(): int(row.count) for row in rows}

    items = []
    for i in range(safe_days):
        d = from_date + timedelta(days=i)
        iso = d.isoformat()
        items.append({"date": iso, "count": by_day.get(iso, 0)})
    return {"items": items}


def admin_dashboard(db: Session, admin_session: str | None) -> dict:
    tests = list_admin_custom_tests(db, admin_session)["items"]
    clients = list_admin_clients(db, admin_session)["items"]
    stats = admin_assessment_stats(db, admin_session, days=14)["items"]

    total_clients = len(clients)
    not_started = sum(1 for item in clients if item["status"] == "미실시")
    today_iso = date.today().isoformat()
    today_assessed_count = next((item["count"] for item in stats if item["date"] == today_iso), 0)

    recent_clients = sorted(
        clients,
        key=lambda x: (
            0 if x["status"] == "미실시" else 1,
            x["last_assessed_on"] or "",
            x["created_at"],
        ),
        reverse=True,
    )[:10]

    return {
        "summary": {
            "running_tests": len(tests),
            "total_clients": total_clients,
            "not_started_clients": not_started,
            "today_assessments": int(today_assessed_count or 0),
        },
        "tests": tests,
        "clients": recent_clients,
        "stats": stats,
    }
