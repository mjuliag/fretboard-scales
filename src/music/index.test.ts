import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getNoteAtFret, getScale, getScaleTones } from './index.ts'

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
