import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getChordTones,
  getModeRelationship,
  getNoteAtFret,
  getScale,
  getScaleTones,
} from './index.ts'

function chordToneValues(
  root: Parameters<typeof getScaleTones>[0],
  scale: Parameters<typeof getScaleTones>[1],
  mode: 'triad' | 'seventh',
) {
  const result = getChordTones(getScaleTones(root, scale), mode, scale)
  assert.equal(result.supported, true)
  return result.tones.map(({ interval, note }) => [interval, note])
}

describe('getChordTones', () => {
  it('derives major triads and sevenths', () => {
    assert.deepEqual(chordToneValues('C', 'major', 'triad'), [
      ['1', 'C'], ['3', 'E'], ['5', 'G'],
    ])
    assert.deepEqual(chordToneValues('C', 'major', 'seventh'), [
      ['1', 'C'], ['3', 'E'], ['5', 'G'], ['7', 'B'],
    ])
  })

  it('preserves minor interval qualities', () => {
    assert.deepEqual(chordToneValues('A', 'naturalMinor', 'triad'), [
      ['1', 'A'], ['b3', 'C'], ['5', 'E'],
    ])
    assert.deepEqual(chordToneValues('A', 'naturalMinor', 'seventh'), [
      ['1', 'A'], ['b3', 'C'], ['5', 'E'], ['b7', 'G'],
    ])
  })

  it('derives modal chord tones from scale tones', () => {
    assert.deepEqual(chordToneValues('G', 'mixolydian', 'seventh'), [
      ['1', 'G'], ['3', 'B'], ['5', 'D'], ['b7', 'F'],
    ])
    assert.deepEqual(chordToneValues('B', 'locrian', 'triad'), [
      ['1', 'B'], ['b3', 'D'], ['b5', 'F'],
    ])
  })

  it('uses the perfect fifth as the structural tone for minor blues', () => {
    assert.deepEqual(chordToneValues('A', 'blues', 'triad'), [
      ['1', 'A'], ['b3', 'C'], ['5', 'E'],
    ])
    assert.deepEqual(chordToneValues('A', 'blues', 'seventh'), [
      ['1', 'A'], ['b3', 'C'], ['5', 'E'], ['b7', 'G'],
    ])
    assert.deepEqual(chordToneValues('C', 'blues', 'triad'), [
      ['1', 'C'], ['b3', 'D#'], ['5', 'G'],
    ])
  })

  it('derives the minor blues blue note from scale-tone data', () => {
    const scaleTones = getScaleTones('A', 'blues')
    const chordTones = getChordTones(scaleTones, 'seventh', 'blues')
    const blueNote = scaleTones.find(
      ({ interval }) => interval === 'b5',
    )

    assert.equal(chordTones.supported, true)
    assert.deepEqual(
      chordTones.tones.map(({ interval, note }) => [interval, note]),
      [['1', 'A'], ['b3', 'C'], ['5', 'E'], ['b7', 'G']],
    )
    assert.deepEqual(blueNote, { interval: 'b5', note: 'D#' })
    assert.equal(
      chordTones.tones.some(({ interval }) => interval === blueNote?.interval),
      false,
    )
  })

  it('reports missing and other ambiguous degrees instead of inventing tones', () => {
    assert.deepEqual(
      getChordTones(getScaleTones('C', 'majorPentatonic'), 'seventh'),
      {
        supported: false,
        tones: [],
        missingDegrees: [7],
        ambiguousDegrees: [],
      },
    )
    assert.deepEqual(
      getChordTones(getScaleTones('A', 'blues'), 'triad', 'major'),
      {
        supported: false,
        tones: [],
        missingDegrees: [],
        ambiguousDegrees: [5],
      },
    )
  })
})

describe('getNoteAtFret', () => {
  it('returns the open-string note at fret 0', () => {
    assert.equal(getNoteAtFret('E', 0), 'E')
  })

  it('moves chromatically up the fretboard', () => {
    assert.equal(getNoteAtFret('E', 3), 'G')
    assert.equal(getNoteAtFret('A', 3), 'C')
  })

  it('wraps at the octave', () => {
    assert.equal(getNoteAtFret('E', 12), 'E')
  })
})

