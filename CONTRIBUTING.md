# Contributing

## Commit messages

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) for new commits and pull request titles:

```text
type(scope): description
```

The scope is optional. Use a short name for the area changed, such as `canvas`, `cli`, or `mcp`.

Choose a type that describes the change:

| Type       | Change                                      |
| ---------- | ------------------------------------------- |
| `feat`     | Add a feature                               |
| `fix`      | Fix a bug                                   |
| `docs`     | Update documentation                        |
| `refactor` | Restructure code without changing behavior  |
| `perf`     | Improve performance                         |
| `test`     | Add or update tests                         |
| `build`    | Change dependencies or build tooling        |
| `ci`       | Change CI workflows                         |
| `style`    | Change formatting without changing behavior |
| `chore`    | Perform other maintenance                   |
| `revert`   | Revert a previous change                    |

Write a concise, imperative description without a trailing period. Keep the entire first line within 100 characters. Separate an optional body or footer from the preceding text with a blank line.

Examples:

```text
feat(canvas): add alignment guides
fix(cli): preserve existing workspace files
docs: clarify MCP setup
chore: adopt conventional commits
```

Mark breaking changes with `!` immediately before the colon or a `BREAKING CHANGE:` footer. Explain the migration in the body or footer:

```text
feat(mcp)!: rename the review tool

BREAKING CHANGE: replace calls to submit_review with submit_feedback.
```

This convention applies from its adoption onward. Existing commits and release tags retain their history. Use the same format for squash commit messages; preserve any breaking change details when squashing.

## Validation

Run `npm ci` after cloning or creating a worktree. It installs the development tools and enables the Husky `commit-msg` hook in that checkout. The hook runs commitlint before each commit.

To check a message or a branch manually:

```sh
printf '%s\n' 'fix(canvas): keep ruler digits visible' | npm run commitlint
npm run commitlint -- --from origin/main --to HEAD --strict --verbose
```

GitHub Actions checks new commits in each pull request and push to `main`. It also checks pull request titles, including title edits, so the title can become a valid squash commit message.
