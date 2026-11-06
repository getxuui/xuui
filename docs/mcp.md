# Reviews and MCP

Submitted comments are stored in `.xuui/reviews/` in the study workspace. Browser drafts are not submitted feedback. Ask the agent to read the saved review file, or connect the optional MCP server.

## Installed workspace

Run the installed JavaScript entry point directly, using absolute paths:

```sh
node /absolute/path/to/workspace/node_modules/@getxuui/xuui/dist/cli.js mcp --project-dir /absolute/path/to/workspace
```

Use `node` as the stdio command and the remaining values as its arguments in your MCP client. The command writes only protocol messages to stdout. Add `--review-dir` to read another review directory. No configuration is changed by installation, `init`, or `dev`.

For example, from the project you work in:

```sh
claude mcp add xuui -- node /absolute/path/to/workspace/node_modules/@getxuui/xuui/dist/cli.js mcp --project-dir /absolute/path/to/workspace
codex mcp add xuui -- node /absolute/path/to/workspace/node_modules/@getxuui/xuui/dist/cli.js mcp --project-dir /absolute/path/to/workspace
```

Restart the agent session if the tools don't appear. Once connected, an agent that has handed off a review link should wait for the review with `xuui_wait_for_review`, so feedback reaches it without being asked for.

## Source checkout

Run the explicit setup from this repository:

```sh
npm run mcp:setup
```

This registers the local `xuui` stdio server through the Codex CLI, pointing to this workspace's review files. It preserves unrelated configuration, can be rerun, and refuses to replace an existing `xuui` entry configured differently. Use `--name another-name` for a separate connection, or `--project-dir /absolute/path/to/consumer` to read another workspace's reviews. To opt out during setup, run `npm run mcp:setup -- --skip`; the studio and saved feedback work independently.

In the desktop app, open **Settings → MCP servers → xuui** and select **Restart** to load the tools. For the CLI, restart the Codex session. MCP configuration is shared by Codex's desktop app, CLI, and IDE extension; see the [official OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp).

The server exposes review tools and a variant progress signal:

| Tool                           | Purpose                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `xuui_list_reviews`            | List submitted review summaries, with optional `studyId` / `variantId` filters and pagination.      |
| `xuui_read_review`             | Retrieve the complete stored package using its `reviewId`.                                          |
| `xuui_acknowledge_review`      | Record **Read by agent** and remove the review from the unread queue while retaining history.       |
| `xuui_wait_for_review`         | Wait for the oldest unseen matching submission, returning the package and updated `knownReviewIds`. |
| `xuui_report_variant_progress` | Announce a variant being built, or clear its progress signal.                                       |

For example, ask Codex: **“Read the submitted xuui reviews for card-exploration.”** For an ongoing review: **“Wait for my next xuui review for card-exploration.”** The server supplies workflow instructions when the agent connects.

Agents should list reviews with `unreadOnly: true`, read the full package, then call `xuui_acknowledge_review`. Acknowledged reviews remain readable and listed in history; repeated acknowledgement retains the first read timestamp. Wait calls skip acknowledged reviews. They also accept `knownReviewIds` to exclude packages already received during a running review. An unread package absent from that list returns immediately, including submissions made while disconnected. Waits default to 45 seconds, support cancellation, and stop after at most 50 seconds. Reads never delete feedback. Filters select complete packages rather than removing comments from them.

The preview does not need to be running for MCP reads. Review tools read only completed `.json` records in `.xuui/reviews/`; they never read the browser's draft storage. The agent must be active or waiting to receive feedback.

## Report a variant in progress

Before building a new variant in an existing study, call `xuui_report_variant_progress`:

```json
{
  "status": "working",
  "studyId": "card-exploration",
  "variantId": "paper-v2",
  "name": "Paper, refined",
  "from": ["paper-v1"],
  "width": 400,
  "height": 320
}
```

`name` is required when starting work: name the direction itself, such as "Paper, refined", and keep that name for the finished component. `from` is optional and names parents in the same study. Width and height are optional CSS pixel dimensions, defaulting to 400 × 320. The studio polls progress once a second and shows the named direction with a small spinner in the sidebar and above its dot-grid loading artboard in All. A gradient highlight repeatedly travels from left to right along connectors and artboard outlines for working variants, using the same colors and timing. The artboard contains only the animated dots. Selecting its sidebar entry opens the loading variant on its own; its URL survives reloads and shows the finished component when it arrives. Updates preserve the active variant, camera, selection, controls, and open comment editor. Pending artboards cannot be inspected or commented on and are excluded from submitted reviews. Reduced motion keeps the spinner and gradient static.

Register the completed component under the same ID and parents. The real variant takes precedence over the progress record immediately. After verifying it, clear the record with `{ "status": "done", "studyId": "card-exploration", "variantId": "paper-v2" }`. Use the same call to clear abandoned work. Repeating either call is safe; progress survives server restarts until cleared. These local signals are stored separately from reviews in `.xuui/reviews/progress/` and respect the configured review directory.

Without MCP, use the installed CLI from the study workspace:

```sh
npx --no-install xuui progress --study card-exploration --variant paper-v2 --name "Paper, refined" --from paper-v1
npx --no-install xuui progress --study card-exploration --variant paper-v2 --done
```

Repeat `--from` for multiple parents. `--width`, `--height`, `--project-dir`, and `--review-dir` are optional. In a source checkout, use `node src/cli.ts progress` with the same arguments.

For another MCP host, configure this stdio command using absolute paths and a Node runtime with native TypeScript support:

```sh
node /absolute/path/to/xuui/src/xuui/mcp.ts --project-dir /absolute/path/to/consumer
```

Add `--review-dir relative/or/absolute/path` if the studio uses a custom review directory. `XUUI_REVIEW_DIR` is also respected, matching the local review API. The default directory is resolved from `--project-dir`, independently of the host's working directory. Start stdio servers directly with `node`; npm's lifecycle banners would interfere with the MCP protocol on stdout.
