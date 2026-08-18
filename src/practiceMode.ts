import {
  getNoteAtFret,
  STANDARD_TUNINGS,
  type Instrument,
  type IntervalLabel,
  type PitchClass,
  type ScaleTone,
} from './music/index.ts'
import type { FretboardCoordinate } from './music/fretboardPosition.ts'

export type PracticePosition = {
  coordinate: FretboardCoordinate
  interval: IntervalLabel
  note: PitchClass
}

export type PracticeTarget =
  | { type: 'note'; value: PitchClass }
  | { type: 'degree'; value: IntervalLabel }

export type PracticeTargetType = PracticeTarget['type']

type PatternNote = {
  fret: number
  interval: IntervalLabel
  note: PitchClass
  stringIndex: number
}

export function enumerateAllNotesPracticePositions(
  instrument: Instrument,
  fretRange: { start: number; end: number },
  scaleTones: readonly ScaleTone[],
): PracticePosition[] {
  const intervalsByNote = new Map(
    scaleTones.map(({ note, interval }) => [note, interval]),
  )

  return STANDARD_TUNINGS[instrument].flatMap((openString, stringIndex) => (
    Array.from(
      { length: fretRange.end - fretRange.start + 1 },
      (_, index) => fretRange.start + index,
    ).flatMap((fret) => {
      const note = getNoteAtFret(openString, fret)
      const interval = intervalsByNote.get(note)

      return interval
        ? [{ coordinate: { fret, stringIndex }, interval, note }]
        : []
    })
  ))
}

export function adaptPatternPracticePositions(
  notes: readonly PatternNote[],
): PracticePosition[] {
  return notes.map(({ fret, interval, note, stringIndex }) => ({
    coordinate: { fret, stringIndex },
    interval,
    note,
  }))
}

export function getPracticeTargetCandidates(
  positions: readonly PracticePosition[],
  scaleTones: readonly ScaleTone[],
  type: PracticeTargetType,
): PracticeTarget[] {
  const visibleValues = new Set(
    positions.map((position) => (
      type === 'note' ? position.note : position.interval
    )),
  )
  const seen = new Set<string>()

  const candidates: PracticeTarget[] = []
  for (const tone of scaleTones) {
    const value = type === 'note' ? tone.note : tone.interval
    if (!visibleValues.has(value) || seen.has(value)) continue
    seen.add(value)

    candidates.push(type === 'note'
      ? { type, value: tone.note }
      : { type, value: tone.interval })
  }

  return candidates
}

export function choosePracticeTarget(
  candidates: readonly PracticeTarget[],
  previous: PracticeTarget | null,
  random: () => number = Math.random,
): PracticeTarget | null {
  if (candidates.length === 0) return null

  const available = candidates.length > 1 && previous
    ? candidates.filter((candidate) => !practiceTargetsEqual(candidate, previous))
    : [...candidates]
  const selectionPool = available.length > 0 ? available : candidates
  const randomIndex = Math.min(
    selectionPool.length - 1,
    Math.floor(Math.max(0, random()) * selectionPool.length),
  )

  return selectionPool[randomIndex]
}

export function getCorrectPracticeCoordinates(
  positions: readonly PracticePosition[],
  target: PracticeTarget,
): FretboardCoordinate[] {
  return positions
    .filter((position) => target.type === 'note'
      ? position.note === target.value
      : position.interval === target.value)
    .map(({ coordinate }) => coordinate)
}

export function evaluatePracticeAnswer(
  positions: readonly PracticePosition[],
  target: PracticeTarget,
  selection: FretboardCoordinate,
): boolean {
  const selectedPosition = positions.find(({ coordinate }) => (
    coordinate.stringIndex === selection.stringIndex
      && coordinate.fret === selection.fret
  ))

  return Boolean(selectedPosition && (target.type === 'note'
    ? selectedPosition.note === target.value
    : selectedPosition.interval === target.value))
}

export function findPracticePosition(
  positions: readonly PracticePosition[],
  coordinate: FretboardCoordinate | null,
): PracticePosition | null {
  if (!coordinate) return null

  return positions.find((position) => (
    position.coordinate.stringIndex === coordinate.stringIndex
      && position.coordinate.fret === coordinate.fret
  )) ?? null
}

export function formatIntervalLabel(interval: IntervalLabel): string {
  return interval.replace('b', '♭').replace('#', '♯')
}

export function practiceTargetsEqual(
  left: PracticeTarget,
  right: PracticeTarget,
): boolean {
  return left.type === right.type && left.value === right.value
}
