import type { CancellablePlayback } from './audio.ts'

export type NotePlaybackHandler = (stringIndex: number, fret: number) => void

export const DEFAULT_SOUND_ENABLED = false

export class PatternPlaybackGate {
  #isPlaying = false

  get isPlaying(): boolean {
    return this.#isPlaying
  }

  tryStart(soundEnabled: boolean): boolean {
    if (!soundEnabled || this.#isPlaying) return false

    this.#isPlaying = true
    return true
  }

  complete(): void {
    this.#isPlaying = false
  }
}

export class PatternPlaybackSession {
  readonly #gate = new PatternPlaybackGate()
  #activePlayback: CancellablePlayback | null = null
  #activeRun: object | null = null

  get isPlaying(): boolean {
    return this.#gate.isPlaying
  }

  start(
    soundEnabled: boolean,
    createPlayback: (onStep: (index: number) => void) => CancellablePlayback,
    onStep: (index: number) => void,
    onComplete: () => void,
  ): boolean {
    if (!this.#gate.tryStart(soundEnabled)) return false

    const run = {}
    this.#activeRun = run
    let playback: CancellablePlayback
    try {
      playback = createPlayback((index) => {
        if (this.#activeRun === run) onStep(index)
      })
    } catch {
      this.#activeRun = null
      this.#gate.complete()
      onComplete()
      return false
    }
    this.#activePlayback = playback

    const finish = () => {
      if (this.#activeRun !== run) return
      this.#activeRun = null
      this.#activePlayback = null
      this.#gate.complete()
      onComplete()
    }
    void playback.completion.then(finish, finish)
    return true
  }

  cancel(): void {
    this.#activeRun = null
    const playback = this.#activePlayback
    this.#activePlayback = null
    this.#gate.complete()
    playback?.cancel()
  }
}

export function isPatternPlaybackAvailable(
  soundEnabled: boolean,
  isPlaying: boolean,
  hasCompleteRoute = true,
): boolean {
  return soundEnabled && !isPlaying && hasCompleteRoute
}

export function getNotePlaybackHandler(
  soundEnabled: boolean,
  playNote: NotePlaybackHandler,
): NotePlaybackHandler | undefined {
  return soundEnabled ? playNote : undefined
}
