import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getChordTones,
  getModeRelationship,
  getParentMajorScale,
  getScale,
  getScaleNavigationRelationship,
  getScaleTones,
  PITCH_CLASSES,
  type ModeName,
} from './index.ts'

const MODE_FIXTURES = [
  ['ionian', 1, 0],
  ['dorian', 2, 2],
  ['phrygian', 3, 4],
  ['lydian', 4, 5],
  ['mixolydian', 5, 7],
  ['aeolian', 6, 9],
  ['locrian', 7, 11],
] as const satisfies readonly [ModeName, number, number][]

function independentlyTransposeBack(root: typeof PITCH_CLASSES[number], semitones: number) {
  const rootIndex = PITCH_CLASSES.indexOf(root)
  return PITCH_CLASSES[(rootIndex - semitones + PITCH_CLASSES.length) % PITCH_CLASSES.length]
}

describe('exhaustive modal parent-major theory QA', () => {
  it('derives every root and mode from its independent modal-degree offset', () => {
    for (const root of PITCH_CLASSES) {
      for (const [mode, degree, parentOffset] of MODE_FIXTURES) {
        const expectedParent = independentlyTransposeBack(root, parentOffset)

        assert.deepEqual(getModeRelationship(root, mode), {
          degree,
          parentRoot: expectedParent,
        })
        assert.deepEqual(getParentMajorScale(root, mode), {
          parentRoot: expectedParent,
          parentScale: 'major',
        })
        assert.deepEqual(
          new Set(getScale(root, mode)),
          new Set(getScale(expectedParent, 'major')),
        )
      }
    }
  })

  it('keeps Ionian and Aeolian theory independent from relative navigation', () => {
    for (const root of PITCH_CLASSES) {
      const ionianParent = getParentMajorScale(root, 'ionian')
      const ionianNavigation = getScaleNavigationRelationship(root, 'ionian')
      assert.equal(ionianParent?.parentRoot, root)
      assert.equal(ionianNavigation?.label, 'Relative minor')
      assert.notEqual(ionianNavigation?.destinationScale, 'major')

      const aeolianParent = getParentMajorScale(root, 'aeolian')
      const aeolianNavigation = getScaleNavigationRelationship(root, 'aeolian')
      assert.equal(aeolianNavigation?.label, 'Relative major')
      assert.equal(aeolianNavigation?.destinationRoot, aeolianParent?.parentRoot)
      assert.equal(aeolianNavigation?.destinationScale, 'ionian')
    }
  })

  it('reinterprets representative roots and intervals without stale metadata', () => {
    const dorian = new Map(getScaleTones('D', 'dorian').map((tone) => [tone.note, tone.interval]))
    const mixolydian = new Map(getScaleTones('G', 'mixolydian').map((tone) => [tone.note, tone.interval]))
    const major = new Map(getScaleTones('C', 'major').map((tone) => [tone.note, tone.interval]))

    assert.deepEqual([dorian.get('D'), major.get('D')], ['1', '2'])
    assert.deepEqual([dorian.get('C'), major.get('C')], ['b7', '1'])
    assert.deepEqual([mixolydian.get('G'), major.get('G')], ['1', '5'])
    assert.deepEqual([mixolydian.get('C'), major.get('C')], ['4', '1'])
  })

  it('recalculates triads and sevenths at the destination tonal center', () => {
    const sourceSeventh = getChordTones(
      getScaleTones('G', 'mixolydian'),
      'seventh',
      'mixolydian',
    )
    const destinationTriad = getChordTones(getScaleTones('C', 'major'), 'triad', 'major')
    const destinationSeventh = getChordTones(getScaleTones('C', 'major'), 'seventh', 'major')
    assert.equal(sourceSeventh.supported, true)
    assert.equal(destinationTriad.supported, true)
    assert.equal(destinationSeventh.supported, true)
    assert.deepEqual(sourceSeventh.tones.map(({ note }) => note), ['G', 'B', 'D', 'F'])
    assert.deepEqual(destinationTriad.tones.map(({ note }) => note), ['C', 'E', 'G'])
    assert.deepEqual(destinationSeventh.tones.map(({ note }) => note), ['C', 'E', 'G', 'B'])
    assert.notDeepEqual(destinationSeventh.tones, sourceSeventh.tones)
  })

  it('preserves a focus value while reevaluating destination membership', () => {
    const sourceIntervals = new Set(getScaleTones('D', 'dorian').map(({ interval }) => interval))
    const destinationIntervals = new Set(getScaleTones('C', 'major').map(({ interval }) => interval))

    for (const [selectedInterval, expectedAtDestination] of [
      ['2', true],
      ['b7', false],
    ] as const) {
      assert.equal(sourceIntervals.has(selectedInterval), true)
      assert.equal(destinationIntervals.has(selectedInterval), expectedAtDestination)
      assert.equal(selectedInterval, selectedInterval)
    }
  })
})
