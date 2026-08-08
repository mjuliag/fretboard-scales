import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getChordTones,
  getModeRelationship,
  getNoteAtFret,
  getParentMajorScale,
  getRelativeScale,
  getScaleNavigationRelationship,
  getScale,
  getScaleTones,
} from './index.ts'

describe('getRelativeScale', () => {
  it('derives relative natural minor roots from major scale degree 6', () => {
    assert.deepEqual(getRelativeScale('C', 'major'), {
      relativeRoot: 'A',
      relativeScale: 'naturalMinor',
      relationship: 'relativeMinor',
    })
    assert.deepEqual(getRelativeScale('G', 'major'), {
      relativeRoot: 'E',
      relativeScale: 'naturalMinor',
      relationship: 'relativeMinor',
    })
  })

  it('derives relative major roots from natural minor scale degree 3', () => {
    assert.deepEqual(getRelativeScale('A', 'naturalMinor'), {
      relativeRoot: 'C',
      relativeScale: 'major',
      relationship: 'relativeMajor',
    })
    assert.deepEqual(getRelativeScale('E', 'naturalMinor'), {
      relativeRoot: 'G',
      relativeScale: 'major',
      relationship: 'relativeMajor',
    })
  })

  it('preserves Ionian and Aeolian naming semantics', () => {
    assert.deepEqual(getRelativeScale('C', 'ionian'), {
      relativeRoot: 'A',
      relativeScale: 'aeolian',
      relationship: 'relativeMinor',
    })
    assert.deepEqual(getRelativeScale('A', 'aeolian'), {
      relativeRoot: 'C',
      relativeScale: 'ionian',
      relationship: 'relativeMajor',
    })
  })

  it('shares pitch classes while recalculating harmony from the new root', () => {
    const relative = getRelativeScale('C', 'major')
    assert.ok(relative)
    assert.deepEqual(
      new Set(getScale('C', 'major')),
      new Set(getScale(relative.relativeRoot, relative.relativeScale)),
    )

    const destinationChord = getChordTones(
      getScaleTones(relative.relativeRoot, relative.relativeScale),
      'triad',
      relative.relativeScale,
    )
    assert.equal(destinationChord.supported, true)
    assert.deepEqual(
      destinationChord.tones.map(({ note }) => note),
      ['A', 'C', 'E'],
    )
  })

  it('returns null for unsupported scales and modes', () => {
    for (const scale of [
      'majorPentatonic',
      'minorPentatonic',
      'blues',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'locrian',
    ] as const) {
      assert.equal(getRelativeScale('C', scale), null)
    }
  })
})

describe('getScaleNavigationRelationship', () => {
  it('derives every C-major mode parent without root mappings', () => {
    for (const [root, scale] of [
      ['C', 'ionian'],
      ['D', 'dorian'],
      ['E', 'phrygian'],
      ['F', 'lydian'],
      ['G', 'mixolydian'],
      ['A', 'aeolian'],
      ['B', 'locrian'],
    ] as const) {
      assert.deepEqual(getParentMajorScale(root, scale), {
        parentRoot: 'C',
        parentScale: 'major',
      })
      assert.deepEqual(
        new Set(getScale(root, scale)),
        new Set(getScale('C', 'major')),
      )
    }
  })

  it('derives a parent major outside C', () => {
    assert.deepEqual(getParentMajorScale('A', 'dorian'), {
      parentRoot: 'G',
      parentScale: 'major',
    })
    assert.deepEqual(getScaleNavigationRelationship('A', 'dorian'), {
      destinationRoot: 'G',
      destinationScale: 'major',
      label: 'Parent major',
    })
    assert.deepEqual(
      new Set(getScale('A', 'dorian')),
      new Set(getScale('G', 'major')),
    )
  })

  it('uses the existing relative action for Aeolian and avoids Ionian self-links', () => {
    assert.deepEqual(getScaleNavigationRelationship('A', 'aeolian'), {
      destinationRoot: 'C',
      destinationScale: 'ionian',
      label: 'Relative major',
    })
    assert.equal(getScaleNavigationRelationship('C', 'ionian')?.label, 'Relative minor')
    assert.equal(getScaleNavigationRelationship('C', 'major')?.label, 'Relative minor')
  })

  it('exposes parent navigation for the other modal tonal centers', () => {
    for (const [root, scale] of [
      ['D', 'dorian'],
      ['E', 'phrygian'],
      ['F', 'lydian'],
      ['G', 'mixolydian'],
      ['B', 'locrian'],
    ] as const) {
      assert.deepEqual(getScaleNavigationRelationship(root, scale), {
        destinationRoot: 'C',
        destinationScale: 'major',
        label: 'Parent major',
      })
    }
  })

  it('exposes the educational degree and parent for representative modes', () => {
    assert.deepEqual(getModeRelationship('D', 'dorian'), {
      degree: 2,
      parentRoot: 'C',
    })
    assert.deepEqual(getModeRelationship('G', 'mixolydian'), {
      degree: 5,
      parentRoot: 'C',
    })
    assert.deepEqual(getModeRelationship('B', 'locrian'), {
      degree: 7,
      parentRoot: 'C',
    })
  })

  it('keeps Aeolian theory separate from its single relative navigation', () => {
    assert.deepEqual(getModeRelationship('A', 'aeolian'), {
      degree: 6,
      parentRoot: 'C',
    })
    assert.deepEqual(getParentMajorScale('A', 'aeolian'), {
      parentRoot: 'C',
      parentScale: 'major',
    })
    assert.deepEqual(getScaleNavigationRelationship('A', 'aeolian'), {
      destinationRoot: 'C',
      destinationScale: 'ionian',
      label: 'Relative major',
    })
  })

  it('recomputes chord tones and degree interpretation at the parent root', () => {
    const destinationTones = getScaleTones('C', 'major')
    const destinationChord = getChordTones(destinationTones, 'seventh', 'major')
    assert.equal(destinationChord.supported, true)
    assert.deepEqual(
      destinationChord.tones.map(({ interval, note }) => [interval, note]),
      [['1', 'C'], ['3', 'E'], ['5', 'G'], ['7', 'B']],
    )
    assert.deepEqual(destinationTones.find(({ interval }) => interval === '4'), {
      interval: '4',
      note: 'F',
    })
  })
})

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
