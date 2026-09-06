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
        return [{"stage": "schema", "kind": "missing-columns", "values": missing_columns}]

    for row_number, row in enumerate(rows, start=2):
        text = row["age"]
        if text:
            try:
                parse_age(text)
            except ValueError:
                issues.append({"stage": "types", "kind": "invalid-age", "row": row_number, "value": text})

    for row_number, row in enumerate(rows, start=2):
        for column in REQUIRED_COLUMNS:
            if not row[column].strip():
                issues.append({"stage": "missing", "kind": "blank-value", "row": row_number, "column": column})

    seen = set()
    for row_number, row in enumerate(rows, start=2):
        value = row["id"]
        if value in seen:
            issues.append({"stage": "duplicates", "kind": "duplicate-id", "row": row_number, "value": value})
        else:
            seen.add(value)
    return issues


def inspect_csv(path):
    with Path(path).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return inspect_rows(reader.fieldnames, list(reader))
