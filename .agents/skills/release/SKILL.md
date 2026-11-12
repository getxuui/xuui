---
name: release
description: Release xuui to npm and GitHub, synchronize its companion skills and website, or complete an interrupted release.
---

# Release xuui

Run from the xuui repository root. Read `AGENTS.md`, `CONTRIBUTING.md`, `package.json`, and the CI workflow before changing release metadata. Derive the package name, scripts, Node version, and publish configuration from those files.

For a requested release, carry the work through the release PR, npm publication, GitHub release, companion skills update, and website deployment. Honor narrower requests to prepare or check a release; creating or editing this skill does not authorize a release.

Every full release includes `getxuui/skills` and `getxuui/xuui.com`. Read [release surfaces](references/release-surfaces.md) during preparation to locate those repositories, preserve their local work, and prepare their updates. A release is complete only when their published guidance and the live website agree with the verified npm version.

## Establish the release

Inspect the working tree, fetch `origin` and tags, and query npm for the package's versions and dist-tags. Respect an explicitly requested source, version, or channel. For an ordinary release, use current `origin/main` and the next unused alpha version. xuui's alpha releases currently update both `alpha` and `latest`.

Compare the intended source with the previous published version's `v<version>` tag. Read the intervening commits as well as `CHANGELOG.md`; the Unreleased section may omit merged changes. A published tarball may lack `gitHead`, so use release tags to establish the source history.

For an interrupted release, inspect npm, the release PR, the GitHub release, the companion skill, and the live website first. Resume missing steps for the intended version instead of creating another version or republishing it. If only the skills or website lag, update them for that same release. If that npm version contains a different artifact, stop and report the conflict.

Create a release branch such as `release/<version>` from the selected source before editing. Preserve unrelated local work, using an isolated worktree when needed. Keep `main` for merged commits; repository protections require a PR and the `Check` status.

Check `npm whoami` early. If authentication fails, use the [authentication recovery instructions](references/recovery.md#npm-authentication) while continuing independent preparation.

## Prepare and verify the artifact

Update the version with `npm version <version> --no-git-tag-version`, keeping `package.json` and `package-lock.json` aligned. Move the release's changes from Unreleased into a versioned changelog entry, leave an Unreleased heading, and include relevant merged changes missing from the changelog.

Use the Node major configured in CI, with both `node` and `npm` on that runtime. Run `npm ci --no-audit --no-fund` for a fresh checkout or changed dependencies, then `npm run check`. All required checks must pass before publication. Rebuild and rerun affected checks if release inputs change afterward.

Commit only the release changes with a Conventional Commit such as `chore(release): prepare <version>`. Pack the verified build into a temporary directory:

```sh
release_dir=$(mktemp -d "${TMPDIR:-/tmp}/xuui-release.XXXXXX")
npm pack --ignore-scripts --json --pack-destination "$release_dir" > "$release_dir/pack.json"
```

Read `pack.json` from disk to obtain the archive filename, version, integrity, and file list. Set `release_tarball` to that archive's absolute path and record the full release commit SHA. Inspect the packed files for unexpected local data. `--ignore-scripts` here reuses the build that just passed checks; it is appropriate only while those inputs remain unchanged.

Keep this archive for publishing and comparison. Publish the archive rather than repacking the directory, so npm receives the tested build without repeating the directory's build and prepublish checks.

## Merge the release record

Push the release branch and create a PR with a Conventional Commit title. Write the description to a temporary file and pass it with `gh pr create --body-file`; include the version, user-visible changes, and actual validation results.

Wait for the required PR checks before merging or publishing. Use `gh pr checks <number> --watch`, yielding frequently enough to report progress. For failures, follow [CI recovery](references/recovery.md#ci-failures). Merge after success using the repository's permitted merge method. Auto-merge may be disabled; it is not required for this workflow.

Fetch the merged source and confirm its tree matches the checked release commit with `git diff --exit-code <release-commit> <merged-commit> --`. Resolve any difference and revalidate before publishing. Record the merged commit with `git rev-parse` as a full SHA for the GitHub release target. For squash-related checkout divergence, see [local checkout recovery](references/recovery.md#local-checkout).

## Publish and verify npm

Set `release_version` and `release_tag` to the chosen version and channel. Publish the prepared archive with public access:

```sh
npm publish "$release_tarball" --tag "$release_tag" --access public --no-progress
```

Keep interactive authentication sessions alive and give Robin each fresh browser approval link immediately. npm can require separate approvals for login, publication, and dist-tag changes; follow [authentication recovery](references/recovery.md#npm-authentication).

For a normal alpha release, publish under `alpha`, then update the default install:

```sh
npm dist-tag add "@getxuui/xuui@$release_version" latest --no-progress
```

Honor an explicitly requested alternate channel instead. A successful command can precede registry visibility. Wait for the exact version and intended dist-tags to appear, then compare the registry's integrity with `pack.json`. Download the registry tarball and compare it byte-for-byte with the prepared archive. Use [registry recovery](references/recovery.md#registry-visibility-and-retries) if results lag or a write fails.

Run the clean-install check against the published version:

```sh
node scripts/test-package.mjs "@getxuui/xuui@$release_version"
```

The npm step is complete only when the intended tags resolve to the version, the artifact matches, and the published-package check passes. If a post-publication check fails, report what is already live and investigate before making another registry change.

## Tag and finish

Create the GitHub release as `v<version>`, targeting the full merged commit SHA. Use `--prerelease` for alpha versions and `--notes-file` with a prepared Markdown file. Include the changes, validation, and commands for creating and upgrading a workspace. Inspect an existing release before resuming; avoid duplicate tags or releases.

Fetch tags and verify the release tag points to the merged commit. Finish and verify the companion skills and website updates using [release surfaces](references/release-surfaces.md). Leave the checkouts synchronized without discarding user work.

Report the npm version, channels, release link, upgrade command, companion PRs, and live website verification. Distinguish completed publication from pending propagation, deployment, or failed verification; npm's acceptance message alone does not complete a release.
