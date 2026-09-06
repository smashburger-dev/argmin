import csv
from pathlib import Path

REQUIRED_COLUMNS = ("id", "name", "age")


def parse_age(text):
    value = int(text)
    if not 0 <= value <= 130:
        raise ValueError("age is outside 0..130")
    return value


def inspect_rows(fieldnames, rows):
    issues = []
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in (fieldnames or [])]
    if missing_columns:
        issues.append({"stage": "schema", "kind": "missing-columns", "values": missing_columns})
        return issues

    # Complete stages 2 to 4: types, missing values, and duplicate ids.
    return issues


def inspect_csv(path):
    with Path(path).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return inspect_rows(reader.fieldnames, list(reader))
