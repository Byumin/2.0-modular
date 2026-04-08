import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from app.services.admin.modular_auth import verify_modular_admin_login


def main() -> None:
    cases = [
        ("admin", "1234"),
        ("admin", "wrong-password"),
        ("missing", "1234"),
    ]
    for admin_id, admin_pw in cases:
        result = verify_modular_admin_login(admin_id, admin_pw)
        print(
            {
                "admin_id": admin_id,
                "admin_pw": admin_pw,
                "ok": result is not None,
                "result": result,
            }
        )


if __name__ == "__main__":
    main()
