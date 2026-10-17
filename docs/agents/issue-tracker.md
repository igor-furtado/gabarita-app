# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create an issue with `gh issue create`.
- Read issues and comments with `gh issue view`.
- List issues using `gh issue list`.
- Comment with `gh issue comment`.
- Apply or remove labels with `gh issue edit`.
- Close issues with `gh issue close`.
- Infer the repository from the configured Git remote.

## Pull requests as a triage surface

PRs as a request surface: no.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read the corresponding issue and its comments using `gh issue view`.

## Wayfinding operations

Wayfinding maps and child tickets are represented as GitHub issues. Prefer native sub-issues and issue dependencies, falling back to task lists and `Blocked by` references when unavailable.
