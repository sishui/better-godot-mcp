/**
 * Fast-path parser for comma-separated lists, avoiding split/map/filter allocations.
 */
export function parseCommaList(str: string, options: { removeQuotes?: boolean; filterEmpty?: boolean } = {}): string[] {
  const { removeQuotes = false, filterEmpty = true } = options
  if (!str) return []
  const results: string[] = []
  let start = 0
  const len = str.length
  while (start < len) {
    let end = str.indexOf(',', start)
    if (end === -1) end = len

    let i = start
    while (i < end && str.charCodeAt(i) <= 32) i++
    let j = end - 1
    while (j >= i && str.charCodeAt(j) <= 32) j--

    if (i <= j) {
      let item = str.slice(i, j + 1)
      if (removeQuotes) {
        item = item.replace(/"/g, '')
      }
      if (!filterEmpty || item) {
        results.push(item)
      }
    } else if (!filterEmpty) {
      results.push('')
    }

    start = end + 1
  }
  return results
}
