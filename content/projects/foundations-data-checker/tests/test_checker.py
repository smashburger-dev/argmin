from src.checker import inspect_rows


def kinds(issues):
    return {(issue["stage"], issue["kind"]) for issue in issues}


def test_valid_rows_have_no_issues():
    rows = [{"id": "a1", "name": "Ada", "age": "19"}, {"id": "a2", "name": "Lin", "age": "21"}]
    assert inspect_rows(["id", "name", "age"], rows) == []


def test_missing_columns_stop_at_schema_stage():
    issues = inspect_rows(["id", "name"], [{"id": "a1", "name": "Ada"}])
    assert issues == [{"stage": "schema", "kind": "missing-columns", "values": ["age"]}]


def test_invalid_age_is_a_type_issue():
    issues = inspect_rows(["id", "name", "age"], [{"id": "a1", "name": "Ada", "age": "neunzehn"}])
    assert ("types", "invalid-age") in kinds(issues)


def test_blank_values_are_reported_with_row_and_column():
    issues = inspect_rows(["id", "name", "age"], [{"id": "a1", "name": "", "age": "19"}])
    assert {"stage": "missing", "kind": "blank-value", "row": 2, "column": "name"} in issues


def test_duplicate_ids_are_reported_once():
    rows = [{"id": "a1", "name": "Ada", "age": "19"}, {"id": "a1", "name": "Lin", "age": "21"}]
    issues = inspect_rows(["id", "name", "age"], rows)
    expected = {"stage": "duplicates", "kind": "duplicate-id", "row": 3, "value": "a1"}
    assert issues.count(expected) == 1
