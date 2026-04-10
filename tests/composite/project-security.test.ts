import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleProject } from '../../src/tools/composite/project.js'
import { makeConfig } from '../fixtures.js'

vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn(),
}))

import { execGodotAsync } from '../../src/godot/headless.js'

describe('Project Tool Security', () => {
  const config = makeConfig({ godotPath: '/path/to/godot', projectPath: '/tmp/project' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('export action - argument injection', () => {
    it('should reject preset starting with hyphen', async () => {
      const promise = handleProject(
        'export',
        {
          project_path: '.',
          preset: '--script',
          output_path: 'build/out',
        },
        config,
      )

      await expect(promise).rejects.toThrow('Invalid preset name')
      expect(execGodotAsync).not.toHaveBeenCalled()
    })

    it('should reject output_path starting with hyphen', async () => {
      const promise = handleProject(
        'export',
        {
          project_path: '.',
          preset: 'Linux',
          output_path: '--script',
        },
        config,
      )

      await expect(promise).rejects.toThrow('Invalid output path')
      expect(execGodotAsync).not.toHaveBeenCalled()
    })

    it('should allow valid preset and output_path', async () => {
      await handleProject(
        'export',
        {
          project_path: '.',
          preset: 'Linux',
          output_path: 'build/out',
        },
        config,
      )

      expect(execGodotAsync).toHaveBeenCalled()
    })
  })
})
