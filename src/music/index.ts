export const PITCH_CLASSES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export type PitchClass = (typeof PITCH_CLASSES)[number]

export const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
} as const satisfies Record<string, readonly number[]>

export type ScaleName = keyof typeof SCALE_INTERVALS

export const SCALE_INTERVAL_LABELS = {
  major: ['1', '2', '3', '4', '5', '6', '7'],
  naturalMinor: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
  majorPentatonic: ['1', '2', '3', '5', '6'],
  minorPentatonic: ['1', 'b3', '4', '5', 'b7'],
  blues: ['1', 'b3', '4', 'b5', '5', 'b7'],
  ionian: ['1', '2', '3', '4', '5', '6', '7'],
  dorian: ['1', '2', 'b3', '4', '5', '6', 'b7'],
  phrygian: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
  lydian: ['1', '2', '3', '#4', '5', '6', '7'],
  mixolydian: ['1', '2', '3', '4', '5', '6', 'b7'],
  aeolian: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
  locrian: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
} as const satisfies Record<ScaleName, readonly string[]>

export type IntervalLabel =
  (typeof SCALE_INTERVAL_LABELS)[ScaleName][number]

export type ScaleTone = {
  note: PitchClass
  interval: IntervalLabel
}

export const STANDARD_TUNINGS = {
  guitar: ['E', 'A', 'D', 'G', 'B', 'E'],
  bass: ['E', 'A', 'D', 'G'],
} as const satisfies Record<string, readonly PitchClass[]>

export type Instrument = keyof typeof STANDARD_TUNINGS

function transpose(note: PitchClass, semitones: number): PitchClass {
  const noteIndex = PITCH_CLASSES.indexOf(note)
  const transposedIndex = (noteIndex + semitones) % PITCH_CLASSES.length

  return PITCH_CLASSES[transposedIndex]
}

export function getNoteAtFret(
  openString: PitchClass,
  fret: number,
): PitchClass {
  if (!Number.isInteger(fret) || fret < 0) {
    throw new RangeError('Fret must be a non-negative integer')
  }

  return transpose(openString, fret)
}

export function generateScale(
  root: PitchClass,
  intervals: readonly number[],
): PitchClass[] {
  return intervals.map((interval) => transpose(root, interval))
}

export function getScale(root: PitchClass, scale: ScaleName): PitchClass[] {
  return generateScale(root, SCALE_INTERVALS[scale])
}

export function getScaleTones(
  root: PitchClass,
  scale: ScaleName,
): ScaleTone[] {
  const notes = getScale(root, scale)
  const labels = SCALE_INTERVAL_LABELS[scale]

  return notes.map((note, index) => ({ note, interval: labels[index] }))
}
