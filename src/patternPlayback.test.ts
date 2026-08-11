import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createPatternPlaybackRoute,
  type PatternPlaybackStep,
} from './patternPlayback.ts'
import type { Instrument, PitchClass } from './music/index.ts'
import {
  getPentatonicPattern,
  type PentatonicPosition,
  type PentatonicScaleName,
} from './music/pentatonicPatterns.ts'
import {
  getThreeNpsPattern,
  shiftThreeNpsPattern,
  type ThreeNpsPosition,
} from './music/threeNps.ts'
import {
  getFretboardPitch,
  pitchToFrequency,
  pitchToSemitone,
} from './music/pitch.ts'

type Coordinate = { stringIndex: number; fret: number }

function coordinateKey({ stringIndex, fret }: Coordinate): string {
  return `${stringIndex}:${fret}`
}

function assertCompleteAscendingTraversal(
  instrument: Instrument,
  coordinates: readonly Coordinate[],
  route: readonly PatternPlaybackStep[],
): void {
  const coordinateKeys = new Set(coordinates.map(coordinateKey))
  const uniquePatternPitches = new Set(coordinates.map((coordinate) => (
    pitchToSemitone(getFretboardPitch(
      instrument,
      coordinate.stringIndex,
      coordinate.fret,
    ))
  )))

  assert.equal(route.length, uniquePatternPitches.size)
  assert.ok(route.every(({ coordinate }) => coordinateKeys.has(coordinateKey(coordinate))))

  route.forEach((step, index) => {
    assert.deepEqual(
      step.pitch,
      getFretboardPitch(instrument, step.coordinate.stringIndex, step.coordinate.fret),
    )
    assert.equal(step.frequency, pitchToFrequency(step.pitch))
    if (index > 0) {
      assert.ok(
        pitchToSemitone(route[index - 1].pitch) < pitchToSemitone(step.pitch),
        'physical pitches must be strictly ascending',
      )
    }
  })

  const patternSemitones = [...uniquePatternPitches].sort((a, b) => a - b)
  assert.equal(pitchToSemitone(route[0].pitch), patternSemitones[0])
  assert.equal(
    pitchToSemitone(route[route.length - 1].pitch),
    patternSemitones[patternSemitones.length - 1],
  )
}

function pentatonicRoute(
  root: PitchClass,
  scale: PentatonicScaleName,
  instrument: Instrument,
  position: PentatonicPosition,
) {
  const pattern = getPentatonicPattern(root, scale, instrument, position)
  return {
    pattern,
    route: createPatternPlaybackRoute(instrument, pattern.notes),
  }
}

function threeNpsRoute(
  root: PitchClass,
  instrument: Instrument,
  position: ThreeNpsPosition,
) {
  const pattern = getThreeNpsPattern(root, 'major', instrument, position)
  assert.ok(pattern)
  return {
    pattern,
    route: createPatternPlaybackRoute(instrument, pattern.notes),
  }
}

describe('pentatonic pattern playback traversal', () => {
  it('plays the complete A Minor Pentatonic Pattern 1 shape, beyond its first octave root', () => {
    const { pattern, route } = pentatonicRoute('A', 'minorPentatonic', 'guitar', 1)

    assertCompleteAscendingTraversal('guitar', pattern.notes, route)
    assert.deepEqual(
      route.map(({ pitch }) => `${pitch.pitchClass}${pitch.octave}`),
      ['A2', 'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    )
    assert.ok(route.findIndex(({ pitch }) => pitch.pitchClass === 'A' && pitch.octave === 3)
      < route.length - 1)
    assert.ok(route.filter(({ pitch }) => pitch.pitchClass === 'A').length > 1)
  })

  it('uses only the currently selected Pattern 4 coordinates', () => {
    const selected = pentatonicRoute('D', 'minorPentatonic', 'guitar', 4)
    const previous = pentatonicRoute('D', 'minorPentatonic', 'guitar', 1)

    assertCompleteAscendingTraversal('guitar', selected.pattern.notes, selected.route)
    assert.notDeepEqual(
      selected.route.map(({ coordinate }) => coordinateKey(coordinate)),
      previous.route.map(({ coordinate }) => coordinateKey(coordinate)),
    )
  })

  it('keeps Major Pentatonic playback on the visible relative-minor shape', () => {
    const major = pentatonicRoute('A', 'majorPentatonic', 'guitar', 1)
    const relativeMinor = pentatonicRoute('F#', 'minorPentatonic', 'guitar', 2)

    assert.deepEqual(
      major.pattern.notes.map(coordinateKey),
      relativeMinor.pattern.notes.map(coordinateKey),
    )
    assert.deepEqual(
      major.route.map(({ coordinate }) => coordinateKey(coordinate)),
      relativeMinor.route.map(({ coordinate }) => coordinateKey(coordinate)),
    )
  })

  it('orders a Bass pentatonic shape by octave-aware physical pitch', () => {
    const { pattern, route } = pentatonicRoute('E', 'minorPentatonic', 'bass', 2)
    assertCompleteAscendingTraversal('bass', pattern.notes, route)
  })
})

describe('3NPS pattern playback traversal', () => {
  it('traverses the complete selected Guitar positions without outside coordinates', () => {
    for (const position of [1, 6] as const) {
      const { pattern, route } = threeNpsRoute('C', 'guitar', position)
      assertCompleteAscendingTraversal('guitar', pattern.notes, route)
    }
  })

  it('traverses the complete selected Bass position', () => {
    const { pattern, route } = threeNpsRoute('G', 'bass', 3)
    assertCompleteAscendingTraversal('bass', pattern.notes, route)
  })

  it('preserves the exact +12 placement instead of returning to unshifted coordinates', () => {
    const base = getThreeNpsPattern('E', 'major', 'guitar', 1)
    assert.ok(base)
    const shifted = shiftThreeNpsPattern(base, 12)
    assert.ok(shifted)

    const route = createPatternPlaybackRoute('guitar', shifted.notes)
    assertCompleteAscendingTraversal('guitar', shifted.notes, route)
    assert.ok(route.every(({ coordinate }) => (
      base.notes.some(({ stringIndex, fret }) => (
        stringIndex === coordinate.stringIndex && fret + 12 === coordinate.fret
      ))
    )))
    assert.ok(route.every(({ coordinate }) => (
      !base.notes.some(({ stringIndex, fret }) => (
        stringIndex === coordinate.stringIndex && fret === coordinate.fret
      ))
    )))
  })
})

describe('duplicate physical pitch handling', () => {
  it('keeps one deterministic unison while retaining the same pitch class in another octave', () => {
    const route = createPatternPlaybackRoute('guitar', [
      { stringIndex: 1, fret: 0 }, // A2
      { stringIndex: 0, fret: 5 }, // A2
      { stringIndex: 0, fret: 17 }, // A3
    ])

    assert.deepEqual(route.map(({ coordinate }) => coordinateKey(coordinate)), ['0:5', '0:17'])
    assert.deepEqual(route.map(({ pitch }) => pitch), [
      { pitchClass: 'A', octave: 2 },
      { pitchClass: 'A', octave: 3 },
    ])
  })
})
