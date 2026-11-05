# xuui

Review the UIs your agents build.

Your agent puts its React components on a local canvas. You compare the variants, point at what to change, and send your comments back to the agent.

**Experimental alpha. Breaking changes expected. Requires Node 22.12 or newer.**

## Start

```sh
npx --package @getxuui/xuui@alpha xuui init my-study
cd my-study
npx xuui dev
```

Open the printed local URL. `init` creates a small starter and installs a pinned xuui version. Your components and `xuui.studies.ts` belong to the workspace; the studio stays in the dependency. Use `--no-install` to scaffold without installing packages.

## Present, review, continue

1. Register a design or a few alternatives in `xuui.studies.ts`.
2. Share the focused variant link or compare them with **All**. Use Play to try the design, and Select to inspect its layers.
3. Press **C**, point at an element, and comment. **Submit review** hands the collected feedback back to the agent.
4. Advance a direction with a new variant ID. Keep earlier implementations when they should remain reviewable.

Submitted feedback is stored as readable files in `.xuui/reviews/`. Copy a review into chat or let an agent read it through the optional MCP connection. No account, deployment, or database is needed to review locally.

The companion [`/present` skill](https://github.com/getxuui/skills) guides registration, meaningful comparisons, and the feedback handoff.

## Learn more

- [Authoring studies and controls](docs/authoring.md)
- [Canvas controls and shortcuts](docs/controls.md)
- [Reviews and MCP](docs/mcp.md)

The alpha supports standalone React study workspaces. Supply the providers, data, styles, and dependencies your design needs. Automatic imports from arbitrary applications are outside this release.

## Develop xuui

```sh
npm ci
npm run dev
```

The source demo contains two cards. Demo designs and test fixtures are excluded from the npm package; only a small generated starter accompanies `init`.

Run `npm run check` for the build, browser tests, and installed-package checks. Use `npm run build:demo` for a static build of the demo.

Use [Conventional Commits](CONTRIBUTING.md) for commits and pull request titles. `npm ci` enables local commit message validation.

[MIT](LICENSE) · Robin Humphreys
