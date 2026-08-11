import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getNoteAtFret, getScale, STANDARD_TUNINGS } from './index.ts'
import {
  getPentatonicFretRange,
  getPentatonicPattern,
  PENTATONIC_POSITIONS,
} from './pentatonicPatterns.ts'

function coordinates(root: Parameters<typeof getPentatonicPattern>[0], position: 1 | 2 | 3 | 4 | 5) {
  return getPentatonicPattern(root, 'minorPentatonic', 'guitar', position)
    .notes.map(({ stringIndex, fret }) => `${stringIndex}:${fret}`)
}

describe('canonical pentatonic patterns', () => {
  it('resolves A Minor Pentatonic Pattern 1 as the conventional fret-5 box', () => {
    const pattern = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 1)

    assert.deepEqual(coordinates('A', 1), [
      '0:5', '0:8',
      '1:5', '1:7',
      '2:5', '2:7',
      '3:5', '3:7',
      '4:5', '4:8',
      '5:5', '5:8',
    ])
    assert.deepEqual(
      pattern.notes.filter(({ isRoot }) => isRoot)
        .map(({ stringIndex, fret }) => `${stringIndex}:${fret}`),
      ['0:5', '2:7', '5:5'],
    )
    const scale = new Set(getScale('A', 'minorPentatonic'))
    assert.ok(pattern.notes.every(({ note }) => scale.has(note)))
    assert.equal(new Set(coordinates('A', 1)).size, 12)
  })

  it('transposes Pattern 1 without changing its geometry', () => {
    const aPattern = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 1)
    const cPattern = getPentatonicPattern('C', 'minorPentatonic', 'guitar', 1)

    assert.deepEqual(
      cPattern.notes.map(({ stringIndex, fret }, index) => ({
        fretDifference: fret - aPattern.notes[index].fret,
        stringIndex,
      })),
      aPattern.notes.map(({ stringIndex }) => ({
        fretDifference: 3,
        stringIndex,
      })),
    )
  })

  it('provides five deterministic connected patterns in conventional order', () => {
    const patterns = PENTATONIC_POSITIONS.map((position) => (
      getPentatonicPattern('A', 'minorPentatonic', 'guitar', position)
    ))
    const scale = new Set(getScale('A', 'minorPentatonic'))

    assert.equal(patterns.length, 5)
    assert.deepEqual(patterns.map(getPentatonicFretRange), [
      { start: 5, end: 8 },
      { start: 7, end: 10 },
      { start: 9, end: 13 },
      { start: 12, end: 15 },
      { start: 14, end: 17 },
    ])
    for (const pattern of patterns) {
      assert.ok(pattern.notes.every(({ note }) => scale.has(note)))
      for (const note of pattern.notes) {
        assert.equal(
          getNoteAtFret(STANDARD_TUNINGS.guitar[note.stringIndex], note.fret),
          note.note,
        )
      }
    }
    for (let index = 1; index < patterns.length; index += 1) {
      const previous = new Set(patterns[index - 1].notes.map(
        ({ stringIndex, fret }) => `${stringIndex}:${fret}`,
      ))
      const overlap = patterns[index].notes.filter(
        ({ stringIndex, fret }) => previous.has(`${stringIndex}:${fret}`),
      )
      assert.ok(overlap.length >= 3)
    }
  })

  it('shares relative-minor shapes for Major Pentatonic', () => {
    for (const position of [1, 2, 3, 4] as const) {
      const major = getPentatonicPattern('C', 'majorPentatonic', 'guitar', position)
      const relativeMinor = getPentatonicPattern(
        'A',
        'minorPentatonic',
        'guitar',
        (position + 1) as 2 | 3 | 4 | 5,
      )
      assert.deepEqual(
        major.notes.map(({ stringIndex, fret }) => `${stringIndex}:${fret}`),
        relativeMinor.notes.map(({ stringIndex, fret }) => `${stringIndex}:${fret}`),
      )
      const majorScale = new Set(getScale('C', 'majorPentatonic'))
      assert.ok(major.notes.every(({ note }) => majorScale.has(note)))
    }
  })

  it('reinterprets A Major Pattern 1 as the exact F# Minor Pattern 2 shape', () => {
    const major = getPentatonicPattern('A', 'majorPentatonic', 'guitar', 1)
    const relativeMinor = getPentatonicPattern(
      'F#',
      'minorPentatonic',
      'guitar',
      2,
    )
    const coordinateSet = (pattern: typeof major) => pattern.notes.map(
      ({ stringIndex, fret }) => ({ stringIndex, fret }),
    )

    assert.deepEqual(coordinateSet(major), coordinateSet(relativeMinor))
    assert.deepEqual(
      new Set(major.notes.map(({ note }) => note)),
      new Set(relativeMinor.notes.map(({ note }) => note)),
    )
    assert.notDeepEqual(
      major.notes.filter(({ isRoot }) => isRoot)
        .map(({ stringIndex, fret }) => ({ stringIndex, fret })),
      relativeMinor.notes.filter(({ isRoot }) => isRoot)
        .map(({ stringIndex, fret }) => ({ stringIndex, fret })),
    )
    assert.notDeepEqual(
      major.notes.map(({ interval }) => interval),
      relativeMinor.notes.map(({ interval }) => interval),
    )
  })

  it('maps Major Pattern 5 to relative-Minor Pattern 1 one octave higher', () => {
    const major = getPentatonicPattern('C', 'majorPentatonic', 'guitar', 5)
    const relativeMinor = getPentatonicPattern(
      'A',
      'minorPentatonic',
      'guitar',
      1,
    )
    const majorScale = new Set(getScale('C', 'majorPentatonic'))

    assert.deepEqual(
      major.notes.map(({ stringIndex, fret }, index) => ({
        fretDifference: fret - relativeMinor.notes[index].fret,
        stringIndex,
      })),
      relativeMinor.notes.map(({ stringIndex }) => ({
        fretDifference: 12,
        stringIndex,
      })),
    )
    assert.deepEqual(
      major.notes.map(({ stringIndex, fret }, index) => ({
        fretOffset: fret - major.notes[index - index % 2].fret,
        stringIndex,
      })),
      relativeMinor.notes.map(({ stringIndex, fret }, index) => ({
        fretOffset: fret - relativeMinor.notes[index - index % 2].fret,
        stringIndex,
      })),
    )
    assert.ok(major.notes.every(({ fret }) => fret >= 0 && fret <= 24))
    assert.ok(major.notes.every(({ note }) => majorScale.has(note)))
    for (const note of major.notes) {
      assert.equal(
        getNoteAtFret(STANDARD_TUNINGS.guitar[note.stringIndex], note.fret),
        note.note,
      )
    }
  })

  it('projects the canonical lower four strings onto Bass', () => {
    const guitar = getPentatonicPattern('A', 'minorPentatonic', 'guitar', 1)
    const bass = getPentatonicPattern('A', 'minorPentatonic', 'bass', 1)

    assert.deepEqual(bass.notes, guitar.notes.filter(({ stringIndex }) => stringIndex < 4))
  })
})
