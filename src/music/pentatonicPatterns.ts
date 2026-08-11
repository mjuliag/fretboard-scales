import {
  getNoteAtFret,
  getScaleTones,
  PITCH_CLASSES,
  STANDARD_TUNINGS,
  type Instrument,
  type IntervalLabel,
  type PitchClass,
  type ScaleName,
} from './index.ts'

export const PENTATONIC_POSITIONS = [1, 2, 3, 4, 5] as const
export type PentatonicPosition = (typeof PENTATONIC_POSITIONS)[number]
export type PentatonicScaleName = 'minorPentatonic' | 'majorPentatonic'

export type PentatonicPatternNote = {
  fret: number
  interval: IntervalLabel
  isRoot: boolean
  note: PitchClass
  stringIndex: number
}

export type PentatonicPattern = {
  notes: PentatonicPatternNote[]
  position: PentatonicPosition
}

// Canonical minor-pentatonic boxes, low E to high E, expressed as offsets
// from the Pattern 1 root on the low E string.
const MINOR_PENTATONIC_SHAPES = [
  [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]],
  [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]],
  [[5, 7], [5, 7], [5, 7], [4, 7], [5, 8], [5, 7]],
  [[7, 10], [7, 10], [7, 9], [7, 9], [8, 10], [7, 10]],
  [[10, 12], [10, 12], [9, 12], [9, 12], [10, 12], [10, 12]],
] as const

export function supportsPentatonicPatterns(
  scale: ScaleName,
): scale is PentatonicScaleName {
  return scale === 'minorPentatonic' || scale === 'majorPentatonic'
}

function transposePitchClass(note: PitchClass, semitones: number): PitchClass {
  const index = PITCH_CLASSES.indexOf(note)
  return PITCH_CLASSES[
    ((index + semitones) % PITCH_CLASSES.length + PITCH_CLASSES.length)
      % PITCH_CLASSES.length
  ]
}

function getShape(
  scale: PentatonicScaleName,
  position: PentatonicPosition,
): { octaveOffset: number; shape: (typeof MINOR_PENTATONIC_SHAPES)[number] } {
  if (scale === 'minorPentatonic') {
    return { octaveOffset: 0, shape: MINOR_PENTATONIC_SHAPES[position - 1] }
  }

  const minorShapeIndex = position % PENTATONIC_POSITIONS.length
  return {
    octaveOffset: position === 5 ? 12 : 0,
    shape: MINOR_PENTATONIC_SHAPES[minorShapeIndex],
  }
}

export function getPentatonicPattern(
  root: PitchClass,
  scale: PentatonicScaleName,
  instrument: Instrument,
  position: PentatonicPosition,
): PentatonicPattern {
  const relativeMinorRoot = scale === 'majorPentatonic'
    ? transposePitchClass(root, -3)
    : root
  const anchor = (
    PITCH_CLASSES.indexOf(relativeMinorRoot)
    - PITCH_CLASSES.indexOf('E')
    + PITCH_CLASSES.length
  ) % PITCH_CLASSES.length
  const { octaveOffset, shape } = getShape(scale, position)
  const instrumentShape = shape.slice(0, STANDARD_TUNINGS[instrument].length)
  const rawFrets = instrumentShape.flat().map(
    (offset) => anchor + octaveOffset + offset,
  )
  let octaveShift = 0
  while (Math.max(...rawFrets) + octaveShift > 24) octaveShift -= 12
  while (Math.min(...rawFrets) + octaveShift < 0) octaveShift += 12

  const tonesByNote = new Map(
    getScaleTones(root, scale).map((tone) => [tone.note, tone]),
  )
  const notes = instrumentShape.flatMap((stringFrets, stringIndex) => (
    stringFrets.map((offset) => {
      const fret = anchor + octaveOffset + offset + octaveShift
      const note = getNoteAtFret(STANDARD_TUNINGS[instrument][stringIndex], fret)
      const tone = tonesByNote.get(note)
      if (!tone) throw new Error('Canonical pentatonic shape produced a non-scale tone')
      return {
        fret,
        interval: tone.interval,
        isRoot: note === root,
        note,
        stringIndex,
      }
    })
  ))

  return { notes, position }
}

export function getPentatonicFretRange(
  pattern: PentatonicPattern,
): { start: number; end: number } {
  const frets = pattern.notes.map(({ fret }) => fret)
  return { start: Math.min(...frets), end: Math.max(...frets) }
}
