import * as child_process from 'node:child_process'
import * as os from 'node:os'
import * as path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotAsync, execGodotSync, launchGodotEditor, runGodotProject } from '../../src/godot/headless.js'

// execFileAsyncMock is hoisted so it is available inside the vi.mock factory.
const { execFileAsyncMock } = vi.hoisted(() => ({
  execFileAsyncMock:
    vi.fn<(cmd: string, args: string[], opts: unknown) => Promise<{ stdout: string; stderr: string }>>(),
}))

vi.mock('node:child_process', async () => {
  const { promisify: _promisify } = await import('node:util')
  const execFileMock = vi.fn()
  // @ts-expect-error - custom promisify implementation
  execFileMock[_promisify.custom] = execFileAsyncMock
  return {
    spawnSync: vi.fn(),
    spawn: vi.fn(),
    execFile: execFileMock,
  }
})

describe('headless', () => {
  const mockGodotPath = path.join(os.tmpdir(), 'godot')
  const mockProjectPath = path.join(os.tmpdir(), 'project')

  beforeEach(() => {
    vi.resetAllMocks()
    execFileAsyncMock.mockReset()
  })

  // ==========================================
  // execGodotSync
  // ==========================================
  describe('execGodotSync', () => {
    it('executes Godot with correct arguments using spawnSync', () => {
      const args = ['--version']
      const options = { timeout: 1000, cwd: mockProjectPath }

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '4.3.stable',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync(mockGodotPath, args, options)

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('4.3.stable')
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        mockGodotPath,
        args,
        expect.objectContaining({
          timeout: options.timeout,
          cwd: options.cwd,
          encoding: 'utf-8',
        }),
      )
    })

    it('should use default timeout when not specified', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'output',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync(mockGodotPath, ['--version'])
      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        mockGodotPath,
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
      )
    })

    it('should handle execution errors with status', () => {
      const args = ['--invalid']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '',
        stderr: 'Unknown argument',
        status: 1,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync(mockGodotPath, args)

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown argument')
      expect(result.exitCode).toBe(1)
    })

    it('should handle execution errors without status (fallback to 1)', () => {
      const error = new Error('Timeout')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: null,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync(mockGodotPath, ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('Timeout')
    })

    it('should handle error with missing message and status', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: {} as Error,
        status: null,
        stdout: null,
        stderr: null,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync(mockGodotPath, ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('Unknown error')
      expect(result.stdout).toBe('')
    })

    it('should handle success with null/undefined stdout and stderr', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: null,
        stderr: undefined,
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync(mockGodotPath, ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })

    it('should use spawnSync to prevent command injection', () => {
      const args = ['--headless', '--script', 'test.gd']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'success',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync(mockGodotPath, args)

      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledTimes(1)
      expect(child_process.spawn).not.toHaveBeenCalled()
      expect(child_process.spawnSync).toHaveBeenCalledWith(mockGodotPath, args, expect.any(Object))
    })

    it('should safely handle malicious arguments', () => {
      const maliciousArgs = ['--headless', '--script', 'test.gd', ';', 'ls', '-la']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'success',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      execGodotSync(mockGodotPath, maliciousArgs)

      expect(child_process.spawnSync).toHaveBeenCalledWith(mockGodotPath, maliciousArgs, expect.any(Object))
    })
  })

  // ==========================================
  // execGodotAsync
  // ==========================================
  describe('execGodotAsync', () => {
    it('should return success result with stdout and stderr trimmed', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '  output  ', stderr: '  warn  ' })

      const result = await execGodotAsync(mockGodotPath, ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('output')
      expect(result.stderr).toBe('warn')
      expect(result.exitCode).toBe(0)
    })

    it('should handle success with null/undefined stdout and stderr', async () => {
      execFileAsyncMock.mockResolvedValue({
        stdout: null as unknown as string,
        stderr: undefined as unknown as string,
      })

      const result = await execGodotAsync(mockGodotPath, ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should use default timeout of 30_000 when none specified', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync(mockGodotPath, ['--version'])
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        mockGodotPath,
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
      )
    })

    it('should return failure result with stdout, stderr and exitCode from error', async () => {
      const error = Object.assign(new Error('fail'), { stdout: '  out  ', stderr: '  err  ', code: 2 })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync(mockGodotPath, ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('out')
      expect(result.stderr).toBe('err')
      expect(result.exitCode).toBe(2)
    })

    it('should handle error with missing stdout, stderr and code', async () => {
      const error = new Error('Async Fail')
      // @ts-expect-error
      delete error.message
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync(mockGodotPath, ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(1)
    })
  })

  // ==========================================
  // runGodotProject
  // ==========================================
  describe('runGodotProject', () => {
    it('should spawn Godot with correct arguments', () => {
      const mockChild = { unref: vi.fn(), pid: 42 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as unknown as child_process.ChildProcess)

      const result = runGodotProject(mockGodotPath, mockProjectPath)
      expect(result.pid).toBe(42)
      expect(child_process.spawn).toHaveBeenCalledWith(mockGodotPath, ['--path', mockProjectPath], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })
  })

  // ==========================================
  // launchGodotEditor
  // ==========================================
  describe('launchGodotEditor', () => {
    it('should spawn Godot editor with --editor flag', () => {
      const mockChild = { unref: vi.fn(), pid: 99 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as unknown as child_process.ChildProcess)

      const result = launchGodotEditor(mockGodotPath, mockProjectPath)
      expect(result.pid).toBe(99)
      expect(child_process.spawn).toHaveBeenCalledWith(mockGodotPath, ['--editor', '--path', mockProjectPath], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })
  })
})
