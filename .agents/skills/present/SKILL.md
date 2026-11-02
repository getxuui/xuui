---
name: present
description: Present React UI in xuui as a runnable study with reviewable variants. Use for /present or requests to present work in the local xuui studio.
---

# Present in xuui

Turn the work in the current conversation into a running, reviewable xuui study. The handoff is a verified local URL, a short explanation of the design question, and the differences worth reviewing.

## Resolve what to present

Use the requested UI, reference, or recent work as the brief. Present an existing implementation faithfully. When the brief asks for alternatives, make their differences answer the design question; choose the number from the brief and the useful comparisons. Ask only when the conversation and workspace leave the subject unclear.

Find the xuui checkout through the current workspace or this skill's resolved location. A checkout with this skill at `.agents/skills/present` has its root three directories above the skill folder. Read its `CONTEXT.md`, the Authoring and Run sections of `README.md`, and `examples/studies.ts`. The current authoring contracts are `src/xuui/model.ts` and `src/xuui/parameters.ts`; inspect a nearby study registration before adding one.

This checkout is a local React studio. Use its existing source integration; a published xuui package or a CLI for importing arbitrary apps is not part of that contract. For work from another codebase, adapt the relevant component and the dependencies it actually needs into a study in the checkout. Preserve the source project's behavior and name any mocked data or unavailable backend.

## Register the study

Put the design and its adapter beside the study's registration, following the existing studies. Add the study to the central registry, or extend the relevant existing study when the work explores the same question.

- Use the product terms **study**, **variant**, **canvas**, **layer**, and **guide**. The code contract currently calls variants `iterations` and uses `defineProject` for a study.
- Give each variant a stable, descriptive ID unique across all registered studies. Add a new ID when advancing a direction that should remain reviewable. Preserve the earlier implementation; sharing a mutable component does not freeze its history.
- Write a useful name, description, and rationale. Record real `parentIds` and `informedBy` references when a variant descends from earlier work or submitted feedback.
- Register ordinary React components. xuui supplies navigation, panning, zoom, inspection, comparison, and comments; the study supplies the design and the providers or data it needs.
- Scope the study's CSS so it cannot restyle studio chrome or unrelated variants. Give the design meaningful dimensions; a percentage width without a sized containing block can collapse on the canvas.
- Expose only useful, functioning parameters through `controls`. Wire props, state, and any finite-state machine through `StudioBindings`; changing a control must change the rendered design. Add `data-xuui-layer-name` where the DOM alone gives an unhelpful layer name.

Keep changes to the requested study and the registration needed to present it. A presentation request does not authorize redesigning the studio itself.

Done means the requested design renders from a registered variant and its exposed controls work.

## Run and verify

Use the checkout's current package scripts and Vite configuration. Check for an existing xuui preview before starting another server. Reuse it when it serves this checkout; leave unrelated processes alone. Start a local server when needed and keep it running for the reviewer.

Open a URL using the actual server origin and the registered IDs:

- Focused variant: `/?study=<study-id>&variant=<variant-id>`
- Comparison: the same URL with `&view=all`

Verify the rendered variant identity, rather than treating an HTTP 200 as proof: unknown IDs fall back to an existing study. Inspect the UI in the browser, exercise its important interactions in Play mode, and try each exposed control. Check the relevant narrow width and any states the brief calls for. Run the relevant project checks; report a failure or unavailable check accurately instead of claiming it passed.

Use isolated test storage for submission checks. Leave the reviewer's real draft comments and submitted records intact.

Done means the link opens the intended design, meaningful interactions work, and the review boundary is clear.

## Hand off

Return the focused link, plus a comparison link when useful. Explain what to judge in a few sentences and name material limitations such as mocked data. The reviewer uses Play for interactions, C for comments, and Submit review for the handoff.

Stop after presenting unless the user also asks to wait for feedback or continue the review loop. In that case, discover the xuui MCP tools, filter to the presented study, read each complete submitted package, and acknowledge receipt before acting on it. A receipt means the package was read; it does not mean its requests were implemented. Browser drafts are not submitted feedback. If MCP is unavailable, use the submitted files or the reviewer's copied package; change host configuration only when setup was requested.
