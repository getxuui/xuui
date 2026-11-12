# Release recovery

## npm authentication

An `E401` from `npm whoami` means credentials need attention. Start `npm login --auth-type=web --registry=https://registry.npmjs.org` in an interactive session. Give Robin the generated URL and wait for completion. Keep credentials and one-time codes out of chat and logs.

Publication and dist-tag writes may each request another browser approval. Share each generated URL immediately and resume that same process; do not let an approval prompt wait through CI or unrelated long operations. If a session expires, confirm the operation's registry state, then retry only the unfinished operation and supply its fresh URL. An expired URL cannot approve a replacement session.

Obtain any execution permission required to access npm's cache or update its configuration. An `EPERM` on the npm cache can be a sandbox restriction; use the normal escalation mechanism rather than following npm's generic suggestion to recursively change cache ownership. Keep tokens out of command arguments and tool output.

## CI failures

Inspect the failed job with `gh run view <run-id> --log-failed`. Identify the failing command and assertion before changing code or rerunning the job. Reproduce the affected check using CI's Node version where possible.

A previous release's source tests passed while its package check timed out waiting for a hot-reload WebSocket frame. The same package check passed locally under CI's Node version and against the npm artifact; one CI retry passed without code changes. This is evidence for that incident, not a reason to dismiss future hot-reload failures.

When logs and a targeted rerun support a transient failure, retry the failed job once with `gh run rerun <run-id> --failed`, then wait for its result. A repeated failure needs diagnosis; do not loop retries, weaken checks, or bypass branch protections. If CI remains red, keep the release PR open and stop before a new publication. If resuming an already-published version, report its live state accurately.

## Registry visibility and retries

After publication or a dist-tag change, npm may say the operation is being processed. Query npm with `--prefer-online`. If results disagree with an accepted write, read the authoritative registry endpoints with a no-cache request:

- Version metadata: `https://registry.npmjs.org/@getxuui%2fxuui/<version>`
- Dist-tags: `https://registry.npmjs.org/-/package/@getxuui%2fxuui/dist-tags`

Poll reads at a reasonable interval for up to ten minutes, keeping Robin informed. If visibility still lags, report the accepted operation and unresolved verification rather than repeating writes or claiming completion.

After a publication error, check whether the version exists before retrying. If its integrity matches the prepared archive, continue with the missing tags or release record. If it differs, stop and report the immutable-version conflict. Keep the existing release intact; an unpublish, deprecation, or replacement version requires its own justified scope.

## Local checkout

A squash merge creates a different commit SHA even when its tree matches the release branch. Compare trees and use the full merged SHA for the GitHub release target; a short SHA was rejected by the release API during a previous release.

If an earlier attempt put the release commit on local `main`, `gh pr merge --delete-branch` may merge remotely but fail to fast-forward the local checkout. Confirm the PR's remote state and inspect the divergence. When the only local commit is the release commit just squash-merged and the trees match, `git rebase origin/main` can drop the equivalent commit. Preserve unrelated local commits and edits; avoid a hard reset.