describe('getScale', () => {
  it('generates A minor pentatonic', () => {
    assert.deepEqual(getScale('A', 'minorPentatonic'), [
      'A',
      'C',
      'D',
      'E',
      'G',
    ])
  })

  it('generates C major', () => {
    assert.deepEqual(getScale('C', 'major'), [
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ])
  })
})

describe('getScaleTones', () => {
  it('maps A minor pentatonic notes to intervals', () => {
    assert.deepEqual(getScaleTones('A', 'minorPentatonic'), [
      { note: 'A', interval: '1' },
      { note: 'C', interval: 'b3' },
      { note: 'D', interval: '4' },
      { note: 'E', interval: '5' },
      { note: 'G', interval: 'b7' },
    ])
  })

  it('maps C major notes to intervals', () => {
    assert.deepEqual(getScaleTones('C', 'major'), [
      { note: 'C', interval: '1' },
      { note: 'D', interval: '2' },
      { note: 'E', interval: '3' },
      { note: 'F', interval: '4' },
      { note: 'G', interval: '5' },
      { note: 'A', interval: '6' },
      { note: 'B', interval: '7' },
    ])
  })

  it('maps A Dorian notes to intervals', () => {
    assert.deepEqual(getScaleTones('A', 'dorian'), [
      { note: 'A', interval: '1' },
      { note: 'B', interval: '2' },
      { note: 'C', interval: 'b3' },
      { note: 'D', interval: '4' },
      { note: 'E', interval: '5' },
      { note: 'F#', interval: '6' },
      { note: 'G', interval: 'b7' },
    ])
  })

  it('maps E Phrygian notes to intervals', () => {
    assert.deepEqual(getScaleTones('E', 'phrygian'), [
      { note: 'E', interval: '1' },
      { note: 'F', interval: 'b2' },
      { note: 'G', interval: 'b3' },
      { note: 'A', interval: '4' },
      { note: 'B', interval: '5' },
      { note: 'C', interval: 'b6' },
      { note: 'D', interval: 'b7' },
    ])
  })

  it('maps G Mixolydian notes to intervals', () => {
    assert.deepEqual(getScaleTones('G', 'mixolydian'), [
      { note: 'G', interval: '1' },
      { note: 'A', interval: '2' },
      { note: 'B', interval: '3' },
      { note: 'C', interval: '4' },
      { note: 'D', interval: '5' },
      { note: 'E', interval: '6' },
      { note: 'F', interval: 'b7' },
    ])
  })

  it('maps B Locrian notes to intervals', () => {
    assert.deepEqual(getScaleTones('B', 'locrian'), [
      { note: 'B', interval: '1' },
      { note: 'C', interval: 'b2' },
      { note: 'D', interval: 'b3' },
      { note: 'E', interval: '4' },
      { note: 'F', interval: 'b5' },
      { note: 'G', interval: 'b6' },
      { note: 'A', interval: 'b7' },
    ])
  })
})

describe('getModeRelationship', () => {
  it('finds each mode degree and parent major scale', () => {
    assert.deepEqual(getModeRelationship('G', 'mixolydian'), {
      parentRoot: 'C',
      degree: 5,
    })
    assert.deepEqual(getModeRelationship('A', 'dorian'), {
      parentRoot: 'G',
      degree: 2,
    })
    assert.deepEqual(getModeRelationship('E', 'phrygian'), {
      parentRoot: 'C',
      degree: 3,
    })
    assert.deepEqual(getModeRelationship('F', 'lydian'), {
      parentRoot: 'C',
      degree: 4,
    })
    assert.deepEqual(getModeRelationship('A', 'aeolian'), {
      parentRoot: 'C',
      degree: 6,
    })
    assert.deepEqual(getModeRelationship('B', 'locrian'), {
      parentRoot: 'C',
      degree: 7,
    })
    assert.deepEqual(getModeRelationship('C', 'ionian'), {
      parentRoot: 'C',
      degree: 1,
    })
  })

  it('uses sharp pitch-class names for enharmonic parent roots', () => {
    assert.deepEqual(getModeRelationship('G#', 'mixolydian'), {
      parentRoot: 'C#',
      degree: 5,
    })
  })

  it('does not describe non-modal scales as modes', () => {
    assert.equal(getModeRelationship('C', 'major'), null)
    assert.equal(getModeRelationship('A', 'naturalMinor'), null)
    assert.equal(getModeRelationship('A', 'minorPentatonic'), null)
  })
})
