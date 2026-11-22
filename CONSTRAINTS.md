# Constraints

Last reviewed: 2026-11-22

## Floor (always enforced, no setup required)

- No credentials, tokens, or org-specific secrets in source, scripts, docs, or commit messages.
- No third-party UI framework or library names in project artifacts.
- No new suppression comments without a documented reason in the commit message.
- No skipped or deleted tests without a documented reason in the commit message.
- No unimplemented stubs, empty catch blocks, or placeholder implementations.
- This file does not get weakened to make a change pass.

## Enforced with numbers

| Dimension  | Rule                                                    | Checked by                  | Runs at        |
| ---------- | ------------------------------------------------------- | --------------------------- | -------------- |
| Formatting | Zero files differ from formatter output                 | `npm run format:check`      | every edit, CI |
| Lint       | Zero errors and zero warnings                           | `npm run lint`              | every edit, CI |
| LWC tests  | All tests pass; changed JavaScript lines >= 80% covered | `npm run test:lwc:coverage` | task end, CI   |
| Apex tests | All tests pass; Apex coverage >= 75%                    | `npm run test:apex`         | task end, CI   |
| Deploy     | Clean validation against the validation org             | `npm run deploy:validate`   | task end, CI   |
| Secrets    | No credential values in the tracked diff                | manual diff scan at review  | every commit   |

Every row names the command that produces the verdict. A dimension with a number and no command is an aspiration, not a constraint.

## Measured baseline

| Metric                | Today (Task 1) | Direction               |
| --------------------- | -------------- | ----------------------- |
| LWC project coverage  | 100%           | must not fall below 80% |
| Apex project coverage | 100%           | must not fall below 75% |

## Exceptions

| ID  | Rule | Path | Reason | Owner | Expires |
| --- | ---- | ---- | ------ | ----- | ------- |
| —   | —    | —    | —      | —     | —       |
