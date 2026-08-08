import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getNoteAtFret,
  getScale,
  PITCH_CLASSES,
  STANDARD_TUNINGS,
} from './index.ts'
import {
  findEquivalentThreeNpsPosition,
  getThreeNpsPattern,
  shiftThreeNpsPattern,
  supportsThreeNps,
  THREE_NPS_POSITIONS,
  type ThreeNpsNote,
  type ThreeNpsPattern,
} from './threeNps.ts'

function fretsByString(pattern: ThreeNpsPattern): number[][] {
  return STANDARD_TUNINGS.guitar.map((_, stringIndex) => (
    pattern.notes
      .filter((note) => note.stringIndex === stringIndex)
      .map(({ fret }) => fret)
  ))
}

function coordinates(pattern: ThreeNpsPattern): string[] {
  return pattern.notes
    .map(({ fret, stringIndex }) => `${stringIndex}:${fret}`)
    .sort()
}

function mapRelativePattern(
  sourcePattern: ThreeNpsPattern,
  destinationRoot: Parameters<typeof findEquivalentThreeNpsPosition>[1],
  destinationScale: Parameters<typeof findEquivalentThreeNpsPosition>[2],
  instrument: Parameters<typeof findEquivalentThreeNpsPosition>[3],
): ThreeNpsPattern {
  const equivalent = findEquivalentThreeNpsPosition(
    sourcePattern,
    destinationRoot,
    destinationScale,
    instrument,
  )
  assert.ok(equivalent)

  const generated = getThreeNpsPattern(
    destinationRoot,
    destinationScale,
    instrument,
    equivalent.position,
  )
  assert.ok(generated)

  const shifted = shiftThreeNpsPattern(generated, equivalent.fretShift)
  assert.ok(shifted)
  return shifted
}

