# LWC Datatable Plus

A feature-rich Lightning Web Component datatable for the Salesforce platform. The component uses the platform's standard datatable as its rendering base and adds the capabilities described in the agreed feature catalog through focused LWC layers and Apex data services.

## Status

Task 1 complete: Salesforce DX scaffold, formatter/linter setup, validation scripts, and a verified metadata smoke slice.

## Repository layout

- `force-app/main/default/lwc/` — Lightning Web Components
- `force-app/main/default/classes/` — Apex controllers and tests
- `docs/` — specification, API reference, and decision records
- `.opencode/skills/` — installed engineering workflows
- `.opencode/references/` — shared quality checklists
- `.opencode/commands/` — lifecycle command wrappers
- `AGENTS.md` — project rules for humans and agents

## Development workflow

Work is delivered in small, verifiable tasks. Each task follows this loop:

1. Define or update the spec and acceptance criteria.
2. Implement one thin vertical slice.
3. Run formatter checks, lint, LWC tests, org deploy, and Apex tests.
4. Review the change against the five quality axes.
5. Update README and the relevant docs.
6. Commit with a descriptive message and push before starting the next task.

## Validation org

Deploys and Apex tests run against the Salesforce CLI org alias `dtp-dev`. It is a user-provided validation org and must be treated as disposable. Credentials are never stored in this repository, in scripts, or in shell history.

## Naming

This project uses neutral product terminology only: `datatable-plus`, `<c-datatable-plus>`, and "the agreed feature catalog". Third-party UI framework and library names are deliberately excluded from code, tests, documentation, and commit messages.

## Commands

| Command                     | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `npm install`               | Install pinned development tooling                      |
| `npm run format`            | Apply the gofmt-inspired formatter                      |
| `npm run format:check`      | Fail if any tracked file is not formatted               |
| `npm run lint`              | Lint local LWC JavaScript                               |
| `npm run test:lwc`          | Run LWC unit tests                                      |
| `npm run test:lwc:coverage` | Run LWC unit tests with coverage                        |
| `npm run test:apex`         | Run Apex tests in the validation org                    |
| `npm run deploy`            | Deploy source to the validation org without Apex tests  |
| `npm run deploy:validate`   | Validate a deploy with local Apex tests, without saving |
| `npm run verify`            | Run the full task verification gate                     |

See [CONSTRAINTS.md](CONSTRAINTS.md) for the thresholds and [tooling decisions](docs/tooling.md) for the sources behind the configuration.
