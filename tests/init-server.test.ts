/**
 * Tests for initServer function - Server initialization flow
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all dependencies before importing
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  class MockServer {
    setRequestHandler = vi.fn()
    connect = vi.fn().mockResolvedValue(undefined)
  }
  return {
    Server: MockServer,
  }
})

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class MockStdioServerTransport {}
  return {
    StdioServerTransport: MockStdioServerTransport,
  }
})

vi.mock('../src/godot/detector.js', () => ({
  detectGodot: vi.fn(),
}))

vi.mock('../src/tools/registry.js', () => ({
  registerTools: vi.fn(),
}))

describe('initServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error output during tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should initialize server when Godot is detected', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue({
      path: '/usr/bin/godot',
      version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: '4.3.stable' },
      source: 'path',
    })

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot detected'))
  })

  it('should initialize server when Godot is not found', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot not found'))
  })

  it('should pass correct config when Godot is detected', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    const mockVersion = { major: 4, minor: 6, patch: 0, label: 'stable', raw: '4.6.stable' }
    vi.mocked(detectGodot).mockReturnValue({
      path: '/opt/godot',
      version: mockVersion,
      source: 'env',
    })

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        godotPath: '/opt/godot',
        godotVersion: mockVersion,
      }),
    )
  })

  it('should pass null config when Godot is not found', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        godotPath: null,
        godotVersion: null,
      }),
    )
  })

  it('should connect server transport and log server started', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Server started'))
  })
})
