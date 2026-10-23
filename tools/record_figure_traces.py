#!/usr/bin/env python3
"""Record the finite, authored F1 programs with CPython's tracing API.

The input selects a program and one of its enumerated parameters. It never
accepts source text, imports, paths, or executable expressions.
"""

from __future__ import annotations

import builtins
import ast
import contextlib
import hashlib
import io
import json
import sys
import types

MAX_EVENTS = 2048
MAX_OBJECTS = 512
MAX_OUTPUT = 8192
MAX_REPR = 2048


def program_source(program_id: str, params: dict) -> tuple[str, dict]:
    if not isinstance(params, dict):
        raise ValueError("parameters must be an object")
    if program_id == "name-tags" and not params:
        return "a = 3\nb = a + 4\na = b - 2\nprint(a, b)", {}
    if program_id == "bouncer" and set(params) == {"age"} and type(params["age"]) is int and params["age"] in (16, 17, 18):
        age = params["age"]
        return f"age = {age}\nok = age >= 18 and ticket\nprint(ok)", {"age": age}
    if program_id == "vending-frame" and not params:
        return "def f(x):\n    return x + 10\ndef g(x):\n    return x * 3\nx = f(g(2))\nprint(x)", {}
    if program_id == "ledger" and set(params) == {"n0"} and type(params["n0"]) is int and 1 <= params["n0"] <= 4:
        n0 = params["n0"]
        return f"n = {n0}\nsumme = 0\nwhile n > 0:\n    summe += n\n    n -= 1\nprint(summe, n)", {"n0": n0, "sum0": 0}
    if program_id == "ledger" and set(params) == {"n0", "sum0"} and type(params["n0"]) is int and 1 <= params["n0"] <= 4 and type(params["sum0"]) is int and 0 <= params["sum0"] <= 3:
        n0, sum0 = params["n0"], params["sum0"]
        return f"n = {n0}\nsumme = {sum0}\nwhile n > 0:\n    summe += n\n    n -= 1\nprint(summe, n)", {"n0": n0, "sum0": sum0}
    if program_id == "two-tags-one-list" and not params:
        return "x = [-6, 3]\ny = x\ny.append(2)\nx[0] = 9\nx = [0]\nprint(y)", {}
    if program_id == "dictionary" and not params:
        return "lage = {'start': 1}\nlage['ende'] = -1\nlage['start'] = -2\ndel lage['ende']", {}
    if program_id == "smoke-detector" and not params:
        return "werte = [9, 6]\nwert = werte[9]\nassert wert == 6", {}
    raise ValueError("unsupported F1 program or parameter set")


def safe_value(value):
    value_type = type(value)
    if value_type is types.FunctionType:
        return {"type": "function", "value": f"<function {value.__name__}>"}
    if value_type not in (type(None), bool, int, float, str, list, tuple, dict):
        raise ValueError("unsupported trace value type")
    rendered = repr(value)
    if len(rendered) > MAX_REPR:
        raise ValueError("trace value exceeds limit")
    return {"type": value_type.__name__, "value": rendered}


