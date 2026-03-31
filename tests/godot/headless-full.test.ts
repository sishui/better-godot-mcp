/**
 * Tests for headless.ts - execGodotScript, runGodotProject, launchGodotEditor
 */

import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  execGodotAsync,
  execGodotScript,
  execGodotSync,
  launchGodotEditor,
  runGodotProject,
} from '../../src/godot/headless.js'

// execFileAsyncMock is hoisted so it is available inside the vi.mock factory.
// We attach it as [promisify.custom] on execFile so that promisify(execFile)
// returns { stdout, stderr } correctly (matching Node.js built-in behaviour).
const { execFileAsyncMock } = vi.hoisted(() => ({
  execFileAsyncMock:
    vi.fn<(cmd: string, args: string[], opts: unknown) => Promise<{ stdout: string; stderr: string }>>(),
}))

vi.mock('node:child_process', async () => {
  const { promisify: _promisify } = await import('node:util')
  const execFileMock = vi.fn()
  ;(execFileMock as unknown as Record<symbol, unknown>)[_promisify.custom] = execFileAsyncMock
  return {
    spawnSync: vi.fn(),
    spawn: vi.fn(),
    execFile: execFileMock,
  }
})

describe('headless', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    execFileAsyncMock.mockReset()
  })

  // ==========================================
  // execGodotSync
  // ==========================================
  describe('execGodotSync', () => {
    it('should use default timeout when not specified', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'output', stderr: '', status: 0 })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
      )
    })

    it('should handle error without status (fallback to 1)', () => {
      const error = new Error('Timeout')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: error.status ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('Timeout')
    })

    it('should handle error with empty stdout/stderr', () => {
      const error = new Error('fail')
      Object.assign(error, { status: 2, stdout: '', stderr: '' })
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: error.status ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('fail')
      expect(result.exitCode).toBe(2)
    })
  })

  // ==========================================
  // execGodotScript
  // ==========================================
  describe('execGodotScript', () => {
    it('should construct correct args for headless script execution', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'script output', stderr: '', status: 0 })
      const result = execGodotScript('/usr/bin/godot', '/tmp/script.gd', '/tmp/project')
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('script output')
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--headless', '--path', '/tmp/project', '--script', '/tmp/script.gd'],
        expect.anything(),
      )
    })

    it('should append extra args after -- separator', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'result', stderr: '', status: 0 })
      execGodotScript('/usr/bin/godot', '/tmp/script.gd', '/tmp/project', ['--arg1', '--arg2'])
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--headless', '--path', '/tmp/project', '--script', '/tmp/script.gd', '--', '--arg1', '--arg2'],
        expect.anything(),
      )
    })

    it('should pass timeout option', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'result', stderr: '', status: 0 })
      execGodotScript('/usr/bin/godot', '/tmp/script.gd', '/tmp/project', undefined, { timeout: 5000 })
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--headless', '--path', '/tmp/project', '--script', '/tmp/script.gd'],
        expect.objectContaining({ timeout: 5000 }),
      )
    })

    it('should handle script execution errors', () => {
      const error = new Error('Script error')
      Object.assign(error, { status: 1, stdout: '', stderr: 'GDScript error' })
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: error.status ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      })
      const result = execGodotScript('/usr/bin/godot', '/tmp/script.gd', '/tmp/project')
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('GDScript error')
    })
  })

  // ==========================================
  // runGodotProject
  // ==========================================
  describe('runGodotProject', () => {
    it('should spawn Godot with correct arguments', () => {
      const mockChild = { unref: vi.fn(), pid: 42 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBe(42)
      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--path', '/tmp/project'], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })

    it('should return undefined pid when spawn fails to assign pid', () => {
      const mockChild = { unref: vi.fn(), pid: undefined }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBeUndefined()
    })
  })

  // ==========================================
  // launchGodotEditor
  // ==========================================
  describe('launchGodotEditor', () => {
    it('should spawn Godot editor with --editor flag', () => {
      const mockChild = { unref: vi.fn(), pid: 99 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = launchGodotEditor('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBe(99)
      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--editor', '--path', '/tmp/project'], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })

    it('should return undefined pid when editor spawn fails', () => {
      const mockChild = { unref: vi.fn(), pid: undefined }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = launchGodotEditor('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBeUndefined()
    })
  })

  // ==========================================
  // execGodotAsync
  // ==========================================
  describe('execGodotAsync', () => {
    it('should return success result with stdout and stderr trimmed', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '  output  ', stderr: '  warn  ' })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('output')
      expect(result.stderr).toBe('warn')
      expect(result.exitCode).toBe(0)
    })

    it('should use default timeout of 30_000 when none specified', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
      )
    })

    it('should pass custom timeout through to execFile', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync('/usr/bin/godot', ['--version'], { timeout: 5000 })
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 5000 }),
      )
    })

    it('should pass custom cwd through to execFile', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync('/usr/bin/godot', ['--version'], { cwd: '/tmp/project' })
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ cwd: '/tmp/project' }),
      )
    })

    it('should return failure result with stdout, stderr and exitCode from error', async () => {
      const error = Object.assign(new Error('fail'), { stdout: '  out  ', stderr: '  err  ', code: 2 })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('out')
      expect(result.stderr).toBe('err')
      expect(result.exitCode).toBe(2)
    })

    it('should fall back to error.message and exitCode 1 when error has no stdout/stderr/code', async () => {
      execFileAsyncMock.mockRejectedValue(new Error('command not found'))

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('command not found')
      expect(result.exitCode).toBe(1)
    })

    it('should return empty strings when success stdout and stderr are empty', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })
  })
})
