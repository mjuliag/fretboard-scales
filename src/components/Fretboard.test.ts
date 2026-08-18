import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  getScaleTones,
  type IntervalLabel,
  type PitchClass,
  type ScaleTone,
} from '../music/index.ts'
import type { PracticePosition } from '../practiceMode.ts'
import { Fretboard, type FretboardPresentation } from './Fretboard.tsx'

const scaleTones = getScaleTones('C', 'major')
const practicePositions: PracticePosition[] = [
  { coordinate: { fret: 0, stringIndex: 0 }, interval: '3', note: 'E' },
  { coordinate: { fret: 0, stringIndex: 1 }, interval: '6', note: 'A' },
]

function renderFretboard(options: {
  activePatternNotes?: readonly { fret: number; stringIndex: number }[] | null
  blueNoteInterval?: IntervalLabel | null
  chordToneIntervals?: readonly IntervalLabel[] | null
  displayMode?: 'notes' | 'intervals' | 'both'
  focusedInterval?: 'all' | IntervalLabel
  focusedIntervalExists?: boolean
  fretRange?: { start: number; end: number }
  interactive?: boolean
  playingCoordinate?: { fret: number; stringIndex: number } | null
  presentation?: FretboardPresentation
  root?: PitchClass
  scaleTones?: readonly ScaleTone[]
  showOtherNotes?: boolean
} = {}): string {
  return renderToStaticMarkup(createElement(Fretboard, {
    activePatternNotes: options.activePatternNotes ?? null,
    blueNoteInterval: options.blueNoteInterval ?? null,
    chordToneIntervals: options.chordToneIntervals ?? null,
    displayMode: options.displayMode ?? 'both',
    focusedInterval: options.focusedInterval ?? 'all',
    focusedIntervalExists: options.focusedIntervalExists ?? false,
    fretRange: options.fretRange ?? { start: 0, end: 0 },
    instrument: 'bass',
    onPositionSelect: options.interactive ? () => {} : undefined,
    playingCoordinate: options.playingCoordinate ?? null,
    presentation: options.presentation,
    root: options.root ?? 'C',
    scaleTones: options.scaleTones ?? scaleTones,
    showOtherNotes: options.showOtherNotes ?? true,
  }))
}

function practicePresentation(
  overrides: Partial<Extract<FretboardPresentation, { mode: 'practice' }>> = {},
): FretboardPresentation {
  return {
    correctCoordinates: [],
    mode: 'practice',
    onSelect: () => {},
    phase: 'unanswered',
    positions: practicePositions,
    selectedCoordinate: null,
    ...overrides,
  }
}

