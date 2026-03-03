TEST_A_RULES = [
    {
        "sub_test_code": "A-SUB-PRE",
        "school_ages": ["미취학"],
        "min_age_months": 36,
        "max_age_months": 95,
        "norm_group": "A-NORM-PRE",
        "item_set_code": "A-ITEM-PRE-V1",
    },
    {
        "sub_test_code": "A-SUB-ELEM",
        "school_ages": [
            "초등 1학년",
            "초등 2학년",
            "초등 3학년",
            "초등 4학년",
            "초등 5학년",
            "초등 6학년",
        ],
        "min_age_months": 84,
        "max_age_months": 167,
        "norm_group": "A-NORM-ELEM",
        "item_set_code": "A-ITEM-ELEM-V2",
    },
    {
        "sub_test_code": "A-SUB-MID-HIGH",
        "school_ages": [
            "중등 1학년",
            "중등 2학년",
            "중등 3학년",
            "고등 1학년",
            "고등 2학년",
            "고등 3학년",
        ],
        "min_age_months": 156,
        "max_age_months": 239,
        "norm_group": "A-NORM-ADOLESCENT",
        "item_set_code": "A-ITEM-ADOLESCENT-V1",
    },
    {
        "sub_test_code": "A-SUB-ADULT",
        "school_ages": [
            "초등학교 졸업생",
            "중학교 졸업생",
            "고등학교 졸업생",
            "대학생 신입생",
            "대학생 재학생",
            "대학생 졸업생",
            "대학원 신입생",
            "대학원 재학생",
            "대학원 졸업생",
        ],
        "min_age_months": 228,
        "max_age_months": 1188,
        "norm_group": "A-NORM-ADULT",
        "item_set_code": "A-ITEM-ADULT-V3",
    },
]


def match_a_sub_test(school_age: str, age_months: int) -> dict | None:
    for rule in TEST_A_RULES:
        if school_age not in rule["school_ages"]:
            continue
        if rule["min_age_months"] <= age_months <= rule["max_age_months"]:
            return rule
    return None


def match_a_sub_test_by_school_age(school_age: str) -> dict | None:
    for rule in TEST_A_RULES:
        if school_age in rule["school_ages"]:
            return rule
    return None


def match_a_sub_test_by_age(age_months: int) -> dict | None:
    for rule in TEST_A_RULES:
        if rule["min_age_months"] <= age_months <= rule["max_age_months"]:
            return rule
    return None
