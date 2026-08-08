import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getChordTones,
  getScaleTones,
  PITCH_CLASSES,
  type Instrument,
  type ModeName,
  type PitchClass,
} from './index.ts'
import {
  findEquivalentThreeNpsPosition,
  getThreeNpsPattern,
  shiftThreeNpsPattern,
  THREE_NPS_POSITIONS,
  type ThreeNpsPattern,
  type ThreeNpsPosition,
} from './threeNps.ts'

const MODES = [
  ['ionian', 0],
  ['dorian', 2],
  ['phrygian', 4],
  ['lydian', 5],
  ['mixolydian', 7],
  ['aeolian', 9],
  ['locrian', 11],
] as const satisfies readonly [ModeName, number][]

function parentRoot(root: PitchClass, offset: number): PitchClass {
  const index = PITCH_CLASSES.indexOf(root)
  return PITCH_CLASSES[(index - offset + PITCH_CLASSES.length) % PITCH_CLASSES.length]
}

function coordinates(pattern: ThreeNpsPattern): string[] {
  return pattern.notes
    .map(({ fret, stringIndex }) => `${stringIndex}:${fret}`)
    .sort()
}

function mappedPattern(
  source: ThreeNpsPattern,
  root: PitchClass,
  scale: ModeName | 'major',
  instrument: Instrument,
) {
  const equivalent = findEquivalentThreeNpsPosition(source, root, scale, instrument)
  assert.ok(equivalent)
  const generated = getThreeNpsPattern(root, scale, instrument, equivalent.position)
  assert.ok(generated)
  const shifted = shiftThreeNpsPattern(generated, equivalent.fretShift)
  assert.ok(shifted)
  return { equivalent, pattern: shifted }
}

function assertCompleteAndBounded(pattern: ThreeNpsPattern, instrument: Instrument) {
  assert.equal(pattern.notes.length, instrument === 'guitar' ? 18 : 12)
  assert.ok(pattern.notes.every(({ fret }) => fret >= 0 && fret <= 24))
  for (let stringIndex = 0; stringIndex < (instrument === 'guitar' ? 6 : 4); stringIndex += 1) {
    assert.equal(pattern.notes.filter((note) => note.stringIndex === stringIndex).length, 3)
  }
}

