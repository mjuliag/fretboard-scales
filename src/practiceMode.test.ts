import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getScaleTones } from './music/index.ts'
import { getPentatonicPattern } from './music/pentatonicPatterns.ts'
import { getThreeNpsPattern, shiftThreeNpsPattern } from './music/threeNps.ts'
import {
  adaptPatternPracticePositions,
  choosePracticeTarget,
  enumerateAllNotesPracticePositions,
  evaluatePracticeAnswer,
  formatIntervalLabel,
  getCorrectPracticeCoordinates,
  getPracticeTargetCandidates,
} from './practiceMode.ts'

describe('Practice positions', () => {
  it('enumerates only visible Guitar scale positions in a committed range', () => {
    const positions = enumerateAllNotesPracticePositions(
      'guitar',
      { start: 5, end: 9 },
      getScaleTones('C', 'major'),
    )

    assert.ok(positions.length > 0)
    assert.ok(positions.every(({ coordinate }) => (
      coordinate.stringIndex >= 0
        && coordinate.stringIndex < 6
        && coordinate.fret >= 5
        && coordinate.fret <= 9
    )))
    assert.ok(positions.every(({ note }) => (
      ['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(note)
    )))
    assert.equal(positions.some(({ coordinate }) => (
      coordinate.stringIndex === 0 && coordinate.fret === 6
    )), false, 'A# is not in C Major')
  })

  it('uses all four Bass strings and exact custom-range boundaries', () => {
    const positions = enumerateAllNotesPracticePositions(
      'bass',
      { start: 0, end: 0 },
      getScaleTones('C', 'major'),
    )

    assert.deepEqual(
      positions.map(({ coordinate, note }) => [coordinate.stringIndex, coordinate.fret, note]),
      [[0, 0, 'E'], [1, 0, 'A'], [2, 0, 'D'], [3, 0, 'G']],
    )
  })

  it('adapts exactly the selected Pentatonic shape coordinates', () => {
    const pattern = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 1)
    const positions = adaptPatternPracticePositions(pattern.notes)

    assert.deepEqual(
      positions.map(({ coordinate }) => coordinate),
      pattern.notes.map(({ fret, stringIndex }) => ({ fret, stringIndex })),
    )
    assert.equal(evaluatePracticeAnswer(
      positions,
      { type: 'note', value: 'A' },
      { stringIndex: 0, fret: 17 },
    ), false, 'matching pitch outside Shape 1 is not eligible')
  })

  it('adapts the exact shifted 3NPS placement', () => {
    const base = getThreeNpsPattern('E', 'major', 'bass', 1)
    assert.ok(base)
    const shifted = shiftThreeNpsPattern(base, 12)
    assert.ok(shifted)

    const positions = adaptPatternPracticePositions(shifted.notes)
    assert.deepEqual(
      positions.map(({ coordinate }) => coordinate),
      shifted.notes.map(({ fret, stringIndex }) => ({ fret, stringIndex })),
    )
  })
})

describe('Practice targets and answers', () => {
  const scaleTones = getScaleTones('C', 'major')
  const positions = enumerateAllNotesPracticePositions(
    'bass',
    { start: 0, end: 1 },
    scaleTones,
  )

  it('returns unique targets in stable scale order and only when physically present', () => {
    assert.deepEqual(
      getPracticeTargetCandidates(positions, scaleTones, 'note'),
      [
        { type: 'note', value: 'D' },
        { type: 'note', value: 'E' },
        { type: 'note', value: 'F' },
        { type: 'note', value: 'G' },
        { type: 'note', value: 'A' },
      ],
    )
    assert.deepEqual(
      getPracticeTargetCandidates(positions, scaleTones, 'degree'),
      [
        { type: 'degree', value: '2' },
        { type: 'degree', value: '3' },
        { type: 'degree', value: '4' },
        { type: 'degree', value: '5' },
        { type: 'degree', value: '6' },
      ],
    )
  })

  it('uses deterministic randomness and avoids immediate repetition', () => {
    const candidates = getPracticeTargetCandidates(positions, scaleTones, 'note')

    assert.deepEqual(choosePracticeTarget(candidates, null, () => 0), candidates[0])
    assert.deepEqual(
      choosePracticeTarget(candidates, candidates[0], () => 0),
      candidates[1],
    )
    assert.deepEqual(
      choosePracticeTarget([candidates[0]], candidates[0], () => 0.9),
      candidates[0],
    )
  })

  it('accepts every matching visible coordinate and rejects other coordinates', () => {
    const widePositions = enumerateAllNotesPracticePositions(
      'guitar',
      { start: 0, end: 24 },
      scaleTones,
    )
    const target = { type: 'note', value: 'C' } as const
    const correct = getCorrectPracticeCoordinates(widePositions, target)

    assert.ok(correct.length > 1)
    assert.ok(correct.every((coordinate) => (
      evaluatePracticeAnswer(widePositions, target, coordinate)
    )))
    assert.equal(evaluatePracticeAnswer(
      widePositions,
      target,
      widePositions.find(({ note }) => note !== 'C')!.coordinate,
    ), false)
  })

  it('formats accidentals only for presentation', () => {
    assert.equal(formatIntervalLabel('b3'), '♭3')
    assert.equal(formatIntervalLabel('#4'), '♯4')
    assert.equal(formatIntervalLabel('5'), '5')
  })
})
