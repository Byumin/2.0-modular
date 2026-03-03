from datetime import date

from app.services.test_a_adapter import (
    match_a_sub_test_by_age,
    match_a_sub_test_by_school_age,
)

# school_age와 실제 만 나이 대조를 위한 범위(연 단위, 서비스 기준 가정치)
SCHOOL_AGE_YEAR_RANGE: dict[str, tuple[int, int]] = {
    "미취학": (0, 99),
    "초등 1학년": (7, 8),
    "초등 2학년": (8, 9),
    "초등 3학년": (9, 10),
    "초등 4학년": (10, 11),
    "초등 5학년": (11, 12),
    "초등 6학년": (12, 13),
    "중등 1학년": (13, 14),
    "중등 2학년": (14, 15),
    "중등 3학년": (15, 16),
    "고등 1학년": (16, 17),
    "고등 2학년": (17, 18),
    "고등 3학년": (18, 19),
    "초등학교 졸업생": (13, 99),
    "중학교 졸업생": (16, 99),
    "고등학교 졸업생": (18, 99),
    "대학생 신입생": (19, 21),
    "대학생 재학생": (20, 26),
    "대학생 졸업생": (18, 99),
    "대학원 신입생": (22, 35),
    "대학원 재학생": (23, 45),
    "대학원 졸업생": (18, 99),
}


def calc_age_months(birth_day: date, as_of: date) -> int:
    months = (as_of.year - birth_day.year) * 12 + (as_of.month - birth_day.month)
    if as_of.day < birth_day.day:
        months -= 1
    return max(months, 0)


def calc_age_detail(birth_day: date, as_of: date) -> tuple[int, int, int]:
    years = as_of.year - birth_day.year
    months = as_of.month - birth_day.month
    days = as_of.day - birth_day.day

    if days < 0:
        prev_month_last_day = (as_of.replace(day=1) - date.resolution).day
        days += prev_month_last_day
        months -= 1

    if months < 0:
        months += 12
        years -= 1

    return max(years, 0), max(months, 0), max(days, 0)


def make_sub_test_json(
    birth_day: date,
    school_age: str,
    as_of: date,
    gender: str | None = None,
) -> dict:
    age_months = calc_age_months(birth_day, as_of)
    age_years, age_month_only, age_days = calc_age_detail(birth_day, as_of)
    age_days_total = max((as_of - birth_day).days, 0)

    reasons: list[str] = []
    if age_months < 36:
        reasons.append("만 3세 미만으로 검사 최소 연령 기준에 미달합니다.")

    expected_range = SCHOOL_AGE_YEAR_RANGE.get(school_age)
    school_age_consistent = True
    if expected_range is not None:
        min_year, max_year = expected_range
        school_age_consistent = min_year <= age_years <= max_year
        if not school_age_consistent:
            reasons.append(
                f"학령({school_age})과 생년월일 기준 만 나이({age_years}세)가 일반 범위와 다릅니다."
            )

    school_age_axis_rule = match_a_sub_test_by_school_age(school_age)
    age_axis_rule = match_a_sub_test_by_age(age_months)

    # 특이 케이스 대응: 최종 매칭은 연령 축을 우선, 없으면 학령 축을 사용
    matched_rule = age_axis_rule or school_age_axis_rule

    if matched_rule is None:
        reasons.append("현재 입력 조합에 해당하는 A-sub 검사 규칙이 없습니다.")
    elif (
        school_age_axis_rule is not None
        and age_axis_rule is not None
        and school_age_axis_rule["sub_test_code"] != age_axis_rule["sub_test_code"]
    ):
        reasons.append("학령 축과 연령 축이 서로 다른 A-sub 규칙을 가리킵니다.")

    # 검사 가능 여부는 학령 축 불일치 여부와 무관하게 연령 기준 중심으로 판단
    can_take = age_axis_rule is not None and age_months >= 36

    adapter = {
        "test_code": "A",
        "matched": matched_rule is not None,
        "matched_sub_test_code": matched_rule["sub_test_code"] if matched_rule else None,
        "norm_group": matched_rule["norm_group"] if matched_rule else None,
        "item_set_code": matched_rule["item_set_code"] if matched_rule else None,
        "school_age_consistent": school_age_consistent,
        "axes": {
            "school_age_axis": {
                "matched": school_age_axis_rule is not None,
                "sub_test_code": school_age_axis_rule["sub_test_code"] if school_age_axis_rule else None,
                "norm_group": school_age_axis_rule["norm_group"] if school_age_axis_rule else None,
                "item_set_code": school_age_axis_rule["item_set_code"] if school_age_axis_rule else None,
            },
            "age_axis": {
                "matched": age_axis_rule is not None,
                "sub_test_code": age_axis_rule["sub_test_code"] if age_axis_rule else None,
                "norm_group": age_axis_rule["norm_group"] if age_axis_rule else None,
                "item_set_code": age_axis_rule["item_set_code"] if age_axis_rule else None,
            },
        },
    }

    return {
        "version": "1.1",
        "input": {
            "birth_day": birth_day.isoformat(),
            "gender": gender,
            "school_age": school_age,
            "assessment_date": as_of.isoformat(),
        },
        "derived": {
            "age_months": age_months,
            "age_years": age_years,
            "age_days": age_days_total,
            "age_detail": {
                "years": age_years,
                "months": age_month_only,
                "days": age_days,
            },
        },
        "eligibility": {
            "can_take": can_take,
            "reasons": reasons,
        },
        "adapters": {
            "A": adapter,
        },
    }
