import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_SOUND_ENABLED,
  getNotePlaybackHandler,
  isPatternPlaybackAvailable,
  PatternPlaybackGate,
  PatternPlaybackSession,
} from './soundState.ts'
import type { CancellablePlayback } from './audio.ts'

function deferredPlayback(): CancellablePlayback & {
  cancelled: boolean
  finish: () => void
} {
  let finish = () => {}
  let cancelled = false
  const completion = new Promise<void>((resolve) => {
    finish = resolve
  })

  return {
    get cancelled() {
      return cancelled
    },
    cancel: () => {
      cancelled = true
      finish()
    },
    completion,
    finish,
  }
}

describe('Sound interaction policy', () => {
  it('defaults Sound to off', () => {
    assert.equal(DEFAULT_SOUND_ENABLED, false)
  })

  it('exposes no playback interaction while Sound is off', () => {
    const requests: Array<[number, number]> = []
    const handler = getNotePlaybackHandler(
      false,
      (stringIndex, fret) => requests.push([stringIndex, fret]),
    )

    assert.equal(handler, undefined)
    assert.deepEqual(requests, [])
  })

  it('enabling Sound does not play until the note interaction occurs', () => {
    const requests: Array<[number, number]> = []
    const unrelatedState = Object.freeze({ root: 'A', patternMode: 'all' })
    const handler = getNotePlaybackHandler(
      true,
      (stringIndex, fret) => requests.push([stringIndex, fret]),
    )

    assert.ok(handler)
    assert.deepEqual(requests, [])

    handler(3, 14)

    assert.deepEqual(requests, [[3, 14]])
    assert.deepEqual(unrelatedState, { root: 'A', patternMode: 'all' })
  })
})

describe('pattern playback state', () => {
  it('keeps Play Pattern unavailable while Sound is off', () => {
    const gate = new PatternPlaybackGate()

    assert.equal(isPatternPlaybackAvailable(false, gate.isPlaying), false)
    assert.equal(gate.tryStart(false), false)
    assert.equal(gate.isPlaying, false)
  })

  it('keeps Play Pattern unavailable without a valid route', () => {
    assert.equal(isPatternPlaybackAvailable(true, false, false), false)
    assert.equal(isPatternPlaybackAvailable(true, false, true), true)
  })

  it('enabling Sound does not start playback', () => {
    const gate = new PatternPlaybackGate()

    assert.equal(isPatternPlaybackAvailable(true, gate.isPlaying), true)
    assert.equal(gate.isPlaying, false)
  })

  it('blocks overlapping requests and returns to idle on completion', () => {
    const gate = new PatternPlaybackGate()

    assert.equal(gate.tryStart(true), true)
    assert.equal(gate.isPlaying, true)
    assert.equal(isPatternPlaybackAvailable(true, gate.isPlaying), false)
    assert.equal(gate.tryStart(true), false)

    gate.complete()

    assert.equal(gate.isPlaying, false)
    assert.equal(isPatternPlaybackAvailable(true, gate.isPlaying), true)
  })

  it('cancels a stale App playback run and accepts the replacement immediately', async () => {
    const session = new PatternPlaybackSession()
    const first = deferredPlayback()
    const second = deferredPlayback()
    const steps: string[] = []
    let emitFirst = (_index: number) => {}
    let emitSecond = (_index: number) => {}

    assert.equal(session.start(
      true,
      (emit) => {
        emitFirst = emit
        return first
      },
      (index) => steps.push(`pattern-1:${index}`),
      () => steps.push('pattern-1:complete'),
    ), true)
    emitFirst(0)

    session.cancel()
    emitFirst(1)
    assert.equal(first.cancelled, true)
    assert.equal(session.isPlaying, false)

    assert.equal(session.start(
      true,
      (emit) => {
        emitSecond = emit
        return second
      },
      (index) => steps.push(`pattern-2:${index}`),
      () => steps.push('pattern-2:complete'),
    ), true)
    emitSecond(0)
    second.finish()
    await second.completion
    await Promise.resolve()

    assert.deepEqual(steps, ['pattern-1:0', 'pattern-2:0', 'pattern-2:complete'])
    assert.equal(session.isPlaying, false)
  })
})
