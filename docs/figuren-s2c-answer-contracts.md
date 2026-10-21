# Shared figure answer contracts S2c

This document defines the shared, versioned answer envelope for graded figure tasks. It does not register families or make direct scene selection into a graded answer.

## Persistence envelope

Graded figure answers use the existing `scene-build` v1 envelope:

```json
{"kind":"scene-build","schemaVersion":1,"form":{},"steps":[]}
```

`form` contains the final submitted values and `steps` contains ordered, JSON-only model operations. Camera, pointer, selection-highlight, and other transient view state never belongs in an answer. A null answer is valid only for non-attempt events such as hint use or solution reveal. Attempts with unknown kinds or schema versions fail closed. Progress database and JSON export remain schema version 3; answer contracts are versioned inside the answer envelope.

Each graded task also declares a task contract under `expectedAnswer`, separate from the learner envelope. Its `kind` and `schemaVersion` are validated by the deterministic task grader.

## `pick-learning-rate/v1`

Answer: `form: { eta: number }`, `steps: []`. Task contract: `{kind:'pick-learning-rate',schemaVersion:1,lossIncreaseTolerance,distanceTolerance}`. The exercise parameters declare the objective, initial state, maximum update count, and acceptable terminal distance. The grader receives the family's deterministic `simulate(parameters, eta)` adapter, which must call its authoritative reference solver and return `{steps:[{loss,distance}], ...}`. `eta` must be finite and within the authored exercise's closed parameter range and step grid. An answer is correct when no intermediate loss rises beyond `lossIncreaseTolerance` and the final distance is at most `distanceTolerance`. Every qualifying grid value is accepted; one canonical answer is not required. Feedback reports the simulated run and the first violating update or terminal distance. The family's exact model keys and tolerance must be declared alongside its exercise contract before registration.

## `tag-after-line/v1`

Answer: `form: { tags: [{ lineId, bindings: [{ name, objectId }] }] }`, `steps: []`. Task contract: `{kind:'tag-after-line',schemaVersion:1,states:[{lineId,bindings:[{name,objectId}]}]}`. `lineId` identifies the trace state after the executed source line. Each binding names the value attached to that name at that state; aliases remain separate `name` entries that may share one `objectId`. Every expected binding must be submitted exactly once, and unknown lines/names/objects are invalid. The deterministic reference trace is authoritative and compares the complete expected name-to-object relation for each submitted line. Feedback is per name and line. Ordered source and state IDs are fixed by `python-trace/v1`; submitted display labels, pointer locations, and selection-only highlights are not persisted.

## Attempt and interchange rules

Attempt records keep the existing fields and preserve their answer as JSON. Snapshotting validates and deep-copies the answer before persistence. Export/import roundtrips retain form values and step order byte-for-byte at the JSON data-model level. Unsupported answer schema versions and malformed envelopes reject the import; no silent downgrade, coercion, or database migration is performed. Graders return the existing deterministic result shape (`correct`, `errorType`, `fields`, `simulation`, and optional mastery/diagnosis metadata) and never delegate correctness to an LLM.

## Validation boundary

JSON Schema validates the shared envelope and exact versioned form shapes. The family contract validator checks exercise parameters and solver support; the deterministic grader validates learner values against that contract and computes the result. Scene selection remains presentation state unless an explicit graded contract such as `tag-after-line/v1` consumes a versioned submitted selection.
