/**
 * Godot Types - Serialize/deserialize Godot native types
 *
 * Handles conversion between Godot expression strings and structured data:
 * Vector2(x, y), Vector3(x, y, z), Color(r, g, b, a), etc.
 */

export interface Vector2 {
  x: number
  y: number
}

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface GodotColor {
  r: number
  g: number
  b: number
  a: number
}

export interface Rect2 {
  x: number
  y: number
  w: number
  h: number
}

export interface Transform2D {
  x: Vector2
  y: Vector2
  origin: Vector2
}

/** Pre-compiled regexes for parsing Godot values */
const NUMBER_RE = /^-?\d+(\.\d+)?$/
const VECTOR2_RE = /^Vector2\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
const VECTOR2I_RE = /^Vector2i\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/
const VECTOR3_RE = /^Vector3\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
const COLOR_RE = /^Color\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)$/
const RECT2_RE = /^Rect2\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
const NODE_PATH_RE = /^NodePath\("([^"]*)"\)$/
const EXT_RESOURCE_RE = /^ExtResource\("([^"]*)"\)$/
const SUB_RESOURCE_RE = /^SubResource\("([^"]*)"\)$/

/**
 * Parse a Godot value expression string into a JavaScript value
 */
const MAX_PARSE_DEPTH = 32

export function parseGodotValue(expr: string, _depth = 0): unknown {
  if (_depth > MAX_PARSE_DEPTH) return expr
  const trimmed = expr.trim()
  if (!trimmed) return trimmed

  const firstChar = trimmed[0]

  // Boolean or null
  if (firstChar === 't' && trimmed === 'true') return true
  if (firstChar === 'f' && trimmed === 'false') return false
  if (firstChar === 'n' && trimmed === 'null') return null

  // Number (int or float)
  if ((firstChar === '-' || (firstChar >= '0' && firstChar <= '9')) && NUMBER_RE.test(trimmed)) {
    return Number.parseFloat(trimmed)
  }

  // String (quoted)
  if ((firstChar === '"' || firstChar === "'") && trimmed.endsWith(firstChar)) {
    return trimmed.slice(1, -1)
  }

  // Fast-path for common literal strings that shouldn't be matched by expensive regexes
  if (trimmed.includes('="')) return trimmed

  // Vector2
  if (trimmed.startsWith('Vector2(')) {
    const v2Match = trimmed.match(VECTOR2_RE)
    if (v2Match) {
      return { x: Number.parseFloat(v2Match[1]), y: Number.parseFloat(v2Match[2]) } as Vector2
    }
  }

  // Vector2i
  if (trimmed.startsWith('Vector2i(')) {
    const v2iMatch = trimmed.match(VECTOR2I_RE)
    if (v2iMatch) {
      return { x: Number.parseInt(v2iMatch[1], 10), y: Number.parseInt(v2iMatch[2], 10) } as Vector2
    }
  }

  // Vector3
  if (trimmed.startsWith('Vector3(')) {
    const v3Match = trimmed.match(VECTOR3_RE)
    if (v3Match) {
      return {
        x: Number.parseFloat(v3Match[1]),
        y: Number.parseFloat(v3Match[2]),
        z: Number.parseFloat(v3Match[3]),
      } as Vector3
    }
  }

  // Color
  if (trimmed.startsWith('Color(')) {
    const colorMatch = trimmed.match(COLOR_RE)
    if (colorMatch) {
      return {
        r: Number.parseFloat(colorMatch[1]),
        g: Number.parseFloat(colorMatch[2]),
        b: Number.parseFloat(colorMatch[3]),
        a: colorMatch[4] ? Number.parseFloat(colorMatch[4]) : 1.0,
      } as GodotColor
    }
  }

  // Rect2
  if (trimmed.startsWith('Rect2(')) {
    const rectMatch = trimmed.match(RECT2_RE)
    if (rectMatch) {
      return {
        x: Number.parseFloat(rectMatch[1]),
        y: Number.parseFloat(rectMatch[2]),
        w: Number.parseFloat(rectMatch[3]),
        h: Number.parseFloat(rectMatch[4]),
      } as Rect2
    }
  }

  // NodePath
  if (trimmed.startsWith('NodePath(')) {
    const npMatch = trimmed.match(NODE_PATH_RE)
    if (npMatch) return npMatch[1]
  }

  // ExtResource reference
  if (trimmed.startsWith('ExtResource(')) {
    const extMatch = trimmed.match(EXT_RESOURCE_RE)
    if (extMatch) return `ExtResource("${extMatch[1]}")`
  }

  // SubResource reference
  if (trimmed.startsWith('SubResource(')) {
    const subMatch = trimmed.match(SUB_RESOURCE_RE)
    if (subMatch) return `SubResource("${subMatch[1]}")`
  }

  // Array
  if (firstChar === '[' && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []

    const results: unknown[] = []
    let bracketLevel = 0
    let parenLevel = 0
    let inQuote: string | null = null
    let start = 0

    for (let i = 0; i <= inner.length; i++) {
      const char = i < inner.length ? inner[i] : ','

      if (inQuote) {
        if (char === inQuote && inner[i - 1] !== '\\') {
          inQuote = null
        }
        continue
      }

      if (char === '"' || char === "'") {
        inQuote = char
        continue
      }

      if (char === '[') bracketLevel++
      else if (char === ']') bracketLevel--
      else if (char === '(') parenLevel++
      else if (char === ')') parenLevel--
      else if (char === ',' && bracketLevel === 0 && parenLevel === 0) {
        const item = inner.slice(start, i).trim()
        if (item || results.length > 0 || i < inner.length) {
          results.push(parseGodotValue(item, _depth + 1))
        }
        start = i + 1
      }
    }
    return results
  }

  // Return as-is for unrecognized types
  return trimmed
}

/**
 * Serialize a JavaScript value to a Godot expression string
 */
export function toGodotValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === true) return 'true'
  if (value === false) return 'false'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return `"${value}"`

  if (Array.isArray(value)) {
    return `[${value.map(toGodotValue).join(', ')}]`
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, number>
    // Rect2 (must check before Vector2 since Rect2 has x,y,w,h)
    if ('x' in obj && 'y' in obj && 'w' in obj && 'h' in obj) {
      return `Rect2(${obj.x}, ${obj.y}, ${obj.w}, ${obj.h})`
    }
    // Vector3
    if ('x' in obj && 'y' in obj && 'z' in obj) {
      return `Vector3(${obj.x}, ${obj.y}, ${obj.z})`
    }
    // Vector2
    if ('x' in obj && 'y' in obj) {
      return `Vector2(${obj.x}, ${obj.y})`
    }
    // Color
    if ('r' in obj && 'g' in obj && 'b' in obj) {
      const a = 'a' in obj ? obj.a : 1.0
      return `Color(${obj.r}, ${obj.g}, ${obj.b}, ${a})`
    }
  }

  return String(value)
}
