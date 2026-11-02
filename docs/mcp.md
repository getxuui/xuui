# Reviews and MCP

Submitted comments are stored in `.xuui/reviews/` in the study workspace. Browser drafts are not submitted feedback. Copy a submitted review into chat, or connect the optional MCP server.

## Installed workspace

Run the installed JavaScript entry point directly, using absolute paths:

```sh
node /absolute/path/to/workspace/node_modules/xuui/dist/cli.js mcp --project-dir /absolute/path/to/workspace
```

Use `node` as the stdio command and the remaining values as its arguments in your MCP client. The command writes only protocol messages to stdout. Add `--review-dir` to read another review directory. No configuration is changed by installation, `init`, or `dev`.

## Source checkout

Run the explicit setup from this repository:

```sh
npm run mcp:setup
```

This registers the local `xuui` stdio server through the Codex CLI, pointing to this project's review files. It preserves unrelated configuration, can be rerun, and refuses to replace an existing `xuui` entry configured differently. Use `--name another-name` for a separate connection, or `--project-dir /absolute/path/to/consumer` to read another project's reviews. To opt out during setup, run `npm run mcp:setup -- --skip`; the studio and copyable feedback work independently.

In the desktop app, open **Settings → MCP servers → xuui** and select **Restart** to load the tools. For the CLI, restart the Codex session. MCP configuration is shared by Codex's desktop app, CLI, and IDE extension; see the [official OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp).

The server exposes three reading tools and an explicit acknowledgement:

| Tool                      | Purpose                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `xuui_list_reviews`       | List submitted review summaries, with optional `studyId` / `variantId` filters and pagination.      |
| `xuui_read_review`        | Retrieve the complete stored package using its `reviewId`.                                          |
| `xuui_acknowledge_review` | Record **Read by agent** and remove the review from the unread queue while retaining history.       |
| `xuui_wait_for_review`    | Wait for the oldest unseen matching submission, returning the package and updated `knownReviewIds`. |

For example, ask Codex: **“Read the submitted xuui reviews for card-exploration.”** For an ongoing review: **“Wait for my next xuui review for card-exploration.”** The server supplies workflow instructions when the agent connects.

Agents should list reviews with `unreadOnly: true`, read the full package, then call `xuui_acknowledge_review`. Acknowledged reviews remain readable and listed in history; repeated acknowledgement retains the first read timestamp. Wait calls skip acknowledged reviews. They also accept `knownReviewIds` to exclude packages already received during a running review. An unread package absent from that list returns immediately, including submissions made while disconnected. Waits default to 45 seconds, support cancellation, and stop after at most 50 seconds. Reads never delete feedback. Filters select complete packages rather than removing comments from them.

The preview does not need to be running for MCP reads. The server reads only completed `.json` records in `.xuui/reviews/`; it never reads the browser's draft storage. MCP supplies reading and waiting tools, so the agent must be active or waiting to receive feedback.

For another MCP host, configure this stdio command using absolute paths and a Node runtime with native TypeScript support:

```sh
node /absolute/path/to/xuui/src/xuui/mcp.ts --project-dir /absolute/path/to/consumer
```

Add `--review-dir relative/or/absolute/path` if the studio uses a custom review directory. `XUUI_REVIEW_DIR` is also respected, matching the local review API. The default directory is resolved from `--project-dir`, independently of the host's working directory. Start stdio servers directly with `node`; npm's lifecycle banners would interfere with the MCP protocol on stdout.
