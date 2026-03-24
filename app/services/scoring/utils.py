from __future__ import annotations


def split_answer_key(answer_key: str) -> tuple[str, str, str]:
    """
    answer_key format:
    {test_id}::{sub_test_json}::{item_id}
    """
    parts = str(answer_key).split("::")
    if len(parts) < 3:
        return "", "", ""
    test_id = parts[0].strip().upper()
    item_id = parts[-1].strip()
    sub_test_json = "::".join(parts[1:-1]).strip()
    return test_id, sub_test_json, item_id


def filter_answers_by_test(answers: dict[str, str], test_id: str) -> dict[str, str]:
    normalized = str(test_id).strip().upper()
    selected: dict[str, str] = {}
    for key, value in (answers or {}).items():
        key_test_id, _, item_id = split_answer_key(key)
        if key_test_id != normalized or not item_id:
            continue
        selected[item_id] = str(value)
    return selected
