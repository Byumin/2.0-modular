from app.db.session import engine

# DB에서 test_id에 해당하는 모든 sub_test_json과 scale_struct를 가져오는 함수
def fetch_parent_scale_rows_by_test(test_id: str):
    with engine.connect() as conn:
        return conn.exec_driver_sql(
            """
            SELECT sub_test_json, scale_struct
            FROM parent_scale
            WHERE test_id = ?
            ORDER BY sub_test_json
            """,
            (test_id,),
        ).fetchall()


def fetch_parent_scale_struct(test_id: str, sub_test_json: str):
    with engine.connect() as conn:
        return conn.exec_driver_sql(
            """
            SELECT scale_struct
            FROM parent_scale
            WHERE test_id = ? AND sub_test_json = ?
            """,
            (test_id, sub_test_json),
        ).fetchone()


def fetch_parent_catalog_rows():
    with engine.connect() as conn:
        return conn.exec_driver_sql(
            """
            SELECT
                i.test_id,
                i.sub_test_json,
                i.item_json AS item_json,
                i.meta_json AS item_meta_json,
                s.scale_struct,
                c.item_template AS item_template
            FROM parent_item i
            JOIN parent_scale s
              ON s.test_id = i.test_id
             AND s.sub_test_json = i.sub_test_json
            LEFT JOIN parent_item_choice c
              ON c.test_id = i.test_id
             AND c.sub_test_json = i.sub_test_json
            ORDER BY i.test_id, i.sub_test_json
            """
        ).fetchall()


def fetch_parent_item_bundle(test_id: str, sub_test_json: str):
    with engine.connect() as conn:
        return conn.exec_driver_sql(
            """
            SELECT
                i.item_json AS item_json,
                i.meta_json AS item_meta_json,
                s.scale_struct AS scale_struct,
                c.item_template AS item_template
            FROM parent_item i
            JOIN parent_scale s
              ON s.test_id = i.test_id
             AND s.sub_test_json = i.sub_test_json
            LEFT JOIN parent_item_choice c
              ON c.test_id = i.test_id
             AND c.sub_test_json = i.sub_test_json
            WHERE i.test_id = ? AND i.sub_test_json = ?
            LIMIT 1
            """,
            (test_id, sub_test_json),
        ).fetchone()
