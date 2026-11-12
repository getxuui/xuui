# Companion skills and website

These are release surfaces for the same runtime version, not separate runtime releases. Prepare their changes alongside the runtime PR; publish version pins only after that npm version is verified. A request limited to preparing a release stops before publication and deployment.

## Locate and inspect

Use the existing checkouts for `getxuui/skills` and `getxuui/xuui.com` when available. Check each remote, working tree, branch, and repository instructions, then fetch its current default branch. Local checkouts may have unpublished commits, edits, or deleted design studies: preserve them and use isolated worktrees from the intended remote source. If a repository or deployment connection is unavailable, finish independent release work and report the specific missing surface.

Read the runtime changelog and authoring/MCP docs before editing agent instructions. Use the skill-writing guidance available in the session for skill changes. Keep existing workspaces on their installed runtime; advancing the new-workspace pin does not authorize upgrading them.

## Update the companion skill

In `getxuui/skills`, inspect `skills/present/SKILL.md` and search maintained setup examples for pinned runtime versions. Advance new-workspace commands to the verified release. Reconcile any changed authoring, progress, controls, or review workflow against the shipped CLI, docs, and exported types. Preserve capability checks for older installed runtimes. Update other maintained skill references only when the release changes their behavior; avoid version-only prose with no effect on the workflow.

Validate the skill's frontmatter and references, check the diff, and run the repository's documented checks. Create a Conventional Commit and PR, wait for required checks, and merge. Verify the published `main` skill contains the intended setup pin and workflow; local edits alone do not update the skill that people install.

## Update and deploy the website

In `getxuui/xuui.com`, inspect `public/release.json`, `public/agents.md`, `public/llms.txt`, setup snippets, and the deployment configuration. Keep the manifest's runtime version, new-workspace commands, Node requirement, and available skill links consistent with the shipped package and companion repository. Bring the agent guide up to date for relevant capabilities. Keep unrelated visual work and design studies out of a release metadata update.

Build using the repository's configured Node version and validate the generated public files. Use a Conventional Commit and PR, wait for required checks, and merge. Follow the site's configured deployment path; verify the production deployment rather than treating the merge or a deployment command's success as proof that the website is current.

Fetch `https://xuui.com/release.json` and `https://xuui.com/agents.md` after deployment. Parse the manifest and compare its version and Node requirement with the verified npm package. Check that the live guide's setup command names that version, its behavior matches the released runtime, and its skill/documentation links resolve to the updated sources. Inspect any visible website content changed by the release. For stale CDN responses, use no-cache reads and inspect deployment status before retrying a deployment.

## Completion

Record the companion commit/PR links and the verified production URL alongside the runtime release. Completion requires the intended npm channels and archive, GitHub release tag, published companion skill, and live website to agree. If one is pending, report what is already live and finish that surface for the same version when access or propagation allows; do not bump or republish the runtime to fix a stale guide.
