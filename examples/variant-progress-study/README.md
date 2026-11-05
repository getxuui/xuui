# Variant progress demo

Run the studio from the repository with `npm run dev`. In another terminal, register three directions based on the same Paper parent:

```sh
node src/cli.ts progress --study variant-progress --variant progress-spacing-v2 --name "Refined spacing" --from progress-paper-v1 --width 304 --height 460
node src/cli.ts progress --study variant-progress --variant progress-compact-v2 --name "Compact layout" --from progress-paper-v1 --width 304 --height 460
node src/cli.ts progress --study variant-progress --variant progress-type-v2 --name "Editorial type" --from progress-paper-v1 --width 304 --height 460
```

Open the studio's printed origin with `/?study=variant-progress&variant=progress-paper-v1&view=all`. Press **Shift+1** to fit the parent and all three loading artboards. Their connectors and outlines use the same three-second gradient sweep; reduced motion keeps the gradients static.

These signals deliberately stay in progress for review. To clear them, run each command again with `--done` instead of its `--name`, `--from`, `--width`, and `--height` arguments. If the studio uses a custom review directory, pass the same `--review-dir` to these commands.
