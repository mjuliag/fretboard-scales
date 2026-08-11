import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { CancellablePlayback } from './audio.ts'
import type { Instrument } from './music/index.ts'
import { getPentatonicPattern } from './music/pentatonicPatterns.ts'
import { getThreeNpsPattern, shiftThreeNpsPattern } from './music/threeNps.ts'
import { createPatternPlaybackRoute } from './patternPlayback.ts'
import { PatternPlaybackSession } from './soundState.ts'

type Coordinate = { fret: number; stringIndex: number }

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

class AppPlaybackHarness {
  session = new PatternPlaybackSession()
  highlight: Coordinate | null = null
  instrument: Instrument
  isPlaying = false
  visibleCoordinates: readonly Coordinate[] | null
  emitStep = (_index: number) => {}
  playback: ReturnType<typeof deferredPlayback> | null = null

  constructor(instrument: Instrument, coordinates: readonly Coordinate[] | null) {
    this.instrument = instrument
    this.visibleCoordinates = coordinates
  }

  start(): void {
    assert.ok(this.visibleCoordinates)
    const route = createPatternPlaybackRoute(this.instrument, this.visibleCoordinates)
    const playback = deferredPlayback()
    this.playback = playback
    const started = this.session.start(
      true,
      (emitStep) => {
        this.emitStep = emitStep
        return playback
      },
      (index) => {
        this.highlight = route[index].coordinate
      },
      () => {
        this.highlight = null
        this.isPlaying = false
      },
    )
    this.isPlaying = started
  }

  changePattern(
    instrument: Instrument,
    coordinates: readonly Coordinate[] | null,
  ): void {
    this.stop()
    this.instrument = instrument
    this.visibleCoordinates = coordinates
  }

  stop(): void {
    this.session.cancel()
    this.session = new PatternPlaybackSession()
    this.highlight = null
    this.isPlaying = false
  }
}

function coordinateKey(coordinate: Coordinate | null): string | null {
  return coordinate ? `${coordinate.stringIndex}:${coordinate.fret}` : null
}

function currentHighlight(app: AppPlaybackHarness): Coordinate | null {
  return app.highlight
}

describe('App pattern playback cancellation wiring', () => {
  it('cancels Pattern 1, suppresses stale callbacks, and restarts on Pattern 2', () => {
    const pattern1 = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 1)
    const pattern2 = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 2)
    const app = new AppPlaybackHarness('guitar', pattern1.notes)

    app.start()
    const emitPattern1 = app.emitStep
    emitPattern1(0)
    assert.equal(coordinateKey(app.highlight), '0:5')

    const oldPlayback = app.playback
    app.changePattern('guitar', pattern2.notes)
    emitPattern1(1)

    assert.equal(oldPlayback?.cancelled, true)
    assert.equal(app.isPlaying, false)
    assert.equal(app.highlight, null)

    app.start()
    app.emitStep(0)
    const pattern2Coordinates = new Set(pattern2.notes.map(coordinateKey))
    assert.ok(pattern2Coordinates.has(coordinateKey(app.highlight)))
    assert.notEqual(coordinateKey(app.highlight), '0:5')
  })

  it('treats Stop as cancellation and restarts from the first route coordinate', () => {
    const pattern = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 1)
    const route = createPatternPlaybackRoute('guitar', pattern.notes)
    const app = new AppPlaybackHarness('guitar', pattern.notes)

    app.start()
    const cancelledRunEmit = app.emitStep
    cancelledRunEmit(0)
    cancelledRunEmit(1)
    assert.equal(
      coordinateKey(app.highlight),
      coordinateKey(route[1].coordinate),
    )

    const cancelledPlayback = app.playback
    app.stop()
    cancelledRunEmit(2)

    assert.equal(cancelledPlayback?.cancelled, true)
    assert.equal(app.highlight, null)
    assert.equal(app.isPlaying, false)

    app.start()
    app.emitStep(0)

    assert.equal(
      coordinateKey(app.highlight),
      coordinateKey(route[0].coordinate),
    )
    assert.notEqual(app.playback, cancelledPlayback)
  })

  it('cancels stale playback for root, scale/mode, and instrument changes', () => {
    const initial = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 1)
    const replacements = [
      {
        coordinates: getPentatonicPattern('C', 'minorPentatonic', 'guitar', 1).notes,
        instrument: 'guitar' as const,
        reason: 'root',
      },
      { coordinates: null, instrument: 'guitar' as const, reason: 'All Notes' },
      {
        coordinates: getPentatonicPattern('A', 'minorPentatonic', 'bass', 1).notes,
        instrument: 'bass' as const,
        reason: 'instrument',
      },
    ]

    for (const replacement of replacements) {
      const app = new AppPlaybackHarness('guitar', initial.notes)
      app.start()
      const staleEmit = app.emitStep
      const playback = app.playback
      staleEmit(0)

      app.changePattern(replacement.instrument, replacement.coordinates)
      staleEmit(1)

      assert.equal(playback?.cancelled, true, replacement.reason)
      assert.equal(app.highlight, null, replacement.reason)
      assert.equal(app.isPlaying, false, replacement.reason)
      assert.equal(
        replacement.coordinates === null,
        app.visibleCoordinates === null,
        replacement.reason,
      )
    }
  })

  it('cancels for a 3NPS position change and restarts on the exact shifted placement', () => {
    const base = getThreeNpsPattern('E', 'major', 'guitar', 1)
    assert.ok(base)
    const position6 = getThreeNpsPattern('E', 'major', 'guitar', 6)
    assert.ok(position6)
    const shifted = shiftThreeNpsPattern(base, 12)
    assert.ok(shifted)
    const app = new AppPlaybackHarness('guitar', base.notes)

    app.start()
    const staleEmit = app.emitStep
    app.changePattern('guitar', position6.notes)
    staleEmit(1)
    assert.equal(app.highlight, null)

    app.start()
    app.emitStep(0)
    assert.ok(position6.notes.some(
      (coordinate) => coordinateKey(coordinate) === coordinateKey(app.highlight),
    ))

    const stalePosition6Emit = app.emitStep
    app.changePattern('guitar', shifted.notes)
    stalePosition6Emit(1)
    assert.equal(app.highlight, null)

    app.start()
    app.emitStep(0)
    assert.ok(shifted.notes.some(
      (coordinate) => coordinateKey(coordinate) === coordinateKey(app.highlight),
    ))
    assert.ok((currentHighlight(app)?.fret ?? 0) >= 12)
  })
})
