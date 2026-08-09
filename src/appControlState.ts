import type { DisplayMode } from './components/Fretboard'
import type { FretboardView } from './components/ViewControl'
import type { PatternMode } from './components/PatternModeControl'
import type { ChordToneMode, IntervalLabel, PitchClass, ScaleName } from './music'
import type { ThreeNpsPosition } from './music/threeNps'

export type IntervalFocus = 'all' | IntervalLabel

export type AppControlState = {
  chordToneMode: ChordToneMode
  displayMode: DisplayMode
  focusedInterval: IntervalFocus
  fretboardView: FretboardView
  patternMode: PatternMode
  root: PitchClass
  scaleName: ScaleName
  threeNpsPosition: ThreeNpsPosition
}

export const DEFAULT_APP_CONTROL_STATE: AppControlState = {
  chordToneMode: 'off',
  displayMode: 'both',
  focusedInterval: 'all',
  fretboardView: 'full',
  patternMode: 'all',
  root: 'A',
  scaleName: 'minorPentatonic',
  threeNpsPosition: 1,
}

export function transitionPatternMode(
  state: AppControlState,
  patternMode: PatternMode,
): AppControlState {
  return { ...state, patternMode }
}
