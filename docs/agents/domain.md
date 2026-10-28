# Domain Docs

## Before exploring, read these

- `CONTEXT.md` at the repository root.
- `CONTEXT-MAP.md`, if one exists.
- Relevant decisions under `docs/adr/`.

If any file is absent, proceed silently.

## File structure

This is a single-context repository:

```
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

Use the terminology defined in `CONTEXT.md` in issues, proposals, hypotheses and tests. Avoid synonyms explicitly rejected by the glossary.

If a required concept is missing, reconsider the terminology or record the gap for the domain-modeling workflow.

## Flag ADR conflicts

Explicitly identify when a proposal contradicts an existing ADR rather than silently overriding it.
