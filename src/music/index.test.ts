import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getNoteAtFret, getScale } from './index.ts'

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
