/**
 * Better Godot MCP Server - Initialization
 *
 * Enhanced MCP server for Godot Engine with:
 * - Composite mega-tools (8 tools, ~20 actions)
 * - Cross-platform Godot binary detection
 * - CLI headless operations
 * - EditorPlugin TCP support (Phase 2)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import pkg from '../package.json' with { type: 'json' }
import { detectGodot } from './godot/detector.js'
import type { GodotConfig } from './godot/types.js'
import { registerTools } from './tools/registry.js'

const SERVER_NAME = 'better-godot-mcp'

function getVersion(): string {
  return pkg.version ?? '0.0.0'
}

export async function initServer(): Promise<void> {
  try {
    // Detect Godot binary
    const detection = detectGodot()

    if (detection) {
      console.error(
        `[${SERVER_NAME}] Godot detected: ${detection.version.raw} at ${detection.path} (${detection.source})`,
      )
    } else {
      console.error(`[${SERVER_NAME}] Godot not found. CLI headless tools will be limited.`)
      console.error(`[${SERVER_NAME}] Set GODOT_PATH env var or install Godot.`)
    }

    // Resolve project path from env var (tools also accept project_path per call)
    const projectPath = process.env.GODOT_PROJECT_PATH ?? null

    const config: GodotConfig = {
      godotPath: detection?.path ?? null,
      godotVersion: detection?.version ?? null,
      projectPath,
      activePids: [],
    }

    // Create MCP server
    const server = new Server(
      {
        name: SERVER_NAME,
        version: getVersion(),
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    // Register all tools
    registerTools(server, config)

    // Connect via stdio
    const transport = new StdioServerTransport()
    await server.connect(transport)

    console.error(`[${SERVER_NAME}] Server started (v${getVersion()})`)
  } catch (error) {
    console.error('Failed to initialize server:', error)
    throw error
  }
}