describe('classic 3NPS guitar patterns', () => {
  for (const instrument of ['guitar', 'bass'] as const) {
    it(`preserves every modal parent-major shape and fret bound on ${instrument}`, () => {
      for (const [root, scale, parentRoot] of [
        ['D', 'dorian', 'C'],
        ['E', 'phrygian', 'C'],
        ['F', 'lydian', 'C'],
        ['G', 'mixolydian', 'C'],
        ['A', 'aeolian', 'C'],
        ['B', 'locrian', 'C'],
        ['A', 'dorian', 'G'],
      ] as const) {
        for (const position of THREE_NPS_POSITIONS) {
          const modalPattern = getThreeNpsPattern(root, scale, instrument, position)
          assert.ok(modalPattern)
          const parentPattern = mapRelativePattern(
            modalPattern,
            parentRoot,
            'major',
            instrument,
          )
          assert.deepEqual(coordinates(parentPattern), coordinates(modalPattern))
          assert.ok(parentPattern.notes.every(({ fret }) => fret >= 0 && fret <= 24))
        }
      }
    })
  }

  it('matches canonical C Major Position 1 coordinates', () => {
    const pattern = getThreeNpsPattern('C', 'major', 'guitar', 1)

    assert.ok(pattern)
    assert.deepEqual(fretsByString(pattern), [
      [8, 10, 12],
      [8, 10, 12],
      [9, 10, 12],
      [9, 10, 12],
      [10, 12, 13],
      [10, 12, 13],
    ])
  })

  it('matches canonical non-adjacent C Major Position 5 coordinates', () => {
    const pattern = getThreeNpsPattern('C', 'major', 'guitar', 5)

    assert.ok(pattern)
    assert.deepEqual(fretsByString(pattern), [
      [15, 17, 19],
      [15, 17, 19],
      [15, 17, 19],
      [16, 17, 19],
      [17, 18, 20],
      [17, 19, 20],
    ])
  })

  it('moves D Major Position 7 down one octave as a complete shape', () => {
    const pattern = getThreeNpsPattern('D', 'major', 'guitar', 7)

    assert.ok(pattern)
    assert.deepEqual(fretsByString(pattern), [
      [9, 10, 12],
      [9, 10, 12],
      [9, 11, 12],
      [9, 11, 12],
      [10, 12, 14],
      [10, 12, 14],
    ])
  })

  it('maps G Major Position 4 to the same physical E Natural Minor shape', () => {
    const majorPattern = getThreeNpsPattern('G', 'major', 'guitar', 4)
    assert.ok(majorPattern)

    const equivalent = findEquivalentThreeNpsPosition(
      majorPattern,
      'E',
      'naturalMinor',
      'guitar',
    )
    assert.deepEqual(equivalent, { fretShift: 0, position: 6 })

    const minorPattern = mapRelativePattern(
      majorPattern,
      'E',
      'naturalMinor',
      'guitar',
    )
    assert.deepEqual(coordinates(minorPattern), coordinates(majorPattern))
    assert.ok(majorPattern.notes.some(
      ({ isRoot, note }) => isRoot && note === 'G',
    ))
    assert.ok(minorPattern.notes.some(
      ({ isRoot, note }) => isRoot && note === 'E',
    ))
    assert.deepEqual(
      new Set(minorPattern.notes.map(({ note }) => note)),
      new Set(['G', 'A', 'B', 'C', 'D', 'E', 'F#']),
    )

    const roundTrip = findEquivalentThreeNpsPosition(
      minorPattern,
      'G',
      'major',
      'guitar',
    )
    assert.deepEqual(roundTrip, { fretShift: 0, position: 4 })
  })

  for (const instrument of ['guitar', 'bass'] as const) {
    for (const [majorRoot, minorRoot] of [
      ['C', 'A'],
      ['G', 'E'],
    ] as const) {
      it(`maps every ${majorRoot} Major shape to ${minorRoot} Natural Minor and back on ${instrument}`, () => {
        const stringCount = STANDARD_TUNINGS[instrument].length

        for (const position of THREE_NPS_POSITIONS) {
          const majorPattern = getThreeNpsPattern(
            majorRoot,
            'major',
            instrument,
            position,
          )
          assert.ok(majorPattern)

          const minorPattern = mapRelativePattern(
            majorPattern,
            minorRoot,
            'naturalMinor',
            instrument,
          )
          assert.deepEqual(coordinates(minorPattern), coordinates(majorPattern))
          assert.ok(minorPattern.notes.every(
            ({ fret }) => fret >= 0 && fret <= 24,
          ))

          for (let stringIndex = 0; stringIndex < stringCount; stringIndex += 1) {
            assert.equal(minorPattern.notes.filter(
              (note) => note.stringIndex === stringIndex,
            ).length, 3)
          }

          const majorRoundTrip = mapRelativePattern(
            minorPattern,
            majorRoot,
            'major',
            instrument,
          )
          assert.equal(majorRoundTrip.position, position)
          assert.deepEqual(
            coordinates(majorRoundTrip),
            coordinates(majorPattern),
          )
        }
      })
    }
  }

  it('maps Ionian and Aeolian shapes by physical coordinates', () => {
    for (const position of THREE_NPS_POSITIONS) {
      const ionianPattern = getThreeNpsPattern(
        'C',
        'ionian',
        'guitar',
        position,
      )
      assert.ok(ionianPattern)

      const aeolianPattern = mapRelativePattern(
        ionianPattern,
        'A',
        'aeolian',
        'guitar',
      )
      assert.deepEqual(coordinates(aeolianPattern), coordinates(ionianPattern))

      const roundTrip = mapRelativePattern(
        aeolianPattern,
        'C',
        'ionian',
        'guitar',
      )
      assert.equal(roundTrip.position, position)
      assert.deepEqual(coordinates(roundTrip), coordinates(ionianPattern))
    }
  })

  it('keeps C# Major Position 7 entirely within the fretboard', () => {
    const pattern = getThreeNpsPattern('C#', 'major', 'guitar', 7)

    assert.ok(pattern)
    assert.ok(pattern.notes.every(
      ({ fret }) => fret >= 0 && fret <= 24,
    ))
  })

  it('generates all seven distinct C Major positions correctly', () => {
    const scale = new Set(getScale('C', 'major'))
    const signatures = new Set<string>()

    for (const position of THREE_NPS_POSITIONS) {
      const pattern = getThreeNpsPattern('C', 'major', 'guitar', position)
      assert.ok(pattern)
      assert.equal(pattern.notes.length, 18)

      const strings = fretsByString(pattern)
      assert.equal(strings.length, 6)

      for (const frets of strings) {
        assert.equal(frets.length, 3)
        assert.ok(frets[0] < frets[1] && frets[1] < frets[2])
      }

      for (const generatedNote of pattern.notes) {
        const openString = STANDARD_TUNINGS.guitar[generatedNote.stringIndex]
        assert.ok(scale.has(generatedNote.note))
        assert.equal(
          getNoteAtFret(openString, generatedNote.fret),
          generatedNote.note,
        )
        assert.equal(generatedNote.isRoot, generatedNote.note === 'C')
      }

      signatures.add(JSON.stringify(strings))
    }

    assert.equal(signatures.size, 7)
  })

  for (const [root, scale] of [
    ['G', 'major'],
    ['D', 'major'],
    ['A', 'naturalMinor'],
    ['D', 'dorian'],
    ['G', 'mixolydian'],
    ['F', 'lydian'],
    ['B', 'locrian'],
  ] as const) {
    it(`generates the complete ${root} ${scale} system`, () => {
      const scaleNotes = new Set(getScale(root, scale))

      for (const position of THREE_NPS_POSITIONS) {
        const pattern = getThreeNpsPattern(root, scale, 'guitar', position)
        assert.ok(pattern)
        assert.equal(pattern.notes.length, 18)
        assert.ok(pattern.notes.every(({ note }) => scaleNotes.has(note)))
        assert.ok(fretsByString(pattern).every(
          ([first, second, third]) => first < second && second < third,
        ))
      }
    })
  }

  it('rejects scales that do not contain seven notes', () => {
    for (const scale of [
      'majorPentatonic',
      'minorPentatonic',
      'blues',
    ] as const) {
      assert.equal(getThreeNpsPattern('C', scale, 'guitar', 1), null)
      assert.equal(supportsThreeNps(scale), false)
    }
  })

  it('supports every existing seven-note diatonic scale and mode', () => {
    for (const scale of [
      'major',
      'naturalMinor',
      'ionian',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian',
    ] as const) {
      assert.equal(supportsThreeNps(scale), true)
    }
  })

  it('projects the same system cleanly across standard four-string bass', () => {
    const pattern = getThreeNpsPattern('C', 'major', 'bass', 1)

    assert.ok(pattern)
    assert.equal(pattern.notes.length, 12)
    for (let stringIndex = 0; stringIndex < 4; stringIndex += 1) {
      const stringNotes: ThreeNpsNote[] = pattern.notes.filter(
        (note) => note.stringIndex === stringIndex,
      )
      assert.equal(stringNotes.length, 3)
      assert.ok(stringNotes[0].fret < stringNotes[1].fret)
      assert.ok(stringNotes[1].fret < stringNotes[2].fret)
    }
  })

  for (const instrument of ['guitar', 'bass'] as const) {
    it(`keeps every Major position and root within ${instrument} fret bounds`, () => {
      for (const root of PITCH_CLASSES) {
        for (const position of THREE_NPS_POSITIONS) {
          const pattern = getThreeNpsPattern(
            root,
            'major',
            instrument,
            position,
          )

          assert.ok(pattern, `${root} Major Position ${position}`)
          assert.ok(pattern.notes.every(
            ({ fret }) => fret >= 0 && fret <= 24,
          ))
        }
      }
    })
  }
})
