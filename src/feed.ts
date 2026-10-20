// The glasses feed as a window over a list of text rows (pure logic, no SDK).
//
// Content is laid out from the top of the body. New translations are appended below the existing rows (the
// "bottom"); once they overflow the window the view follows them, so the newest row is always the last visible one.
// Swiping scrolls one entry at a time: down brings earlier entries back, up moves toward the newest. The view never goes
// past the newest rows: swiping on from there is "clear the feed", which the display turns into `clear()`.

/** Rows that fit in the body container (216 px at ~28 px a line). */
export const VIEW_ROWS = 7

/** Usable width of the body in pixels (576 minus padding), kept a little under so the glasses never re-wrap a row. */
const ROW_PX = 552
const MAX_ROWS = 240

/** Rough advance widths of the G2 font; unknown glyphs count as an average lower-case letter. */
function glyphPx(ch: string): number {
  // Kana/kanji/full-width forms are drawn about as wide as they are tall. The real width is unverified, so err wide.
  if (/[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/.test(ch)) return 27
  if ('il.,:;\'!|jtfI '.includes(ch)) return 6
  if ('mwMW@'.includes(ch)) return 17
  if (ch >= 'A' && ch <= 'Z') return 13.5
  return 11.5
}

/** Word-wrap one logical line into rows no wider than ROW_PX. Over-long words are split. */
export function wrapLine(line: string): string[] {
  const rows: string[] = []
  let row = ''
  let width = 0
  const flush = () => {
    if (row.trim()) rows.push(row.trimEnd())
    row = ''
    width = 0
  }
  for (const word of line.split(/(?<= )/)) {
    const w = [...word].reduce((n, ch) => n + glyphPx(ch), 0)
    if (w > ROW_PX) {
      // a single word wider than a row: start a fresh row and hard-split it
      flush()
      for (const ch of word) {
        if (width + glyphPx(ch) > ROW_PX) flush()
        row += ch
        width += glyphPx(ch)
      }
      continue
    }
    if (width + w > ROW_PX) flush()
    row += word
    width += w
  }
  flush()
  return rows.length ? rows : ['']
}

export const wrapText = (text: string): string[] => text.split('\n').flatMap(wrapLine)

export class Feed {
  /** Finished entries (a translation pair or a note), each already wrapped into rows. */
  private entries: string[][] = []
  private live: string[] = []
  /** Floor for the first visible row. 0 normally; larger after the wearer scrolled earlier rows away. */
  private top = 0
  /** Following the newest rows (true), or reading history (false: `top` is exact). */
  private follow = true

  private get all(): string[] {
    return [...this.entries.flat(), ...this.live]
  }

  get length(): number {
    return this.entries.reduce((n, e) => n + e.length, 0) + this.live.length
  }

  /** Row index where each entry begins (the in-progress phrase counts as one). Scrolling snaps to these. */
  private get boundaries(): number[] {
    const out: number[] = []
    let at = 0
    for (const e of this.entries) {
      out.push(at)
      at += e.length
    }
    if (this.live.length) out.push(at)
    return out
  }

  /** First row of the view where the newest rows would sit at the bottom. */
  private get followStart(): number {
    return Math.max(0, this.length - VIEW_ROWS)
  }

  private get start(): number {
    return this.follow ? Math.max(this.top, this.followStart) : this.top
  }

  /** The rows on screen, top to bottom. Empty when everything has been scrolled away. */
  visible(): string[] {
    return this.all.slice(this.start, this.start + VIEW_ROWS)
  }

  /** The newest row is on screen (the normal state: new rows are followed as they arrive). */
  get atNewest(): boolean {
    return this.length > 0 && this.start >= this.followStart
  }

  /** Forget everything, as if the app had just opened. */
  clear() {
    this.entries = []
    this.live = []
    this.top = 0
    this.follow = true
  }

  /** Append a finished entry (a translation or a note). */
  add(text: string) {
    const wasFollowing = this.follow
    this.live = []
    this.entries.push(wrapText(text))
    let total = this.length
    while (total > MAX_ROWS && this.entries.length > 1) {
      const dropped = this.entries.shift()!.length
      total -= dropped
      this.top = Math.max(0, this.top - dropped)
    }
    if (!wasFollowing) {
      // reading history: a new translation brings the view back to the newest rows
      this.follow = true
      this.top = 0
    }
  }

  /** The in-progress phrase; shown below the finished rows and replaced on every update. */
  setLive(text: string) {
    this.live = text ? wrapText(text) : []
  }

  /**
   * One swipe moves a whole entry (the "JP/you" line and its translation together). 'down' brings the previous, older entry
   * back; 'up' moves toward the newest and stops there (returns false once the newest rows are already on screen).
   */
  scroll(dir: 'up' | 'down'): boolean {
    const before = this.start
    const bounds = this.boundaries
    if (dir === 'up') {
      if (before >= this.followStart) return false
      const next = Math.min(bounds.find((b) => b > before) ?? this.followStart, this.followStart)
      this.top = next
      this.follow = next >= this.followStart
      return true
    }
    const next = [...bounds].reverse().find((b) => b < before) ?? 0
    if (next === before) return false
    this.top = next
    this.follow = false
    return true
  }
}
