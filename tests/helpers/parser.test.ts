import { describe, it, expect } from 'vitest'
import { parseCommaList } from '../../src/tools/helpers/parser.js'

describe('parseCommaList', () => {
  it('should parse a simple comma-separated list', () => {
    const input = 'item1, item2, item3'
    const expected = ['item1', 'item2', 'item3']
    expect(parseCommaList(input)).toEqual(expected)
  })

  it('should handle empty input', () => {
    expect(parseCommaList('')).toEqual([])
  })

  it('should trim whitespace', () => {
    const input = '  item1  ,   item2  '
    const expected = ['item1', 'item2']
    expect(parseCommaList(input)).toEqual(expected)
  })

  it('should filter empty items by default', () => {
    const input = 'item1,,item2, '
    const expected = ['item1', 'item2']
    expect(parseCommaList(input)).toEqual(expected)
  })

  it('should include empty items if filterEmpty is false', () => {
    const input = 'item1,,item2, '
    const expected = ['item1', '', 'item2', '']
    expect(parseCommaList(input, { filterEmpty: false })).toEqual(expected)
  })

  it('should remove quotes if removeQuotes is true', () => {
    const input = '"item1", "item2", "item3"'
    const expected = ['item1', 'item2', 'item3']
    expect(parseCommaList(input, { removeQuotes: true })).toEqual(expected)
  })

  it('should handle complex cases with quotes and spaces', () => {
    const input = ' "group1" , "" , "group2" '
    const expected = ['group1', 'group2']
    expect(parseCommaList(input, { removeQuotes: true, filterEmpty: true })).toEqual(expected)
  })

  it('should handle items with spaces but no quotes', () => {
    const input = 'word1 word2, word3 word4'
    const expected = ['word1 word2', 'word3 word4']
    expect(parseCommaList(input)).toEqual(expected)
  })
})
