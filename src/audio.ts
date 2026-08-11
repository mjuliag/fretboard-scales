export const INDIVIDUAL_NOTE_DURATION_SECONDS = 0.4
export const PATTERN_NOTE_DURATION_SECONDS = 0.6
const ATTACK_SECONDS = 0.012
const RELEASE_SECONDS = 0.12
const PEAK_GAIN = 0.12

let audioContext: AudioContext | null = null

export type CancellablePlayback = {
  cancel: () => void
  completion: Promise<void>
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  return audioContext
}

export async function playFrequency(
  frequency: number,
  durationSeconds = INDIVIDUAL_NOTE_DURATION_SECONDS,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return

  const context = getAudioContext()

  if (context.state === 'suspended') {
    await context.resume()
  }

  if (signal?.aborted) return

  const startTime = context.currentTime
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, startTime + ATTACK_SECONDS)
  const releaseStartTime = startTime + durationSeconds - RELEASE_SECONDS
  gain.gain.setValueAtTime(PEAK_GAIN, releaseStartTime)
  gain.gain.linearRampToValueAtTime(0, startTime + durationSeconds)

  oscillator.connect(gain)
  gain.connect(context.destination)
  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', stop)
      oscillator.disconnect()
      gain.disconnect()
      resolve()
    }
    const stop = () => {
      try {
        oscillator.stop(context.currentTime)
      } catch {
        finish()
      }
    }

    oscillator.addEventListener('ended', finish, { once: true })
    signal?.addEventListener('abort', stop, { once: true })
    oscillator.start(startTime)
    oscillator.stop(startTime + durationSeconds)
  })
}

export async function playFrequencySequence(
  frequencies: readonly number[],
  onNoteStart?: (index: number) => void,
  playTone: (
    frequency: number,
    durationSeconds: number,
    signal?: AbortSignal,
  ) => Promise<void>
    = playFrequency,
  signal?: AbortSignal,
): Promise<void> {
  await playSequence(
    frequencies,
    (frequency) => playTone(frequency, PATTERN_NOTE_DURATION_SECONDS, signal),
    onNoteStart,
    signal,
  )
}

export function startFrequencySequence(
  frequencies: readonly number[],
  onNoteStart?: (index: number) => void,
): CancellablePlayback {
  const controller = new AbortController()

  return {
    cancel: () => controller.abort(),
    completion: playFrequencySequence(
      frequencies,
      onNoteStart,
      playFrequency,
      controller.signal,
    ),
  }
}

export async function playSequence<T>(
  items: readonly T[],
  playItem: (item: T) => Promise<void>,
  onItemStart?: (index: number, item: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  for (let index = 0; index < items.length; index += 1) {
    if (signal?.aborted) return
    const item = items[index]
    onItemStart?.(index, item)
    await playItem(item)
  }
}
