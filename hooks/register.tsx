import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { CustomDance, DanceChoice, ShowMode } from '../types'
import { jump, pudge, race, sweep } from './shows'
import type { Scene } from './shows'

const frame = atom({ plugin: 'dance-buddy', key: 'frame' } as const, 0)
const isOff = atom({ plugin: 'dance-buddy', key: 'isOff' } as const, false)
const choice = atom({ plugin: 'dance-buddy', key: 'choice' } as const, 'random')
const current = atom({ plugin: 'dance-buddy', key: 'current' } as const, 'disco')
const custom = atom({ plugin: 'dance-buddy', key: 'custom' } as const, null)
const mode = atom({ plugin: 'dance-buddy', key: 'mode' } as const, 'dance')

type Pose = readonly [string, string, string]
type Dance = { title: string; ms: number; isWide?: true; pose: (n: number, width: number) => Pose }
type DanceName = Exclude<DanceChoice, 'random' | 'claude'>

// Clawd, the Claude Code mascot, is 9 cells wide; a looped pose is 15 cells
const CLAWD_WIDTH = 9

const loop =
  (frames: readonly Pose[]) =>
  (n: number): Pose =>
    frames[n % frames.length] ?? frames[0]!

// Slides from the right edge of the band to the left and back, feet shuffling
const moonwalk = (n: number, width: number): Pose => {
  const span = Math.max(1, width - CLAWD_WIDTH)
  const step = n % (span * 2)
  const pad = ' '.repeat(step < span ? span - step : step - span)
  const legs = Math.floor(n / 2) % 2 === 0 ? '  ▘▘ ▝▝' : '  ▝▘ ▝▘'

  return [pad + ' ▐▛███▜▌', pad + '▝▜█████▛▘', pad + legs]
}

const DANCES: Record<DanceName, Dance> = {
  disco: {
    title: 'Диско',
    ms: 220,
    pose: loop([
      ['    ▐▛███▜▌    ', '   ▝▜█████▛▘   ', '     ▘▘ ▝▝     '],
      ['  ▗ ▐▛███▜▌ ▖  ', '   ▀▜█████▛▀   ', '    ▘▘   ▝▝    '],
      ['   ▐▛███▜▌     ', '  ▝▜█████▛▀▀   ', '    ▘▘ ▝▝      '],
      ['  ▗ ▐▛███▜▌ ▖  ', '   ▀▜█████▛▀   ', '     ▝▝ ▘▘     '],
      ['     ▐▛███▜▌   ', '   ▀▀▜█████▛▘  ', '      ▘▘ ▝▝    '],
      ['    ▐▛███▜▌    ', '  ▄▄▜█████▛▄▄  ', '     ▘▘ ▝▝     '],
    ]),
  },
  robot: {
    title: 'Робот',
    ms: 350,
    pose: loop([
      ['    ▐▛███▜▌    ', '   ▐▜█████▛▌   ', '     ▘▘ ▝▝     '],
      ['   ▗▐▛███▜▌    ', '   ▐▜█████▛▀▘  ', '     ▘▘ ▝▝     '],
      ['    ▐▛███▜▌    ', '   ▐▜█████▛▌   ', '     ▘▘ ▝▝     '],
      ['    ▐▛███▜▌▖   ', '  ▝▀▜█████▛▌   ', '     ▘▘ ▝▝     '],
      ['   ▗▐▛███▜▌▖   ', '   ▐▜█████▛▌   ', '     ▘▘ ▝▝     '],
      ['    ▐▙███▟▌    ', '   ▐▜█████▛▌   ', '     ▘▘ ▝▝     '],
    ]),
  },
  moonwalk: {
    title: 'Лунная походка',
    ms: 90,
    isWide: true,
    pose: moonwalk,
  },
  macarena: {
    title: 'Макарена',
    ms: 400,
    pose: loop([
      ['    ▐▛███▜▌    ', '   ▝▜█████▛▄▄  ', '     ▘▘ ▝▝     '],
      ['    ▐▛███▜▌    ', '  ▄▄▜█████▛▄▄  ', '     ▘▘ ▝▝     '],
      ['    ▐▛███▜▌▄   ', '  ▄▄▜█████▛    ', '     ▘▘ ▝▝     '],
      ['   ▄▐▛███▜▌▄   ', '    ▜█████▛    ', '     ▘▘ ▝▝     '],
      ['    ▐▛███▜▌    ', '   ▗▜█████▛▖   ', '     ▘▘ ▝▝     '],
      ['    ▐▛███▜▌    ', '   ▗▜█████▛▖   ', '    ▘▘   ▝▝    '],
    ]),
  },
  breakdance: {
    title: 'Брейк-данс',
    ms: 250,
    pose: loop([
      ['    ▐▛███▜▌    ', '   ▝▜█████▛▘   ', '     ▘▘ ▝▝     '],
      ['     ▐▛███▜▌   ', '   ▀▀▜█████▛▘  ', '      ▘▘ ▝▝    '],
      ['     ▖▖ ▗▗     ', '   ▗▟█████▙▖   ', '    ▐▙███▟▌    '],
      ['   ▖▖     ▗▗   ', '   ▗▟█████▙▖   ', '    ▐▙███▟▌    '],
      ['     ▖▖ ▗▗     ', '   ▗▟█████▙▖   ', '    ▐▙███▟▌    '],
      ['   ▐▛███▜▌     ', '  ▝▜█████▛▀▀   ', '    ▘▘ ▝▝      '],
    ]),
  },
}

