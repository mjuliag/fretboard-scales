import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  INDIVIDUAL_NOTE_DURATION_SECONDS,
  playFrequency,
  playFrequencySequence,
  playSequence,
  startFrequencySequence,
  PATTERN_NOTE_DURATION_SECONDS,
} from './audio.ts'

class FakeAudioParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
}

class FakeOscillator {
  readonly frequency = new FakeAudioParam()
  type = 'sine'
  disconnectCount = 0
  stopTimes: number[] = []
  #ended: (() => void) | null = null

  addEventListener(_type: string, listener: () => void) {
    this.#ended = listener
  }

  connect() {}

  disconnect() {
    this.disconnectCount += 1
  }

  start() {}

  stop(time: number) {
    this.stopTimes.push(time)
    if (this.stopTimes.length > 1) queueMicrotask(() => this.#ended?.())
  }
}

class FakeGain {
  readonly gain = new FakeAudioParam()
  disconnectCount = 0

  connect() {}

  disconnect() {
    this.disconnectCount += 1
  }
}

class FakeAudioContext {
  readonly currentTime = 10
  readonly destination = {}
  readonly oscillators: FakeOscillator[] = []
  readonly gains: FakeGain[] = []
  state = 'running'

  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }

  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }

  async resume() {}
}

describe('audio sequence synchronization', () => {
  it('advances the visual callback with each audio item and waits for completion', async () => {
    const events: string[] = []
    const releases: Array<() => void> = []
    const playback = playSequence(
      ['C3', 'D3'],
      (pitch) => new Promise<void>((resolve) => {
        events.push(`audio:${pitch}`)
        releases.push(resolve)
      }),
      (_, pitch) => events.push(`visual:${pitch}`),
    )

    assert.deepEqual(events, ['visual:C3', 'audio:C3'])
    releases.shift()?.()
    await Promise.resolve()
    assert.deepEqual(events, [
      'visual:C3',
      'audio:C3',
      'visual:D3',
      'audio:D3',
    ])
    releases.shift()?.()
    await playback
  })
})

describe('audio sequence pacing', () => {
  it('uses 600ms pattern notes while preserving the 400ms individual-note default', async () => {
    const played: Array<{ duration: number; frequency: number }> = []

    await playFrequencySequence(
      [261.63, 293.66],
      undefined,
      async (frequency, duration) => {
        played.push({ duration, frequency })
      },
    )

    assert.equal(PATTERN_NOTE_DURATION_SECONDS, 0.6)
    assert.equal(INDIVIDUAL_NOTE_DURATION_SECONDS, 0.4)
    assert.deepEqual(played, [
      { duration: 0.6, frequency: 261.63 },
      { duration: 0.6, frequency: 293.66 },
    ])
  })
})

describe('audio sequence cancellation', () => {
  it('stops and cleans up the active oscillator idempotently', async () => {
    const context = new FakeAudioContext()
    Object.assign(globalThis, {
      AudioContext: class {
        constructor() {
          return context
        }
      },
    })
    const controller = new AbortController()
    const playback = playFrequency(220, 0.6, controller.signal)

    controller.abort()
    controller.abort()
    await playback

    assert.equal(context.oscillators.length, 1)
    assert.deepEqual(context.oscillators[0].stopTimes, [10.6, 10])
    assert.equal(context.oscillators[0].disconnectCount, 1)
    assert.equal(context.gains[0].disconnectCount, 1)
  })

  it('prevents future notes and permits a fresh sequence after cancellation', async () => {
    const firstSteps: number[] = []
    const first = startFrequencySequence([220, 246.94], (index) => firstSteps.push(index))

    first.cancel()
    first.cancel()
    await first.completion
    assert.deepEqual(firstSteps, [0])

    const secondSteps: number[] = []
    const second = startFrequencySequence([261.63], (index) => secondSteps.push(index))
    second.cancel()
    await second.completion

    assert.deepEqual(secondSteps, [0])
  })
})
