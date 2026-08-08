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

export const MODE_DEGREES = {
  ionian: 1,
  dorian: 2,
  phrygian: 3,
  lydian: 4,
  mixolydian: 5,
  aeolian: 6,
  locrian: 7,
} as const

export type ModeName = keyof typeof MODE_DEGREES

export type ModeRelationship = {
  degree: (typeof MODE_DEGREES)[ModeName]
  parentRoot: PitchClass
}

export type ParentMajorScale = {
  parentRoot: PitchClass
  parentScale: 'major'
}

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

export type RelativeScaleRelationship = 'relativeMinor' | 'relativeMajor'

export type RelativeScale = {
  relativeRoot: PitchClass
  relativeScale: 'major' | 'naturalMinor' | 'ionian' | 'aeolian'
  relationship: RelativeScaleRelationship
}

export type ScaleNavigationRelationship = {
  destinationRoot: PitchClass
  destinationScale: 'major' | 'naturalMinor' | 'ionian' | 'aeolian'
  label: 'Relative minor' | 'Relative major' | 'Parent major'
}

export type ChordToneMode = 'off' | 'triad' | 'seventh'

export type ChordToneResult =
  | {
      supported: true
      tones: ScaleTone[]
      missingDegrees: []
      ambiguousDegrees: []
    }
  | {
      supported: false
      tones: []
      missingDegrees: number[]
      ambiguousDegrees: number[]
    }

const SCALE_CHORD_TONE_PREFERENCES: Partial<
  Record<ScaleName, Partial<Record<number, IntervalLabel>>>
> = {
  blues: { 5: '5' },
}

export const STANDARD_TUNINGS = {
  guitar: ['E', 'A', 'D', 'G', 'B', 'E'],
  bass: ['E', 'A', 'D', 'G'],
} as const satisfies Record<string, readonly PitchClass[]>

export type Instrument = keyof typeof STANDARD_TUNINGS

function transpose(note: PitchClass, semitones: number): PitchClass {
  const noteIndex = PITCH_CLASSES.indexOf(note)
  const transposedIndex =
    ((noteIndex + semitones) % PITCH_CLASSES.length + PITCH_CLASSES.length) %
    PITCH_CLASSES.length

  return PITCH_CLASSES[transposedIndex]
}

export function isMode(scale: ScaleName): scale is ModeName {
  return scale in MODE_DEGREES
}

export function getModeRelationship(
  root: PitchClass,
  scale: ScaleName,
): ModeRelationship | null {
  if (!isMode(scale)) {
    return null
  }

  const degree = MODE_DEGREES[scale]
  const majorScaleOffset = SCALE_INTERVALS.major[degree - 1]

  return {
    degree,
    parentRoot: transpose(root, -majorScaleOffset),
  }
}

export function getParentMajorScale(
  root: PitchClass,
  scale: ScaleName,
): ParentMajorScale | null {
  const relationship = getModeRelationship(root, scale)

  return relationship
    ? { parentRoot: relationship.parentRoot, parentScale: 'major' }
    : null
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

export function getRelativeScale(
  root: PitchClass,
  scale: ScaleName,
): RelativeScale | null {
  if (scale === 'major' || scale === 'ionian') {
    return {
      relativeRoot: getScale(root, scale)[5],
      relativeScale: scale === 'major' ? 'naturalMinor' : 'aeolian',
      relationship: 'relativeMinor',
    }
  }

  if (scale === 'naturalMinor' || scale === 'aeolian') {
    return {
      relativeRoot: getScale(root, scale)[2],
      relativeScale: scale === 'naturalMinor' ? 'major' : 'ionian',
      relationship: 'relativeMajor',
    }
  }

  return null
}

export function getScaleNavigationRelationship(
  root: PitchClass,
  scale: ScaleName,
): ScaleNavigationRelationship | null {
  const relative = getRelativeScale(root, scale)

  // Keep the established relative-scale presentation for Ionian/Aeolian.
  // This also prevents Aeolian from showing two links to the same note set.
  if (relative) {
    return {
      destinationRoot: relative.relativeRoot,
      destinationScale: relative.relativeScale,
      label: relative.relationship === 'relativeMinor'
        ? 'Relative minor'
        : 'Relative major',
    }
  }

  const mode = getModeRelationship(root, scale)
  const parent = getParentMajorScale(root, scale)
  if (!mode || !parent || mode.degree === 1) return null

  return {
    destinationRoot: parent.parentRoot,
    destinationScale: parent.parentScale,
    label: 'Parent major',
  }
}

export function getScaleTones(
  root: PitchClass,
  scale: ScaleName,
): ScaleTone[] {
  const notes = getScale(root, scale)
  const labels = SCALE_INTERVAL_LABELS[scale]

  return notes.map((note, index) => ({ note, interval: labels[index] }))
}

function getIntervalDegree(interval: IntervalLabel): number {
  return Number(interval.match(/\d+/)?.[0])
}

export function getChordTones(
  scaleTones: readonly ScaleTone[],
  mode: Exclude<ChordToneMode, 'off'>,
  scale?: ScaleName,
): ChordToneResult {
  const requiredDegrees = mode === 'triad' ? [1, 3, 5] : [1, 3, 5, 7]
  const matches = requiredDegrees.map((degree) => ({
    degree,
    tones: (() => {
      const degreeTones = scaleTones.filter(
        ({ interval }) => getIntervalDegree(interval) === degree,
      )
      const preferredInterval = scale
        ? SCALE_CHORD_TONE_PREFERENCES[scale]?.[degree]
        : undefined

      if (degreeTones.length > 1 && preferredInterval) {
        return degreeTones.filter(
          ({ interval }) => interval === preferredInterval,
        )
      }

      return degreeTones
    })(),
  }))
  const missingDegrees = matches
    .filter(({ tones }) => tones.length === 0)
    .map(({ degree }) => degree)
  const ambiguousDegrees = matches
    .filter(({ tones }) => tones.length > 1)
    .map(({ degree }) => degree)

  if (missingDegrees.length > 0 || ambiguousDegrees.length > 0) {
    return {
      supported: false,
      tones: [],
      missingDegrees,
      ambiguousDegrees,
    }
  }

  return {
    supported: true,
    tones: matches.map(({ tones }) => tones[0]),
    missingDegrees: [],
    ambiguousDegrees: [],
  }
}
