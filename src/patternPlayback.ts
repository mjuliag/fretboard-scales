import type { Instrument } from './music/index.ts'
import type { FretboardCoordinate } from './music/fretboardPosition.ts'
import {
  getFretboardPitch,
  pitchToFrequency,
  pitchToSemitone,
  type ScientificPitch,
} from './music/pitch.ts'

export type PatternPlaybackStep = {
  coordinate: FretboardCoordinate
  frequency: number
  instrument: Instrument
  pitch: ScientificPitch
}

export function createPatternPlaybackRoute(
  instrument: Instrument,
  patternCoordinates: readonly FretboardCoordinate[],
): PatternPlaybackStep[] {
  const steps = patternCoordinates.map((coordinate) => {
    const pitch = getFretboardPitch(
      instrument,
      coordinate.stringIndex,
      coordinate.fret,
    )
    return {
      coordinate: { ...coordinate },
      frequency: pitchToFrequency(pitch),
      instrument,
      pitch,
    }
  }).sort((left, right) => (
    pitchToSemitone(left.pitch) - pitchToSemitone(right.pitch)
    || left.coordinate.stringIndex - right.coordinate.stringIndex
    || left.coordinate.fret - right.coordinate.fret
  ))

  const seenPitches = new Set<number>()
  return steps.filter(({ pitch }) => {
    const semitone = pitchToSemitone(pitch)
    if (seenPitches.has(semitone)) return false
    seenPitches.add(semitone)
    return true
  })
}