describe('exhaustive modal parent-major 3NPS QA', () => {
  for (const instrument of ['guitar', 'bass'] as const) {
    it(`preserves exact coordinates for all 12 roots, 7 modes, and 7 positions on ${instrument}`, () => {
      for (const root of PITCH_CLASSES) {
        for (const [mode, offset] of MODES) {
          const destinationRoot = parentRoot(root, offset)
          for (const position of THREE_NPS_POSITIONS) {
            const source = getThreeNpsPattern(root, mode, instrument, position)
            assert.ok(source)
            const destination = mappedPattern(source, destinationRoot, 'major', instrument)

            assert.deepEqual(coordinates(destination.pattern), coordinates(source))
            assertCompleteAndBounded(source, instrument)
            assertCompleteAndBounded(destination.pattern, instrument)
          }
        }
      }
    })
  }

  it('uses whole-pattern octave placements at both fretboard boundaries', () => {
    for (const [root, mode, position, destinationRoot, expectedShift] of [
      ['C', 'dorian', 7, 'A#', 12],
      ['E', 'dorian', 1, 'D', -12],
    ] as const) {
      const source = getThreeNpsPattern(root, mode, 'guitar', position)
      assert.ok(source)
      const destination = mappedPattern(source, destinationRoot, 'major', 'guitar')
      assert.equal(destination.equivalent.fretShift, expectedShift)
      assert.deepEqual(coordinates(destination.pattern), coordinates(source))
      assertCompleteAndBounded(destination.pattern, 'guitar')
    }
  })

  it('selects the coordinate-equivalent destination position, not the same number', () => {
    const source = getThreeNpsPattern('D', 'dorian', 'guitar', 1)
    assert.ok(source)
    const destination = mappedPattern(source, 'C', 'major', 'guitar')

    assert.equal(source.position, 1)
    assert.equal(destination.equivalent.position, 2)
    assert.notEqual(destination.equivalent.position, source.position)
    assert.deepEqual(coordinates(destination.pattern), coordinates(source))
  })

  for (const [root, mode, parent, position] of [
    ['D', 'dorian', 'C', 1],
    ['G', 'mixolydian', 'C', 4],
    ['A', 'dorian', 'G', 5],
    ['C', 'dorian', 'A#', 7],
  ] as const satisfies readonly [PitchClass, ModeName, PitchClass, ThreeNpsPosition][]) {
    it(`round-trips ${root} ${mode} position ${position} through ${parent} Major`, () => {
      const source = getThreeNpsPattern(root, mode, 'guitar', position)
      assert.ok(source)
      const destination = mappedPattern(source, parent, 'major', 'guitar')
      const restored = mappedPattern(destination.pattern, root, mode, 'guitar')

      assert.deepEqual(coordinates(restored.pattern), coordinates(source))
      assert.equal(restored.equivalent.position, position)
      assert.ok(restored.pattern.notes.some(({ isRoot, note }) => isRoot && note === root))
      assert.ok(destination.pattern.notes.some(({ isRoot, note }) => isRoot && note === parent))
    })
  }

  it('changes note and interval metadata while keeping D Dorian coordinates fixed', () => {
    const source = getThreeNpsPattern('D', 'dorian', 'guitar', 2)
    assert.ok(source)
    const destination = mappedPattern(source, 'C', 'major', 'guitar').pattern
    assert.deepEqual(coordinates(destination), coordinates(source))

    const sourceIntervals = new Map(source.notes.map(({ note, interval }) => [note, interval]))
    const destinationIntervals = new Map(destination.notes.map(({ note, interval }) => [note, interval]))
    assert.deepEqual([sourceIntervals.get('D'), destinationIntervals.get('D')], ['1', '2'])
    assert.deepEqual([sourceIntervals.get('C'), destinationIntervals.get('C')], ['b7', '1'])
  })

  it('changes note and interval metadata while keeping G Mixolydian coordinates fixed', () => {
    const source = getThreeNpsPattern('G', 'mixolydian', 'bass', 4)
    assert.ok(source)
    const destination = mappedPattern(source, 'C', 'major', 'bass').pattern
    assert.deepEqual(coordinates(destination), coordinates(source))

    const sourceIntervals = new Map(source.notes.map(({ note, interval }) => [note, interval]))
    const destinationIntervals = new Map(destination.notes.map(({ note, interval }) => [note, interval]))
    assert.deepEqual([sourceIntervals.get('G'), destinationIntervals.get('G')], ['1', '5'])
    assert.deepEqual([sourceIntervals.get('C'), destinationIntervals.get('C')], ['4', '1'])
  })

  it('recalculates triad and seventh highlights inside the unchanged active 3NPS mask', () => {
    const source = getThreeNpsPattern('G', 'mixolydian', 'guitar', 3)
    assert.ok(source)
    const destination = mappedPattern(source, 'C', 'major', 'guitar').pattern
    const activeCoordinates = new Set(coordinates(destination))

    for (const [mode, expectedSource, expectedDestination] of [
      ['triad', ['G', 'B', 'D'], ['C', 'E', 'G']],
      ['seventh', ['G', 'B', 'D', 'F'], ['C', 'E', 'G', 'B']],
    ] as const) {
      const sourceChord = getChordTones(getScaleTones('G', 'mixolydian'), mode, 'mixolydian')
      const destinationChord = getChordTones(getScaleTones('C', 'major'), mode, 'major')
      assert.equal(sourceChord.supported, true)
      assert.equal(destinationChord.supported, true)

      const destinationIntervals = new Set(destinationChord.tones.map(({ interval }) => interval))
      const highlightedCoordinates = destination.notes
        .filter(({ interval }) => destinationIntervals.has(interval))
        .map(({ fret, stringIndex }) => `${stringIndex}:${fret}`)

      assert.deepEqual(sourceChord.tones.map(({ note }) => note), expectedSource)
      assert.deepEqual(destinationChord.tones.map(({ note }) => note), expectedDestination)
      assert.notDeepEqual(destinationChord.tones, sourceChord.tones)
      assert.ok(highlightedCoordinates.every((coordinate) => activeCoordinates.has(coordinate)))
    }
    assert.deepEqual(coordinates(destination), coordinates(source))
  })
})
