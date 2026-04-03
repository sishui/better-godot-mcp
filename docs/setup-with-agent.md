# Better Godot MCP -- Agent Setup Guide

> Give this file to your AI agent to automatically set up better-godot-mcp.

## Option 1: Claude Code Plugin (Recommended)

```bash
/plugin marketplace add n24q02m/claude-plugins
/plugin install better-godot-mcp@n24q02m-plugins
```

This installs the server with skills: `/build-scene`, `/debug-issue`, `/add-mechanic`.

## Option 2: MCP Direct

### Claude Code (settings.json)

Add to `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "better-godot-mcp": {
      "command": "npx",
      "args": ["-y", "@n24q02m/better-godot-mcp"],
      "env": {
        "GODOT_PROJECT_PATH": "/path/to/your/godot/project"
      }
    }
  }
}
```

### Codex CLI (config.toml)

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.better-godot-mcp]
command = "npx"
args = ["-y", "@n24q02m/better-godot-mcp"]

[mcp_servers.better-godot-mcp.env]
GODOT_PROJECT_PATH = "/path/to/your/godot/project"
```

### OpenCode (opencode.json)

Add to `opencode.json` in your project root:

```json
{
  "mcpServers": {
    "better-godot-mcp": {
      "command": "npx",
      "args": ["-y", "@n24q02m/better-godot-mcp"],
      "env": {
        "GODOT_PROJECT_PATH": "/path/to/your/godot/project"
      }
    }
  }
}
```

## Option 3: Docker

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

Mount your Godot project directory into the container.

## Environment Variables

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | -- | Default project path. Tools also accept `project_path` parameter per call. |
| `GODOT_PATH` | No | Auto-detected | Path to Godot binary. Auto-detected from PATH and common install locations. |

## Authentication

No authentication required. This server operates on local files only.

## Verification

After setup, verify the server is working by calling the `config` tool:

```
Use the config tool with action "check" to verify the server is connected and can find Godot.
```

Expected: the tool returns Godot binary path and project status.
