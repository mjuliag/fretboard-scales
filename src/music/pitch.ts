import {
  PITCH_CLASSES,
  type Instrument,
  type PitchClass,
} from './index.ts'

export type ScientificPitch = {
  pitchClass: PitchClass
  octave: number
}

export const STANDARD_PITCH_TUNINGS = {
  guitar: [
    { pitchClass: 'E', octave: 2 },
    { pitchClass: 'A', octave: 2 },
    { pitchClass: 'D', octave: 3 },
    { pitchClass: 'G', octave: 3 },
    { pitchClass: 'B', octave: 3 },
    { pitchClass: 'E', octave: 4 },
  ],
  bass: [
    { pitchClass: 'E', octave: 1 },
    { pitchClass: 'A', octave: 1 },
    { pitchClass: 'D', octave: 2 },
    { pitchClass: 'G', octave: 2 },
  ],
} as const satisfies Record<Instrument, readonly ScientificPitch[]>

export function pitchToSemitone(pitch: ScientificPitch): number {
  return (pitch.octave + 1) * PITCH_CLASSES.length
    + PITCH_CLASSES.indexOf(pitch.pitchClass)
}

export function transposePitch(
  pitch: ScientificPitch,
  semitones: number,
): ScientificPitch {
  if (!Number.isInteger(semitones)) {
    throw new RangeError('Semitones must be an integer')
  }

  const transposedSemitone = pitchToSemitone(pitch) + semitones

  return {
    pitchClass: PITCH_CLASSES[
      ((transposedSemitone % PITCH_CLASSES.length) + PITCH_CLASSES.length)
        % PITCH_CLASSES.length
    ],
    octave: Math.floor(transposedSemitone / PITCH_CLASSES.length) - 1,
  }
}

export function getPitchAtFret(
  openString: ScientificPitch,
  fret: number,
): ScientificPitch {
  if (!Number.isInteger(fret) || fret < 0) {
    throw new RangeError('Fret must be a non-negative integer')
  }

  return transposePitch(openString, fret)
}

export function getFretboardPitch(
  instrument: Instrument,
  stringIndex: number,
  fret: number,
): ScientificPitch {
  const openString = STANDARD_PITCH_TUNINGS[instrument][stringIndex]

  if (!openString) {
    throw new RangeError(`String index ${stringIndex} is invalid for ${instrument}`)
  }

  return getPitchAtFret(openString, fret)
}

export function pitchToFrequency(pitch: ScientificPitch): number {
  const a4Semitone = pitchToSemitone({ pitchClass: 'A', octave: 4 })
  return 440 * 2 ** ((pitchToSemitone(pitch) - a4Semitone) / 12)
}