def record_trace(program_id: str, params: dict) -> dict:
    source, inputs = program_source(program_id, params)
    source_bytes = source.encode("utf-8")
    if len(source_bytes) > 8192 or "\r" in source or "\x00" in source:
        raise ValueError("source exceeds trace limits")

    filename = f"<argmin-f1:{program_id}>"
    definition_lines = {node.lineno for node in ast.walk(ast.parse(source)) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}
    output = io.StringIO()
    frame_ids: dict[int, str] = {}
    frame_refs: dict[int, types.FrameType] = {}
    object_ids: dict[int, tuple[object, str]] = {}
    pending_lines: dict[str, int] = {}
    events: list[dict] = []

    def identity_for_frame(frame: types.FrameType) -> str:
        key = id(frame)
        if key not in frame_ids:
            frame_ids[key] = f"frame:{len(frame_ids)}"
            frame_refs[key] = frame
        return frame_ids[key]

    def identity_for_object(value: object) -> str:
        key = id(value)
        existing = object_ids.get(key)
        if existing is not None and existing[0] is value:
            return existing[1]
        if len(object_ids) >= MAX_OBJECTS:
            raise ValueError("trace object limit exceeded")
        identity = f"object:{len(object_ids)}"
        object_ids[key] = (value, identity)
        return identity

    def emit_line(frame: types.FrameType, line: int):
        if line not in definition_lines:
            emit(frame, "line", line)

    def active_frames(frame: types.FrameType):
        stack = []
        current = frame
        while current is not None:
            if current.f_code.co_filename == filename:
                stack.append(current)
            current = current.f_back
        return list(reversed(stack))

    def emit(frame: types.FrameType, event_name: str, line: int, result=None, exception=None, start=False):
        if len(events) >= MAX_EVENTS:
            raise ValueError("trace event limit exceeded")
        stack = active_frames(frame)
        bindings = {}
        objects = {}
        for active in stack:
            frame_id = identity_for_frame(active)
            function = active.f_code.co_name
            for name, value in active.f_locals.items():
                if name.startswith("__"):
                    continue
                if type(value) is types.FunctionType:
                    continue
                object_id = identity_for_object(value)
                bindings[f"{frame_id}:{name}"] = object_id
                objects[object_id] = safe_value(value)
        frame_id = identity_for_frame(frame)
        parent = frame.f_back
        parent_id = identity_for_frame(parent) if parent is not None and parent.f_code.co_filename == filename else None
        record = {
            "ordinal": len(events),
            "frameId": frame_id,
            "parentFrameId": parent_id,
            "function": "<module>" if frame.f_code.co_name == "<module>" else frame.f_code.co_name,
            "event": event_name,
            "line": line,
            "bindings": {} if start else bindings,
            "objects": {} if start else objects,
            "output": output.getvalue(),
        }
        if event_name == "return":
            result_id = identity_for_object(result)
            record["result"] = result_id
            record["objects"].setdefault(result_id, safe_value(result))
        if event_name == "exception":
            record["exception"] = {"type": exception.__name__, "line": line}
        events.append(record)

    def tracer(frame: types.FrameType, event_name: str, arg):
        if frame.f_code.co_filename != filename:
            return None
        frame_id = identity_for_frame(frame)
        if event_name == "call":
            if frame.f_code.co_name == "<module>":
                emit(frame, "start", 0, start=True)
            else:
                emit(frame, "call", frame.f_code.co_firstlineno)
        elif event_name == "line":
            previous = pending_lines.get(frame_id)
            if previous is not None:
                emit_line(frame, previous)
            pending_lines[frame_id] = frame.f_lineno
        elif event_name == "return":
            previous = pending_lines.pop(frame_id, None)
            if frame.f_code.co_name == "<module>":
                if previous is not None:
                    emit_line(frame, previous)
            else:
                if previous is not None and previous != frame.f_lineno:
                    emit_line(frame, previous)
                emit(frame, "return", frame.f_lineno, result=arg)
        elif event_name == "exception":
            pending_lines.pop(frame_id, None)
            error_type = arg[0] if isinstance(arg, tuple) and arg else Exception
            emit(frame, "exception", frame.f_lineno, exception=error_type)
        if len(output.getvalue()) > MAX_OUTPUT:
            raise ValueError("trace output limit exceeded")
        return tracer

    globals_dict = {"__builtins__": {"print": builtins.print}, "__name__": "__main__"}
    try:
        code = compile(source, filename, "exec", dont_inherit=True, optimize=0)
        sys.settrace(tracer)
        with contextlib.redirect_stdout(output):
            exec(code, globals_dict, globals_dict)
    except Exception:
        # An authored exception is part of the trace; the trace callback has
        # already recorded it. Recorder and policy failures still propagate.
        if not events or events[-1]["event"] != "exception":
            raise
    finally:
        sys.settrace(None)

    normalized = output.getvalue()
    if len(normalized) > MAX_OUTPUT:
        raise ValueError("trace output limit exceeded")
    return {
        "kind": "python-trace",
        "schemaVersion": 1,
        "programId": program_id,
        "normalization": "s6a-visible-events/v1",
        "source": source,
        "sourceHash": hashlib.sha256(source_bytes).hexdigest(),
        "pythonVersion": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "inputs": {name: safe_value(value) for name, value in inputs.items()},
        "events": events,
        "stdout": normalized,
    }


def main() -> int:
    try:
        request = json.load(sys.stdin)
        if not isinstance(request, dict) or set(request) != {"programId", "params"}:
            raise ValueError("request must contain only programId and params")
        result = record_trace(request["programId"], request["params"])
        json.dump(result, sys.stdout, ensure_ascii=False, separators=(",", ":"))
        sys.stdout.write("\n")
        return 0
    except (ValueError, TypeError, KeyError, SyntaxError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
