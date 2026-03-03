from typing import Literal

Gender = Literal["male", "female"]

SchoolAge = Literal[
    "미취학",
    "초등 1학년",
    "초등 2학년",
    "초등 3학년",
    "초등 4학년",
    "초등 5학년",
    "초등 6학년",
    "중등 1학년",
    "중등 2학년",
    "중등 3학년",
    "고등 1학년",
    "고등 2학년",
    "고등 3학년",
    "초등학교 졸업생",
    "중학교 졸업생",
    "고등학교 졸업생",
    "대학생 신입생",
    "대학생 재학생",
    "대학생 졸업생",
    "대학원 신입생",
    "대학원 재학생",
    "대학원 졸업생",
]


def normalize_gender_value(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("gender must be a string")

    normalized = value.strip().lower()
    mapping = {
        "male": "male",
        "m": "male",
        "남": "male",
        "female": "female",
        "f": "female",
        "여": "female",
    }
    if normalized not in mapping:
        raise ValueError("gender must be male/female")
    return mapping[normalized]
