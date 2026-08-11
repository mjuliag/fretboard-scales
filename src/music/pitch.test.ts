import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getFretboardPitch,
  pitchToFrequency,
} from './pitch.ts'

function assertFrequency(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) < 0.01,
    `Expected ${actual} Hz to be within 0.01 Hz of ${expected} Hz`,
  )
}

describe('physical fretboard pitch', () => {
  it('resolves standard guitar open strings with their octaves', () => {
    const lowE = getFretboardPitch('guitar', 0, 0)
    const highE = getFretboardPitch('guitar', 5, 0)

    assert.deepEqual(lowE, { pitchClass: 'E', octave: 2 })
    assert.deepEqual(highE, { pitchClass: 'E', octave: 4 })
    assertFrequency(pitchToFrequency(lowE), 82.41)
    assertFrequency(pitchToFrequency(highE), 329.63)
  })

  it('raises guitar low E by one octave at fret 12', () => {
    const open = getFretboardPitch('guitar', 0, 0)
    const octave = getFretboardPitch('guitar', 0, 12)

    assert.deepEqual(octave, { pitchClass: 'E', octave: 3 })
    assertFrequency(pitchToFrequency(octave), 164.81)
    assert.ok(Math.abs(pitchToFrequency(octave) / pitchToFrequency(open) - 2) < 1e-12)
  })

  it('resolves standard bass E1 and A1 open strings', () => {
    const lowE = getFretboardPitch('bass', 0, 0)
    const aString = getFretboardPitch('bass', 1, 0)

    assert.deepEqual(lowE, { pitchClass: 'E', octave: 1 })
    assert.deepEqual(aString, { pitchClass: 'A', octave: 1 })
    assertFrequency(pitchToFrequency(lowE), 41.2)
    assert.equal(pitchToFrequency(aString), 55)
  })

  it('gives the same pitch class different frequencies in different octaves', () => {
    const e2 = getFretboardPitch('guitar', 0, 0)
    const e4 = getFretboardPitch('guitar', 5, 0)

    assert.equal(e2.pitchClass, e4.pitchClass)
    assert.notEqual(e2.octave, e4.octave)
    assert.notEqual(pitchToFrequency(e2), pitchToFrequency(e4))
  })

  it('resolves pitch class and octave across a string and fret coordinate', () => {
    assert.deepEqual(getFretboardPitch('guitar', 1, 3), {
      pitchClass: 'C',
      octave: 3,
    })
    assert.deepEqual(getFretboardPitch('bass', 3, 14), {
      pitchClass: 'A',
      octave: 3,
    })
  })
})