describe('Fretboard presentations', () => {
  it('preserves Explore interaction policy for Sound off and on', () => {
    const soundOff = renderFretboard()
    const soundOn = renderFretboard({ interactive: true })

    assert.doesNotMatch(soundOff, /<button/)
    assert.match(soundOff, /note-legend/)
    assert.match(soundOff, /root-note|scale-note/)
    assert.match(soundOn, /<button/)
    assert.match(soundOn, /aria-label="E1, string 1, fret 0"/)
  })

  it('renders only eligible neutral interactive positions before an answer', () => {
    const markup = renderFretboard({
      presentation: practicePresentation(),
    })

    assert.equal((markup.match(/<button/g) ?? []).length, 2)
    assert.equal((markup.match(/practice-candidate/g) ?? []).length, 2)
    assert.doesNotMatch(markup, /note-legend/)
    assert.doesNotMatch(markup, /note-name|interval-label/)
    assert.doesNotMatch(markup, /root-note|scale-note|focused-note|chord-tone|blue-note|playing-note/)
    assert.match(markup, /aria-label="Select string 4, fret 0"/)
    assert.match(markup, /aria-label="Select string 3, fret 0"/)
    assert.doesNotMatch(markup, /aria-label="[A-G][#]?[0-9]/)
  })

  it('reveals only correct and selected positions in an incorrect review', () => {
    const markup = renderFretboard({
      presentation: practicePresentation({
        correctCoordinates: [{ fret: 0, stringIndex: 0 }],
        phase: 'answered',
        selectedCoordinate: { fret: 0, stringIndex: 1 },
      }),
    })

    assert.equal((markup.match(/practice-correct/g) ?? []).length, 1)
    assert.equal((markup.match(/practice-incorrect/g) ?? []).length, 1)
    assert.equal((markup.match(/note-name/g) ?? []).length, 2)
    assert.match(markup, />E</)
    assert.match(markup, />A</)
  })

  it('marks every correct coordinate and the selected correct coordinate', () => {
    const markup = renderFretboard({
      presentation: practicePresentation({
        correctCoordinates: [
          { fret: 0, stringIndex: 0 },
          { fret: 0, stringIndex: 1 },
        ],
        phase: 'answered',
        selectedCoordinate: { fret: 0, stringIndex: 0 },
      }),
    })

    assert.equal((markup.match(/practice-correct/g) ?? []).length, 2)
    assert.equal((markup.match(/practice-selected/g) ?? []).length, 1)
    assert.doesNotMatch(markup, /practice-incorrect/)
  })

  it('preserves Notes, Intervals, and Both display modes in Explore', () => {
    const notes = renderFretboard({ displayMode: 'notes' })
    const intervals = renderFretboard({ displayMode: 'intervals' })
    const both = renderFretboard({ displayMode: 'both' })

    assert.equal((notes.match(/note-name/g) ?? []).length, 4)
    assert.equal((notes.match(/interval-label/g) ?? []).length, 0)
    assert.equal((intervals.match(/note-name/g) ?? []).length, 0)
    assert.equal((intervals.match(/interval-label/g) ?? []).length, 4)
    assert.equal((both.match(/note-name/g) ?? []).length, 4)
    assert.equal((both.match(/interval-label/g) ?? []).length, 4)
  })

  it('preserves visible and hidden non-scale note behavior in Explore', () => {
    const visible = renderFretboard({
      fretRange: { start: 1, end: 1 },
      interactive: true,
      showOtherNotes: true,
    })
    const hidden = renderFretboard({
      fretRange: { start: 1, end: 1 },
      interactive: true,
      showOtherNotes: false,
    })

    assert.match(visible, /class="[^"]*other-note[^"]*" aria-label="G#2, string 4, fret 1"/)
    assert.doesNotMatch(visible, /other-note[^"]*hidden-note/)
    assert.match(hidden, /class="[^"]*other-note[^"]*hidden-note[^"]*" aria-label="G#2, string 4, fret 1"/)
  })

  it('restricts Explore scale treatment to exact active-pattern coordinates', () => {
    const markup = renderFretboard({
      activePatternNotes: [{ fret: 8, stringIndex: 0 }],
      fretRange: { start: 3, end: 8 },
      interactive: true,
    })

    assert.match(markup, /class="[^"]*root-note[^"]*" aria-label="C2, string 1, fret 8"/)
    assert.match(markup, /class="[^"]*other-note[^"]*" aria-label="C2, string 2, fret 3"/)
  })

  it('preserves representative focus, chord-tone, and blue-note styling', () => {
    const focused = renderFretboard({
      focusedInterval: '3',
      focusedIntervalExists: true,
      interactive: true,
    })
    const chordTones = renderFretboard({
      chordToneIntervals: ['1', '3', '5'],
      interactive: true,
    })
    const blueNote = renderFretboard({
      blueNoteInterval: 'b5',
      fretRange: { start: 6, end: 6 },
      interactive: true,
      root: 'A',
      scaleTones: getScaleTones('A', 'blues'),
    })

    assert.match(focused, /class="[^"]*focused-note[^"]*" aria-label="E1, string 1, fret 0"/)
    assert.match(focused, /class="[^"]*subdued-note[^"]*" aria-label="A1, string 2, fret 0"/)
    assert.match(chordTones, /class="[^"]*chord-tone[^"]*" aria-label="E1, string 1, fret 0"/)
    assert.match(chordTones, /class="[^"]*subdued-note[^"]*" aria-label="A1, string 2, fret 0"/)
    assert.match(blueNote, /class="[^"]*blue-note[^"]*" aria-label="D#2, string 2, fret 6"/)
  })

  it('applies playing state only to the exact coordinate, not a unison', () => {
    const markup = renderFretboard({
      fretRange: { start: 3, end: 8 },
      interactive: true,
      playingCoordinate: { fret: 8, stringIndex: 0 },
    })

    assert.match(markup, /class="[^"]*playing-note[^"]*" aria-label="C2, string 1, fret 8"/)
    assert.doesNotMatch(markup, /class="[^"]*playing-note[^"]*" aria-label="C2, string 2, fret 3"/)
    assert.match(markup, /aria-label="C2, string 2, fret 3"/)
  })
})
