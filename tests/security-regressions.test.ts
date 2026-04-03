import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isExecutable, parseGodotVersion } from '../src/godot/detector.js'
import { handleConfig } from '../src/tools/composite/config.js'
import { makeConfig } from './fixtures.js'

describe('Security Regressions', () => {
  const tempDir = join(tmpdir(), `godot-mcp-security-test-${Date.now()}`)

  beforeEach(() => {
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    vi.resetAllMocks()
  })

  describe('isExecutable', () => {
    it('should return false for directories even if they have execute bit', () => {
      // In Unix, directories almost always have execute bit set (for traversal)
      expect(isExecutable(tempDir)).toBe(false)
    })

    it('should return true for regular executable files', () => {
      const filePath = join(tempDir, 'test-exec')
      writeFileSync(filePath, '#!/bin/sh\necho test')
      // Set executable bit
      chmodSync(filePath, 0o755)
      expect(isExecutable(filePath)).toBe(true)
    })
  })

  describe('parseGodotVersion', () => {
    it('should not match if extra text is present (anchoring test)', () => {
      // Godot 4.2 stable output is actually exactly "4.2.stable" or "Godot Engine v4.2.stable"
      // If someone can inject "4.2.stable\nevil_command", it shouldn't match.
      expect(parseGodotVersion('Godot Engine v4.2.stable official EXTRA')).toBeNull()
      expect(parseGodotVersion('PRE Godot Engine v4.2.stable')).toBeNull()
    })

    it('should match exact Godot version strings', () => {
      expect(parseGodotVersion('Godot Engine v4.2.stable.official')).not.toBeNull()
      expect(parseGodotVersion('4.2.1.stable')).not.toBeNull()
    })
  })

  describe('handleConfig runtimeConfig update', () => {
    it('should not update runtimeConfig if validation fails', async () => {
      const config = makeConfig()
      // Try to set an invalid project_path
      const invalidPath = join(tempDir, 'non-existent-project')

      try {
        await handleConfig('set', { key: 'project_path', value: invalidPath }, config)
      } catch (_e) {
        // Expected failure
      }

      // Check status to see if it was overridden in runtime_overrides
      const statusResult = await handleConfig('status', {}, config)
      const status = JSON.parse(statusResult.content[0].text)
      expect(status.runtime_overrides.project_path).toBeUndefined()
    })
  })
})
