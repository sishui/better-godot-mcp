/**
 * Tests for editor.ts - getGodotProcessesAsync platform branches
 */

import * as util from 'node:util'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { makeConfig } from '../fixtures.js'

// Mock child_process.execFile via promisify
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
  spawn: vi.fn(),
}))

vi.mock('node:util', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:util')>()
  return {
    ...original,
    promisify: vi.fn((_fn: unknown) => {
      // Return a mock async function that wraps execFile
      return vi.fn().mockResolvedValue({ stdout: '', stderr: '' })
    }),
  }
})

vi.mock('../../src/godot/headless.js', () => ({
  launchGodotEditor: vi.fn(() => ({ pid: 12345 })),
}))

describe('editor - getGodotProcessesAsync branches', () => {
  let config: GodotConfig
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.clearAllMocks()
    config = makeConfig({ godotPath: '/usr/bin/godot' })
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('status should handle win32 platform with godot processes', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })

    // Re-mock promisify for this test - return tasklist output
    vi.mocked(util.promisify).mockReturnValue(
      vi.fn().mockResolvedValue({
        stdout: '"godot.exe","1234","Console","1","50,000 K"\n"godot_console.exe","5678","Console","1","30,000 K"\n',
        stderr: '',
      }) as never,
    )

    // We need to re-import to get the new mock
    vi.resetModules()
    vi.doMock('node:child_process', () => ({ execFile: vi.fn(), spawn: vi.fn() }))
    vi.doMock('node:util', () => ({
      promisify: vi.fn(() =>
        vi.fn().mockResolvedValue({
          stdout: '"godot.exe","1234","Console","1","50,000 K"\n',
          stderr: '',
        }),
      ),
    }))
    vi.doMock('../../src/godot/headless.js', () => ({
      launchGodotEditor: vi.fn(() => ({ pid: 12345 })),
    }))

    const { handleEditor: freshHandleEditor } = await import('../../src/tools/composite/editor.js')
    const result = await freshHandleEditor('status', {}, config)
    const data = JSON.parse(result.content[0].text)
    expect(data).toHaveProperty('running')
    expect(data).toHaveProperty('processes')
  })

  it('status should handle linux platform with pgrep output', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    vi.resetModules()
    vi.doMock('node:child_process', () => ({ execFile: vi.fn(), spawn: vi.fn() }))
    vi.doMock('node:util', () => ({
      promisify: vi.fn(() =>
        vi.fn().mockResolvedValue({
          stdout: '1234 /usr/bin/godot --editor\n5678 /usr/bin/godot --path /tmp\n',
          stderr: '',
        }),
      ),
    }))
    vi.doMock('../../src/godot/headless.js', () => ({
      launchGodotEditor: vi.fn(() => ({ pid: 12345 })),
    }))

    const { handleEditor: freshHandleEditor } = await import('../../src/tools/composite/editor.js')
    const result = await freshHandleEditor('status', {}, config)
    const data = JSON.parse(result.content[0].text)
    expect(data.running).toBe(true)
    expect(data.processes.length).toBeGreaterThan(0)
  })

  it('status should handle pgrep error (no processes)', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    vi.resetModules()
    vi.doMock('node:child_process', () => ({ execFile: vi.fn(), spawn: vi.fn() }))
    vi.doMock('node:util', () => ({
      promisify: vi.fn(() => vi.fn().mockRejectedValue(new Error('No processes found'))),
    }))
    vi.doMock('../../src/godot/headless.js', () => ({
      launchGodotEditor: vi.fn(() => ({ pid: 12345 })),
    }))

    const { handleEditor: freshHandleEditor } = await import('../../src/tools/composite/editor.js')
    const result = await freshHandleEditor('status', {}, config)
    const data = JSON.parse(result.content[0].text)
    expect(data.running).toBe(false)
    expect(data.processes).toEqual([])
  })
})
