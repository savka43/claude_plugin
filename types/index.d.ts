export type DanceChoice = 'random' | 'claude' | 'disco' | 'robot' | 'moonwalk' | 'macarena' | 'breakdance'

export type ShowMode = 'dance' | 'jump' | 'race' | 'pudge' | 'maid'

export type CustomDance = { title: string; ms: number; frames: [string, string, string][] }

declare module 'claude-code' {
  interface PluginState {
    'dance-buddy': {
      frame: number
      isOff: boolean
      choice: DanceChoice
      current: string
      custom: CustomDance | null
      mode: ShowMode
    }
  }
}
