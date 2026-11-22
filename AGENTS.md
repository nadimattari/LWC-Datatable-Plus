# Project Agent Guidance

This repository uses the engineering skills installed under `.opencode/skills/`.

## Naming rule

Use only the neutral names defined in this repository: `datatable-plus`, `<c-datatable-plus>`, and "the agreed feature catalog". Never name third-party UI frameworks or libraries in source, tests, documentation, commit messages, or status updates.

## Core rules

- Check whether a skill applies before starting any work.
- Load the skill with the `skill` tool when it is available; otherwise read `.opencode/skills/<skill-name>/SKILL.md` directly.
- Follow the skill workflow in order. Do not partially apply a skill.
- Never skip verification steps, tests, review, or documentation updates.
- Apply the standing checklist in `.opencode/references/definition-of-done.md` to every change.

## Intent to skill mapping

- New feature, change, or requirement -> `spec-driven-development`
- No written quality bar -> `constraint-driven-development`
- Planning or breakdown -> `planning-and-task-breakdown`
- Implementation -> `incremental-implementation`
- User-facing interface work -> `frontend-ui-engineering`
- Public API or component contract -> `api-and-interface-design`
- Framework or platform decision -> `source-driven-development`
- High-stakes or unfamiliar decision -> `doubt-driven-development`
- Tests -> `test-driven-development`
- Browser investigation -> `browser-testing-with-devtools`
- Failure or unexpected behavior -> `debugging-and-error-recovery`
- Code review -> `code-review-and-quality`
- Complexity reduction -> `code-simplification`
- Security concerns -> `security-and-hardening`
- Performance concerns -> `performance-optimization`
- Accessibility audit -> `accessibility-engineering`
- Commit, branch, or push -> `git-workflow-and-versioning`
- Pipeline work -> `ci-cd-and-automation`
- Docs and decision records -> `documentation-and-adrs`
- Deploy and release -> `shipping-and-launch`

## Project-specific rules

- Salesforce DX source lives in `force-app/main/default`.
- Validate deploys and Apex tests against the org aliased `dtp-dev`. It is a user-provided validation org, not production.
- Never place credentials in source files, scripts, environment files, shell history, or commit messages.
- JavaScript and Apex use the gofmt-inspired formatter configuration introduced in Task 1.
- Each task ends with tests, review, documentation updates, a descriptive commit, and a push before the next task starts.
- Keep `main` deployable. Do not push a task commit if its verification gate fails.
