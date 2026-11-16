# dsh-fork-to-workspace

[English](README.md) | [中文](README.zh.md)

A [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) plugin bundle that lets you fork an ordinary session directly into another workspace directory (changing the forked session's `cwd` root and attaching it to the target workspace).

## Features

- Adds **"Fork to workspace…"** (`分叉到工作区…`) to the session row context menu (`order: 310`, right below the built-in **Fork** action).
- Opens a modal listing all existing workspaces, with an option to pick a new folder and create a workspace on the fly.
- Forks from the source session's latest completed turn (`turn/end`), inherits its agent preset, increments the forked title (e.g. ` (1)`), sets `meta.cwd` to the target workspace path, and opens the new session.
- Protects the Host HTTP endpoint (`POST /fork-to-workspace/fork`) with `ctx.connection.requestRejection(req)`.

## Installation

Clone this repository locally and install the bundle directory into your active `dsh` profile via the DSH Plugin Manager (or ask your DSH agent to run `plugin_manager` `install_bundle` pointing to the cloned directory).

```bash
git clone https://github.com/TideDra/dsh-fork-to-workspace.git
```

## File Structure

- `package.json` — Bundle manifest declaring Host/Client entry points, locales, and icon.
- `cordis.patch.yml` — Cordis composition patch inserting `fork-to-workspace`.
- `index.js` — Host plugin registering `POST /fork-to-workspace/fork` and creating the seeded session under the target workspace's `cwd`.
- `client.js` — Web UI plugin registering the session context menu item and workspace-picker modal.
- `locale/en.json`, `locale/zh.json` — Plugin display metadata.
- `icon.svg` — Plugin icon.

## Notes

- Only ordinary sessions with at least one completed turn can be forked. Subagent sessions are excluded.
- If the source session requires format migration (`migration-required`), open the source session first before forking.
- The forked session retains the source conversation history, while its working directory root (`header.cwd`) and sandbox write root switch to the selected workspace.

## License

[MIT](LICENSE)
