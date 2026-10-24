// Scenes for the non-dance modes: each turns a frame number and the band's
// width into rows of colored runs, drawn above the prompt while Claude works

export type Run = { text: string; color: string | undefined }
export type Scene = { rows: Run[][]; caption: string }

const ORANGE = 'claude'
const DIM = '#7a7a7a'
const WHITE = '#e6e6e6'
const RED = '#d0473a'
const BLUE = '#5b8dd6'
const GREEN = '#8fbc5a'
const GOLD = '#e8c547'

type Cell = { ch: string; color: string | undefined }

class Canvas {
  readonly cells: Cell[][]

  constructor(width: number, height: number) {
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ ch: ' ', color: undefined })),
    )
  }

  put(x: number, y: number, text: string, color: string | undefined): void {
    const row = this.cells[y]
    if (row === undefined) {
      return
    }
    ;[...text].forEach((ch, i) => {
      const cell = row[x + i]
      if (cell !== undefined && ch !== ' ') {
        cell.ch = ch
        cell.color = color
      }
    })
  }

  // Merges neighbouring cells of one color into a run, so each row is a few Texts
  rows(): Run[][] {
    return this.cells.map(row => {
      const runs: Run[] = []
      for (const { ch, color } of row) {
        const last = runs[runs.length - 1]
        const runColor = ch === ' ' ? last?.color : color
        if (last !== undefined && last.color === runColor) {
          last.text += ch
        } else {
          runs.push({ text: ch, color: runColor })
        }
      }

      return runs
    })
  }
}

// Bounces 0..span..0 as p grows
const pingPong = (p: number, span: number) => {
  const s = Math.max(1, span)
  const q = p % (s * 2)

  return q < s ? q : s * 2 - q
}

/** Clawd hops from one end of the band to the other and back. */
export function jump(n: number, width: number): Scene {
  const c = new Canvas(width, 4)
  const HOP = 8
  const phase = n % HOP
  const hops = Math.floor(n / HOP)
  const isAir = phase >= 2 && phase <= 5
  const travelled = hops * 8 + (isAir ? (phase - 1) * 2 : phase > 5 ? 8 : 0)
  const x = pingPong(travelled, width - 9)

  if (phase < 2) {
    // Crouching for the push-off
    c.put(x, 2, ' ▐▛███▜▌', ORANGE)
    c.put(x, 3, '▝▜█████▛▘', ORANGE)
  } else if (isAir) {
    const y = phase === 2 || phase === 5 ? 1 : 0
    c.put(x, y, ' ▐▛███▜▌', ORANGE)
    c.put(x, y + 1, '▀▜█████▛▀', ORANGE)
    c.put(x, y + 2, '  ▝▘ ▝▘', ORANGE)
    c.put(x + 2, 3, '▁▁▁▁▁', DIM)
  } else {
    c.put(x, 1, ' ▐▛███▜▌', ORANGE)
    c.put(x, 2, '▝▜█████▛▘', ORANGE)
    c.put(x, 3, '  ▘▘ ▝▝', ORANGE)
    if (phase === 6) {
      c.put(x - 2, 3, '·', DIM)
      c.put(x + 10, 3, '·', DIM)
    }
  }

  return { rows: c.rows(), caption: `Clawd прыгает · прыжок ${hops + 1}` }
}

const CAR_TOP = ' ▗▄██▄▄▖'
const CAR_BOTTOM = ' ▀o▀▀▀o▀'