const NAMES = Object.keys(DANCES) as DanceName[]
const NOTES = ['♪      ', ' ♫     ', '  ♪    ', '   ♫   ', '    ♪  ', '     ♫ ']

// The modes besides dancing: what each shows, and how fast it ticks
const SHOWS: Record<Exclude<ShowMode, 'dance'>, { title: string; ms: number; scene: (n: number, width: number) => Scene }> = {
  jump: { title: 'Прыжки', ms: 110, scene: jump },
  race: { title: 'Гонки', ms: 80, scene: race },
  pudge: { title: 'Пудж', ms: 110, scene: pudge },
  maid: { title: 'Уборка', ms: 120, scene: sweep },
}
const MODES: ShowMode[] = ['dance', 'jump', 'race', 'pudge', 'maid']
const MODE_TITLES: Record<ShowMode, string> = { dance: 'Танцы', jump: 'Прыжки', race: 'Гонки', pudge: 'Пудж', maid: 'Уборка' }
const isMode = (s: string): s is ShowMode => (MODES as string[]).includes(s)

const CUSTOM = 'custom'
const TOOL = 'mcp__dance-buddy__dance'

const isDanceName = (s: string): s is DanceName => s in DANCES
const danceOf = (name: string, own: CustomDance | null): Dance => {
  if (name === CUSTOM && own !== null) {
    return { title: own.title, ms: own.ms, pose: loop(own.frames) }
  }

  return isDanceName(name) ? DANCES[name] : DANCES.disco
}
const listing = () => NAMES.map(n => `${n} (${DANCES[n].title})`).join(', ')

// Pads or cuts each line of a pose Claude invented to the 15-cell stage
const toPose = (lines: unknown): [string, string, string] | null => {
  if (!Array.isArray(lines)) {
    return null
  }
  const [a, b, c] = lines as unknown[]
  if (lines.length !== 3 || typeof a !== 'string' || typeof b !== 'string' || typeof c !== 'string') {
    return null
  }
  const fit = (l: string) => [...l.replace(/[\t\n\r]/g, ' ')].slice(0, 15).join('').padEnd(15)

  return [fit(a), fit(b), fit(c)]
}

const CLAUDE_MODE_PROMPT = `The dance-buddy mod is in "Claude chooses" mode: a small Clawd figure dances above the prompt while you work, and you pick its dance. At the start of each turn, before other work, call the ${TOOL} tool once: pick the dance that fits the task's mood (${NAMES.join(', ')}), or now and then invent your own with "custom". Don't mention the dance in your reply unless asked.`

type Beat = { timer: Timer | undefined }

function start($: EngineInterface, beat: Beat, ms: number) {
  beat.timer?.cancel()
  beat.timer = $.clock.every(ms, () => {
    void update($, frame, n => n + 1)
  })
}

function stop(beat: Beat) {
  beat.timer?.cancel()
  beat.timer = undefined
}

