# Domain Docs

Before exploring the codebase, read the root `CONTEXT.md` and relevant ADRs under `docs/adr/` when they exist.

This repository uses the single-context layout:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

Missing domain files should not block work. The domain-modeling workflow creates them lazily when terminology or architectural decisions are resolved.

Use terminology defined in `CONTEXT.md`. Explicitly surface conflicts with existing ADRs instead of silently overriding them.