/** Clawd's orange car and a blue rival race on a road that scrolls the band's full width. */
export function race(n: number, width: number): Scene {
  const c = new Canvas(width, 7)
  const scroll = n * 2

  // Red and white curbs above and below, the lane line between
  for (let x = 0; x < width; x++) {
    const isRed = Math.floor((x + scroll) / 2) % 2 === 0
    c.put(x, 0, '▀', isRed ? RED : WHITE)
    c.put(x, 6, '▄', isRed ? RED : WHITE)
    if ((x + scroll) % 6 < 3) {
      c.put(x, 3, '━', DIM)
    }
  }

  const mid = Math.floor(width / 2) - 4
  const swing = Math.min(Math.floor(width / 3), 25)
  const claudeX = mid + Math.round(swing * Math.sin(n / 23) + 3 * Math.sin(n / 7))
  const rivalX = mid + Math.round(swing * Math.sin(n / 23 + Math.PI) + 3 * Math.sin(n / 5 + 1))

  const car = (x: number, y: number, color: string) => {
    c.put(x - 3, y + 1, n % 2 === 0 ? '░ ' : ' ░', DIM)
    c.put(x, y, CAR_TOP, color)
    c.put(x, y + 1, CAR_BOTTOM, color)
  }
  car(claudeX, 1, ORANGE)
  car(rivalX, 4, BLUE)

  const lap = Math.floor(n / 150) + 1
  const leader = claudeX === rivalX ? 'ноздря в ноздрю' : claudeX > rivalX ? 'лидирует Claude' : 'Claude догоняет'

  return { rows: c.rows(), caption: `Гонка: ${leader} 🏁 · круг ${lap}` }
}

const PUDGE = {
  idle: [' ▄██▄ ', '▐████▌', ' ▐▌▐▌ '],
  hook: [' ▄██▄ ', '▐████▙', ' ▐▌▐▌ '],
  chop: [' ▄██▄▗', '▐████▛', ' ▐▌▐▌ '],
} as const
const CREEP = ['▗▖', '▐▌', '▘▝']
const HOOK_SPEED = 4
const WALK = 12
const CHOP = 6

/** Pudge throws his hook at the nearest creep, drags it in and last-hits it for gold. */
export function pudge(n: number, width: number): Scene {
  const c = new Canvas(width, 3)
  const pudgeX = 1
  const reach = pudgeX + 7
  const startX = width - 4
  const caughtX = startX - WALK
  const flight = Math.max(1, Math.ceil((caughtX - reach) / HOOK_SPEED))
  const period = WALK + flight * 2 + CHOP
  const kills = Math.floor(n / period)
  const t = n % period

  let creepX = caughtX
  let tip: number | undefined
  let pose: keyof typeof PUDGE = 'idle'
  let isHit = false

  if (t < WALK) {
    creepX = startX - t
  } else if (t < WALK + flight) {
    // The hook flies out
    pose = 'hook'
    tip = Math.min(caughtX - 1, reach + (t - WALK + 1) * HOOK_SPEED)
  } else if (t < WALK + flight * 2) {
    // ...and drags the creep back
    pose = 'hook'
    creepX = Math.max(reach, caughtX - (t - WALK - flight + 1) * HOOK_SPEED)
    tip = creepX - 1
  } else {
    pose = (t - WALK - flight * 2) % 2 === 0 ? 'chop' : 'idle'
    creepX = reach
    isHit = true
  }

  PUDGE[pose].forEach((line, y) => c.put(pudgeX, y, line, GREEN))

  if (tip !== undefined) {
    c.put(reach - 1, 1, '═'.repeat(Math.max(0, tip - reach + 1)), DIM)
    c.put(tip, 1, '⊃', WHITE)
  }

  // Creeps further back keep walking in
  for (const back of [6, 11]) {
    const x = (t < WALK ? startX - t : startX - WALK) + back
    CREEP.forEach((line, y) => c.put(x, y, line, RED))
  }

  // The last two frames the creep is gone and its bounty floats up
  const isDead = t >= period - 2
  if (!isDead) {
    CREEP.forEach((line, y) => c.put(creepX, y, line, isHit && t % 2 === 0 ? WHITE : RED))
  }
  if (isDead) {
    c.put(reach, 0, `+${38 + ((kills * 7) % 10)} золота`, GOLD)
  } else if (isHit) {
    c.put(reach + 3, 0, `-${((t * 13) % 40) + 40}`, RED)
  }

  return { rows: c.rows(), caption: `Пудж фармит крипов · ластхитов: ${kills}` }
}