// Swaps the tempo of a dance already under way; between turns there is nothing to swap
function restart($: EngineInterface, beat: Beat, ms: number) {
  if (beat.timer !== undefined) {
    start($, beat, ms)
  }
}

export const register: Register = on => {
  const beat: Beat = { timer: undefined }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dance',
      description: 'Выбрать танец Claude, или выключить и включить его',
      argumentHint: `[${NAMES.join('|')}|claude|random|next|off|on]`,
      immediate: true,
    })
    await $.command.register({
      name: 'mode',
      description: 'Выбрать, что показывать, пока Claude работает: танцы, прыжки, гонки, Пудж или уборка',
      argumentHint: `[${MODES.join('|')}|next]`,
      immediate: true,
    })
    await $.tool.register({
      name: 'dance',
      description:
        'Sets the dance of the Clawd figure that animates above the prompt while you work. ' +
        `Pick one of: ${NAMES.join(', ')}; or pass dance "custom" with your own choreography: ` +
        '2-8 frames, each exactly 3 lines of at most 15 cells drawn with block characters (▐▛█▜▌▝▘▗▖▄▀▙▟), ' +
        "Clawd's resting pose being [\"    ▐▛███▜▌    \", \"   ▝▜█████▛▘   \", \"     ▘▘ ▝▝     \"].",
      inputSchema: {
        type: 'object',
        properties: {
          dance: { type: 'string', enum: [...NAMES, CUSTOM] },
          title: { type: 'string', description: 'Name shown under Clawd, for a custom dance' },
          ms: { type: 'number', description: 'Milliseconds per frame, for a custom dance (80-800)' },
          frames: {
            type: 'array',
            minItems: 2,
            maxItems: 8,
            items: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
          },
        },
        required: ['dance'],
      },
      isDeferred: false,
    })

    return next(e)
  })

  on('command.run', { command: 'dance' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === '') {
      const wasOff = await read($, isOff)
      await update($, isOff, () => !wasOff)

      return { text: wasOff ? 'Claude снова танцует 💃' : 'Claude больше не танцует' }
    }

    if (arg === 'off' || arg === 'on') {
      await update($, isOff, () => arg === 'off')

      return { text: arg === 'off' ? 'Claude больше не танцует' : 'Claude снова танцует 💃' }
    }

    if (arg === 'claude') {
      await update($, choice, () => 'claude')
      await update($, isOff, () => false)

      return { text: 'Теперь Claude сам выбирает себе танец каждый ход, а иногда придумывает свой 🎭' }
    }

    if (arg === 'random') {
      await update($, choice, () => 'random')

      return { text: 'Теперь каждый ход — случайный танец 🎲' }
    }

    const name = arg === 'next' ? NAMES[(NAMES.indexOf((await read($, current)) as DanceName) + 1) % NAMES.length] : arg

    if (name === undefined || !isDanceName(name)) {
      return { text: `Не знаю такого танца. Есть: ${listing()}, а ещё claude, random, next, off, on` }
    }

    await update($, choice, () => name)
    await update($, current, () => name)
    await update($, isOff, () => false)
    await update($, mode, () => 'dance')
    await update($, frame, () => 0)

    restart($, beat, DANCES[name].ms)

    return { text: `Теперь Claude танцует: ${DANCES[name].title} 🕺` }
  }).catch(() => ({ text: 'Не получилось переключить танец' }))

  on('command.run', { command: 'mode' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const was = await read($, mode)
    const picked = arg === '' || arg === 'next' ? MODES[(MODES.indexOf(was) + 1) % MODES.length] : arg

    if (picked === undefined || !isMode(picked)) {
      return { text: `Нет такого режима. Есть: ${MODES.map(m => `${m} (${MODE_TITLES[m]})`).join(', ')}, а ещё next` }
    }

    await update($, mode, () => picked)
    await update($, isOff, () => false)
    await update($, frame, () => 0)
    restart($, beat, picked === 'dance' ? danceOf(await read($, current), await read($, custom)).ms : SHOWS[picked].ms)

    return { text: `Режим: ${MODE_TITLES[picked]} 🎬` }
  }).catch(() => ({ text: 'Не получилось переключить режим' }))

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as { dance?: unknown; title?: unknown; ms?: unknown; frames?: unknown }

    if (typeof input.dance === 'string' && isDanceName(input.dance)) {
      const name = input.dance
      await update($, current, () => name)
      await update($, frame, () => 0)
      restart($, beat, DANCES[name].ms)

      return { result: `Clawd now dances: ${name}` }
    }

    if (input.dance !== CUSTOM) {
      return { isError: true, result: `Unknown dance. Use one of: ${NAMES.join(', ')}, ${CUSTOM}` }
    }

    const frames = Array.isArray(input.frames) ? input.frames.slice(0, 8).map(toPose) : []
    const poses = frames.filter(f => f !== null)

    if (poses.length < 2 || poses.length !== frames.length) {
      return { isError: true, result: 'A custom dance needs 2-8 frames, each an array of exactly 3 strings' }
    }

    const ms = typeof input.ms === 'number' ? Math.min(800, Math.max(80, Math.round(input.ms))) : 250
    const title = typeof input.title === 'string' && input.title.trim() !== '' ? input.title.trim().slice(0, 40) : 'Танец от Claude'
    await update($, custom, () => ({ title, ms, frames: poses }))
    await update($, current, () => CUSTOM)
    await update($, frame, () => 0)
    restart($, beat, ms)

    return { result: `Clawd now dances your own "${title}", ${poses.length} frames at ${ms}ms` }
  }).catch(() => ({ isError: true as const, result: 'The dance could not be set' }))

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    if ((await read($, choice)) !== 'claude' || (await read($, isOff)) || (await read($, mode)) !== 'dance') {
      return composed
    }

    return {
      ...composed,
      sections: [...composed.sections, { id: 'dance-buddy', text: CLAUDE_MODE_PROMPT, scope: 'session' }],
    }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && beat.timer === undefined) {
      const picked = await read($, choice)
      // In Claude's mode the turn opens with a random dance until Claude calls its tool
      const name = picked === 'random' || picked === 'claude' ? NAMES[Math.floor(Math.random() * NAMES.length)] ?? 'disco' : picked
      await update($, current, () => name)
      await update($, frame, () => 0)
      const shown = await read($, mode)
      start($, beat, shown === 'dance' ? DANCES[name].ms : SHOWS[shown].ms)
    }

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      stop(beat)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!e.props.isWorking || e.props.hasSurvey || e.props.maxRows < 3 || (await read($, isOff))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const n = await read($, frame)
    const shown = await read($, mode)

    if (shown !== 'dance') {
      const scene = SHOWS[shown].scene(n, e.props.bodyColumns)
      const isCaptioned = e.props.maxRows > scene.rows.length

      return (
        <Box flexDirection="column">
          {scene.rows.map((runs, y) => (
            <Box key={`r${y}`} flexDirection="row">
              {runs.map((run, i) => (
                <Text key={`r${y}c${i}`} color={run.color} mono>
                  {run.text}
                </Text>
              ))}
            </Box>
          ))}
          {isCaptioned ? (
            <Text dimColor wrap="truncate">
              {scene.caption} · /mode — сменить режим
            </Text>
          ) : null}
        </Box>
      )
    }
    const dance = danceOf(await read($, current), await read($, custom))
    const notes = NOTES[n % NOTES.length] ?? NOTES[0]!
    const caption = `Claude думает и танцует: ${dance.title}`
    const hint = '/dance next — другой танец · /mode — сменить режим'

    if (dance.isWide) {
      return (
        <Box flexDirection="column">
          {dance.pose(n, e.props.bodyColumns).map((line, i) => (
            <Text key={`l${i}`} color="claude" mono wrap="truncate">
              {line}
            </Text>
          ))}
          {e.props.maxRows >= 4 ? (
            <Text dimColor wrap="truncate">
              {notes.trim()} {caption} · {hint}
            </Text>
          ) : null}
        </Box>
      )
    }

    const pose = dance.pose(n, e.props.bodyColumns)

    return (
      <Box flexDirection="row">
        <Box flexDirection="column">
          {pose.map((line, i) => (
            <Text key={`l${i}`} color="claude" mono>
              {line}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text color="claude">{notes}</Text>
          <Text dimColor>{caption}</Text>
          <Text dimColor>{hint}</Text>
        </Box>
      </Box>
    )
  })
}
