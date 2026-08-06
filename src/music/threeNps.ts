import {
  getScaleTones,
  PITCH_CLASSES,
  SCALE_INTERVALS,
  STANDARD_TUNINGS,
  type Instrument,
  type IntervalLabel,
  type PitchClass,
  type ScaleName,
} from './index.ts'
import { MAX_FRET, MIN_FRET } from '../fretRange.ts'

export const THREE_NPS_POSITIONS = [1, 2, 3, 4, 5, 6, 7] as const

const THREE_NPS_SCALES = new Set<ScaleName>([
  'major',
  'naturalMinor',
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
])

export type ThreeNpsPosition = (typeof THREE_NPS_POSITIONS)[number]

export type ThreeNpsNote = {
  fret: number
  interval: IntervalLabel
  isRoot: boolean
  note: PitchClass
  stringIndex: number
}

export type ThreeNpsPattern = {
  notes: ThreeNpsNote[]
  position: ThreeNpsPosition
}

export type EquivalentThreeNpsPosition = {
  fretShift: -12 | 0 | 12
  position: ThreeNpsPosition
}

export function supportsThreeNps(scale: ScaleName): boolean {
  return THREE_NPS_SCALES.has(scale)
}

function getAscendingTuningOffsets(instrument: Instrument): number[] {
  const tuning = STANDARD_TUNINGS[instrument]
  const firstPitchIndex = PITCH_CLASSES.indexOf(tuning[0])
  let previousOffset = 0

  return tuning.map((openString, stringIndex) => {
    if (stringIndex === 0) return 0

    const pitchIndex = PITCH_CLASSES.indexOf(openString)
    let offset = pitchIndex - firstPitchIndex

    while (offset <= previousOffset) offset += PITCH_CLASSES.length
    previousOffset = offset
    return offset
  })
}

export function getThreeNpsPattern(
  root: PitchClass,
  scale: ScaleName,
  instrument: Instrument,
  position: ThreeNpsPosition,
): ThreeNpsPattern | null {
  if (!supportsThreeNps(scale)) return null

  const scaleTones = getScaleTones(root, scale)
  const tuning = STANDARD_TUNINGS[instrument]
  const tuningOffsets = getAscendingTuningOffsets(instrument)
  const lowestOpenPitchIndex = PITCH_CLASSES.indexOf(tuning[0])
  const startingToneIndex = position - 1
  const rootPitchIndex = PITCH_CLASSES.indexOf(root)
  const rootFret =
    (rootPitchIndex - lowestOpenPitchIndex + PITCH_CLASSES.length)
    % PITCH_CLASSES.length
  const notes: ThreeNpsNote[] = []

  for (let noteIndex = 0; noteIndex < tuning.length * 3; noteIndex += 1) {
    const absoluteScaleToneIndex = startingToneIndex + noteIndex
    const scaleToneIndex = absoluteScaleToneIndex % scaleTones.length
    const octave = Math.floor(absoluteScaleToneIndex / scaleTones.length)
    const scaleTone = scaleTones[scaleToneIndex]
    const absolutePitch = rootFret
      + SCALE_INTERVALS[scale][scaleToneIndex]
      + octave * PITCH_CLASSES.length
    const stringIndex = Math.floor(noteIndex / 3)

    notes.push({
      fret: absolutePitch - tuningOffsets[stringIndex],
      interval: scaleTone.interval,
      isRoot: scaleTone.note === root,
      note: scaleTone.note,
      stringIndex,
    })
  }

  for (const octaveShift of [0, -PITCH_CLASSES.length, PITCH_CLASSES.length]) {
    const shiftedNotes = notes.map((note) => ({
      ...note,
      fret: note.fret + octaveShift,
    }))
    const fitsFretboard = shiftedNotes.every(
      ({ fret }) => fret >= MIN_FRET && fret <= MAX_FRET,
    )

    if (fitsFretboard) {
      return { notes: shiftedNotes, position }
    }
  }

  return null
}

export function getThreeNpsFretRange(pattern: ThreeNpsPattern): {
  start: number
  end: number
} {
  const frets = pattern.notes.map(({ fret }) => fret)

  return {
    start: Math.min(...frets),
    end: Math.max(...frets),
  }
}

export function shiftThreeNpsPattern(
  pattern: ThreeNpsPattern,
  fretShift: -12 | 0 | 12,
): ThreeNpsPattern | null {
  const notes = pattern.notes.map((note) => ({
    ...note,
    fret: note.fret + fretShift,
  }))

  if (notes.some(({ fret }) => fret < MIN_FRET || fret > MAX_FRET)) {
    return null
  }

  return { ...pattern, notes }
}

function coordinateSignature(pattern: ThreeNpsPattern): string {
  return pattern.notes
    .map(({ fret, stringIndex }) => `${stringIndex}:${fret}`)
    .sort()
    .join('|')
}

export function findEquivalentThreeNpsPosition(
  sourcePattern: ThreeNpsPattern,
  destinationRoot: PitchClass,
  destinationScale: ScaleName,
  instrument: Instrument,
): EquivalentThreeNpsPosition | null {
  const sourceCoordinates = coordinateSignature(sourcePattern)

  for (const position of THREE_NPS_POSITIONS) {
    const destinationPattern = getThreeNpsPattern(
      destinationRoot,
      destinationScale,
      instrument,
      position,
    )

    if (!destinationPattern) continue

    for (const fretShift of [0, -12, 12] as const) {
      const shiftedPattern = shiftThreeNpsPattern(destinationPattern, fretShift)

      if (
        shiftedPattern
        && coordinateSignature(shiftedPattern) === sourceCoordinates
      ) {
        return { fretShift, position }
      }
    }
  }

  return null
}
