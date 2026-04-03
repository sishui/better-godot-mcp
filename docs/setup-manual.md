# Better Godot MCP -- Manual Setup Guide

## Prerequisites

- **Node.js** >= 24.14.1
- **Godot Engine** 4.x installed (required for `run`, `stop`, `export` actions; optional for scene/script editing)
- A Godot 4.x project with a `project.godot` file

## Method 1: Claude Code Plugin (Recommended)

1. Open Claude Code in your terminal
2. Run:
   ```bash
   /plugin marketplace add n24q02m/claude-plugins
   /plugin install better-godot-mcp@n24q02m-plugins
   ```
3. The plugin auto-configures the MCP server. No environment variables needed.

## Method 2: npx (Any MCP Client)

1. Add the following to your MCP client configuration file:

   **Claude Code** -- `.claude/settings.json` or `~/.claude/settings.json`:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "npx",
         "args": ["-y", "@n24q02m/better-godot-mcp"]
       }
     }
   }
   ```

   **Codex CLI** -- `~/.codex/config.toml`:
   ```toml
   [mcp_servers.better-godot-mcp]
   command = "npx"
   args = ["-y", "@n24q02m/better-godot-mcp"]
   ```

   **OpenCode** -- `opencode.json`:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "npx",
         "args": ["-y", "@n24q02m/better-godot-mcp"]
       }
     }
   }
   ```

2. Restart your MCP client to pick up the new server.

Other package runners (`bun x`, `pnpm dlx`, `yarn dlx`) also work in place of `npx -y`.

## Method 3: Docker

1. Pull the image:
   ```bash
   docker pull n24q02m/better-godot-mcp:latest
   ```

2. Add to your MCP client config:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "docker",
         "args": [
           "run", "-i", "--rm",
           "-v", "/path/to/your/godot/project:/project",
           "-e", "GODOT_PROJECT_PATH=/project",
           "n24q02m/better-godot-mcp:latest"
         ]
       }
     }
   }
   ```

3. Replace `/path/to/your/godot/project` with the absolute path to your Godot project directory.

**Note:** Docker mode has limited filesystem access. You must mount your project directory.

## Method 4: Build from Source

1. Clone and build:
   ```bash
   git clone https://github.com/n24q02m/better-godot-mcp.git
   cd better-godot-mcp
   bun install
   bun run build
   ```

2. Run the dev server:
   ```bash
   bun run dev
   ```

3. Or point your MCP client to the built binary:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "node",
         "args": ["/path/to/better-godot-mcp/bin/cli.mjs"]
       }
     }
   }
   ```

## Environment Variable Reference

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | -- | Default Godot project directory. Each tool call can also pass `project_path` as a parameter. |
| `GODOT_PATH` | No | Auto-detected | Explicit path to the Godot binary. If not set, the server searches PATH and common install locations (Windows, macOS, Linux). |

## Troubleshooting

### Server starts but tools fail with "project not found"

- Ensure your Godot project has a `project.godot` file at its root.
- Set `GODOT_PROJECT_PATH` to the directory containing `project.godot`, or pass `project_path` in each tool call.

### Godot binary not detected

- Install Godot 4.x and ensure it is on your PATH, or set `GODOT_PATH` to the full path of the Godot executable.
- Use the `config` tool with action `detect_godot` to see where the server is looking.

### Docker: "permission denied" or empty file listings

- Ensure the volume mount path is correct: `-v /absolute/path:/project`.
- On Linux, you may need to add `:z` to the mount flag for SELinux: `-v /path:/project:z`.

### npx: "command not found" or old version

- Verify Node.js >= 24.14.1: `node --version`.
- Clear the npx cache: `npx --yes clear-npx-cache` or use `@latest` tag: `npx -y @n24q02m/better-godot-mcp@latest`.

### Tools return errors about Godot 3.x

- This server requires Godot 4.x project structure. Godot 3.x projects are not supported.
