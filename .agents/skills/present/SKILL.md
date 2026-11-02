---
name: present
description: Present React UI in xuui as a runnable study with reviewable variants. Use for /present or requests to present work in the local xuui studio.
---

# Present in xuui

Turn the work in the current conversation into a running, reviewable xuui study. The handoff is a verified local URL, a short explanation of the design question, and the differences worth reviewing.

## Resolve what to present

Use the requested UI, reference, or recent work as the brief. Present an existing implementation faithfully. When the brief asks for alternatives, make their differences answer the design question; choose the number from the brief and the useful comparisons. Ask only when the conversation and workspace leave the subject unclear.

Find the study workspace from the current project: an installed workspace has `xuui.studies.ts` and a local xuui dependency. Read that version's README, `docs/authoring.md`, and exported types, plus a nearby registration. Use the installed CLI rather than downloading a newer alpha into an existing workspace. A xuui source checkout instead uses `examples/studies.ts`, `src/xuui/model.ts`, and `src/xuui/parameters.ts`; read `CONTEXT.md` there. Do not infer the consumer workspace by walking upward from an installed skill.

The alpha presents registered React components in a standalone workspace. If a new workspace is needed, run `npx xuui@alpha init <directory>`, then use its pinned installation. For work from another codebase, inspect its tokens, neighboring UI, responsive constraints, providers, and data. Adapt the relevant component and necessary dependencies without silently redesigning it. Include a context wrapper when isolation would distort the review, and disclose mocked data or unavailable backend behavior.

## Frame an exploration

When alternatives are requested, state the design question, name the primary variable, and say what stays constant. Plan directions that answer that question. Start them with matched content, meaningful state, viewport width, and scale. Do not generate alternatives for a request to present an existing design faithfully. Let the brief and useful comparisons determine the number.

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

In an installed workspace, use `npx --no-install xuui dev`; in a source checkout, use its package scripts. Check for an existing preview first and reuse it when it serves the intended workspace. Leave unrelated processes alone. Keep the local server running for the reviewer and use the actual printed origin.

Open a URL using the actual server origin and the registered IDs:

- Focused variant: `/?study=<study-id>&variant=<variant-id>`
- Comparison: the same URL with `&view=all`

Verify the rendered variant identity, rather than treating an HTTP 200 as proof: unknown IDs fall back to an existing study. Inspect the UI, exercise important interactions in Play mode, and try each exposed control. Apply the same usability floor to each direction: keyboard access, visible whole-control focus, readable text, appropriate reduced motion, and realistic content, states, and widths. Run relevant project checks and report failures or unavailable checks accurately.

Use isolated test storage for submission checks. Leave the reviewer's real draft comments and submitted records intact.

Done means the link opens the intended design, meaningful interactions work, and the review boundary is clear.

## Hand off

Return the focused link, plus a comparison link when useful. Explain what to judge in a few sentences and name material limitations such as mocked data. The reviewer uses Play for interactions, C for comments, and Submit review for the handoff.

For alternatives, add a short table of what changed, when each direction fits, and its main cost. State the reviewed width and state. Do not silently pick a winner. When asked to advance a choice, verify the promoted design in its source context and retain its reviewable study; preserve old implementations and add stable IDs for further comparable work.

Stop after presenting unless the user also asks to wait for feedback or continue the review loop. In that case, discover the xuui MCP tools, filter to the presented study, read each complete submitted package, and acknowledge receipt before acting on it. A receipt means the package was read; it does not mean its requests were implemented. Browser drafts are not submitted feedback. If MCP is unavailable, use the submitted files or the reviewer's copied package; change host configuration only when setup was requested.
