// Frozen CPython 3.14.7 sys.settrace captures; no JavaScript execution of Python.
// See docs/session-2026-10-17-figuren-s6a.md for provenance and solver checks.
export const records = {
  "name-tags": {
    "code": [
      "a = 3",
      "b = a + 4",
      "a = b - 2",
      "print(a, b)"
    ],
    "steps": [
      {
        "event": "start",
        "line": 0,
        "scope": "<module>",
        "bindings": {},
        "objects": {},
        "output": ""
      },
      {
        "event": "line",
        "line": 1,
        "scope": "<module>",
        "bindings": {
          "global.a": "o1"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "3"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 2,
        "scope": "<module>",
        "bindings": {
          "global.a": "o1",
          "global.b": "o2"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "3"
          },
          "o2": {
            "type": "int",
            "value": "7"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.a": "o3",
          "global.b": "o2"
        },
        "objects": {
          "o3": {
            "type": "int",
            "value": "5"
          },
          "o2": {
            "type": "int",
            "value": "7"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 4,
        "scope": "<module>",
        "bindings": {
          "global.a": "o3",
          "global.b": "o2"
        },
        "objects": {
          "o3": {
            "type": "int",
            "value": "5"
          },
          "o2": {
            "type": "int",
            "value": "7"
          }
        },
        "output": "5 7\n"
      }
    ],
    "python": "3.14.7"
  },
  "bouncer": {
    "code": [
      "age = 16",
      "ok = age >= 18 and ticket",
      "print(ok)"
    ],
    "steps": [
      {
        "event": "start",
        "line": 0,
        "scope": "<module>",
        "bindings": {},
        "objects": {},
        "output": ""
      },
      {
        "event": "line",
        "line": 1,
        "scope": "<module>",
        "bindings": {
          "global.age": "o1"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "16"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 2,
        "scope": "<module>",
        "bindings": {
          "global.age": "o1",
          "global.ok": "o2"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "16"
          },
          "o2": {
            "type": "bool",
            "value": "False"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.age": "o1",
          "global.ok": "o2"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "16"
          },
          "o2": {
            "type": "bool",
            "value": "False"
          }
        },
        "output": "False\n"
      }
    ],
    "python": "3.14.7"
  },
  "vending-frame": {
    "code": [
      "def f(x):",
      "    return x + 10",
      "def g(x):",
      "    return x * 3",
      "x = f(g(2))",
      "print(x)"
    ],
    "steps": [
      {
        "event": "start",
        "line": 0,
        "scope": "<module>",
        "bindings": {},
        "objects": {},
        "output": ""
      },
      {
        "event": "call",
        "line": 3,
        "scope": "g",
        "bindings": {
          "g.x": "o1"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "2"
          }
        },
        "output": ""
      },
      {
        "event": "return",
        "line": 4,
        "scope": "g",
        "bindings": {
          "g.x": "o1"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "2"
          },
          "o2": {
            "type": "int",
            "value": "6"
          }
        },
        "output": "",
        "result": "o2"
      },
      {
        "event": "call",
        "line": 1,
        "scope": "f",
        "bindings": {
          "f.x": "o2"
        },
        "objects": {
          "o2": {
            "type": "int",
            "value": "6"
          }
        },
        "output": ""
      },
      {
        "event": "return",
        "line": 2,
        "scope": "f",
        "bindings": {
          "f.x": "o2"
        },
        "objects": {
          "o2": {
            "type": "int",
            "value": "6"
          },
          "o3": {
            "type": "int",
            "value": "16"
          }
        },
        "output": "",
        "result": "o3"
      },
      {
        "event": "line",
        "line": 5,
        "scope": "<module>",
        "bindings": {
          "global.x": "o3"
        },
        "objects": {
          "o3": {
            "type": "int",
            "value": "16"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 6,
        "scope": "<module>",
        "bindings": {
          "global.x": "o3"
        },
        "objects": {
          "o3": {
            "type": "int",
            "value": "16"
          }
        },
        "output": "16\n"
      }
    ],
    "python": "3.14.7"
  },
  "ledger": {
    "code": [
      "n = 3",
      "summe = 0",
      "while n > 0:",
      "    summe += n",
      "    n -= 1",
      "print(summe, n)"
    ],
    "steps": [
      {
        "event": "start",
        "line": 0,
        "scope": "<module>",
        "bindings": {},
        "objects": {},
        "output": ""
      },
      {
        "event": "line",
        "line": 1,
        "scope": "<module>",
        "bindings": {
          "global.n": "o1"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "3"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 2,
        "scope": "<module>",
        "bindings": {
          "global.n": "o1",
          "global.summe": "o2"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "3"
          },
          "o2": {
            "type": "int",
            "value": "0"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.n": "o1",
          "global.summe": "o2"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "3"
          },
          "o2": {
            "type": "int",
            "value": "0"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 4,
        "scope": "<module>",
        "bindings": {
          "global.n": "o1",
          "global.summe": "o1"
        },
        "objects": {
          "o1": {
            "type": "int",
            "value": "3"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 5,
        "scope": "<module>",
        "bindings": {
          "global.n": "o3",
          "global.summe": "o1"
        },
        "objects": {
          "o3": {
            "type": "int",
            "value": "2"
          },
          "o1": {
            "type": "int",
            "value": "3"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.n": "o3",
          "global.summe": "o1"
        },
        "objects": {
          "o3": {
            "type": "int",
            "value": "2"
          },
          "o1": {
            "type": "int",
            "value": "3"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 4,
        "scope": "<module>",
        "bindings": {
          "global.n": "o3",
          "global.summe": "o4"
        },
        "objects": {
          "o3": {
            "type": "int",
            "value": "2"
          },
          "o4": {
            "type": "int",
            "value": "5"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 5,
        "scope": "<module>",
        "bindings": {
          "global.n": "o5",
          "global.summe": "o4"
        },
        "objects": {
          "o5": {
            "type": "int",
            "value": "1"
          },
          "o4": {
            "type": "int",
            "value": "5"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.n": "o5",
          "global.summe": "o4"
        },
        "objects": {
          "o5": {
            "type": "int",
            "value": "1"
          },
          "o4": {
            "type": "int",
            "value": "5"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 4,
        "scope": "<module>",
        "bindings": {
          "global.n": "o5",
          "global.summe": "o6"
        },
        "objects": {
          "o5": {
            "type": "int",
            "value": "1"
          },
          "o6": {
            "type": "int",
            "value": "6"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 5,
        "scope": "<module>",
        "bindings": {
          "global.n": "o2",
          "global.summe": "o6"
        },
        "objects": {
          "o2": {
            "type": "int",
            "value": "0"
          },
          "o6": {
            "type": "int",
            "value": "6"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.n": "o2",
          "global.summe": "o6"
        },
        "objects": {
          "o2": {
            "type": "int",
            "value": "0"
          },
          "o6": {
            "type": "int",
            "value": "6"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 6,
        "scope": "<module>",
        "bindings": {
          "global.n": "o2",
          "global.summe": "o6"
        },
        "objects": {
          "o2": {
            "type": "int",
            "value": "0"
          },
          "o6": {
            "type": "int",
            "value": "6"
          }
        },
        "output": "6 0\n"
      }
    ],
    "python": "3.14.7"
  },
  "two-tags-one-list": {
    "code": [
      "x = [-6, 3]",
      "y = x",
      "y.append(2)",
      "x[0] = 9",
      "x = [0]",
      "print(y)"
    ],
    "steps": [
      {
        "event": "start",
        "line": 0,
        "scope": "<module>",
        "bindings": {},
        "objects": {},
        "output": ""
      },
      {
        "event": "line",
        "line": 1,
        "scope": "<module>",
        "bindings": {
          "global.x": "o1"
        },
        "objects": {
          "o1": {
            "type": "list",
            "value": "[-6, 3]"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 2,
        "scope": "<module>",
        "bindings": {
          "global.x": "o1",
          "global.y": "o1"
        },
        "objects": {
          "o1": {
            "type": "list",
            "value": "[-6, 3]"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.x": "o1",
          "global.y": "o1"
        },
        "objects": {
          "o1": {
            "type": "list",
            "value": "[-6, 3, 2]"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 4,
        "scope": "<module>",
        "bindings": {
          "global.x": "o1",
          "global.y": "o1"
        },
        "objects": {
          "o1": {
            "type": "list",
            "value": "[9, 3, 2]"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 5,
        "scope": "<module>",
        "bindings": {
          "global.x": "o2",
          "global.y": "o1"
        },
        "objects": {
          "o2": {
            "type": "list",
            "value": "[0]"
          },
          "o1": {
            "type": "list",
            "value": "[9, 3, 2]"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 6,
        "scope": "<module>",
        "bindings": {
          "global.x": "o2",
          "global.y": "o1"
        },
        "objects": {
          "o2": {
            "type": "list",
            "value": "[0]"
          },
          "o1": {
            "type": "list",
            "value": "[9, 3, 2]"
          }
        },
        "output": "[9, 3, 2]\n"
      }
    ],
    "python": "3.14.7"
  },
  "dictionary": {
    "code": [
      "lage = {'start': 1}",
      "lage['ende'] = -1",
      "lage['start'] = -2",
      "del lage['ende']"
    ],
    "steps": [
      {
        "event": "start",
        "line": 0,
        "scope": "<module>",
        "bindings": {},
        "objects": {},
        "output": ""
      },
      {
        "event": "line",
        "line": 1,
        "scope": "<module>",
        "bindings": {
          "global.lage": "o1"
        },
        "objects": {
          "o1": {
            "type": "dict",
            "value": "{'start': 1}"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 2,
        "scope": "<module>",
        "bindings": {
          "global.lage": "o1"
        },
        "objects": {
          "o1": {
            "type": "dict",
            "value": "{'start': 1, 'ende': -1}"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 3,
        "scope": "<module>",
        "bindings": {
          "global.lage": "o1"
        },
        "objects": {
          "o1": {
            "type": "dict",
            "value": "{'start': -2, 'ende': -1}"
          }
        },
        "output": ""
      },
      {
        "event": "line",
        "line": 4,
        "scope": "<module>",
        "bindings": {
          "global.lage": "o1"
        },
        "objects": {
          "o1": {
            "type": "dict",
            "value": "{'start': -2}"
          }
        },
        "output": ""
      }
    ],
    "python": "3.14.7"
  },
  "smoke-detector": {
    "code": [
      "werte = [9, 6]",
      "wert = werte[9]",
      "assert wert == 6"
    ],
    "steps": [
      {
        "event": "start",
        "line": 0,
        "scope": "<module>",
        "bindings": {},
        "objects": {},
        "output": ""
      },
      {
        "event": "line",
        "line": 1,
        "scope": "<module>",
        "bindings": {
          "global.werte": "o1"
        },
        "objects": {
          "o1": {
            "type": "list",
            "value": "[9, 6]"
          }
        },
        "output": ""
      },
      {
        "event": "exception",
        "line": 2,
        "scope": "<module>",
        "bindings": {
          "global.werte": "o1"
        },
        "objects": {
          "o1": {
            "type": "list",
            "value": "[9, 6]"
          }
        },
        "output": "",
        "exception": "IndexError"
      }
    ],
    "python": "3.14.7"
  }
};
