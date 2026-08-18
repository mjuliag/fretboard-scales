import { createElement } from 'react'

import type { FretboardCoordinate } from '../music/fretboardPosition.ts'
import type {
  Instrument,
  PitchClass,
  ScaleTone,
} from '../music/index.ts'
import {
  evaluatePracticeAnswer,
  findPracticePosition,
  formatIntervalLabel,
  getCorrectPracticeCoordinates,
  type PracticePosition,
  type PracticeTarget,
  type PracticeTargetType,
} from '../practiceMode.ts'
import { Fretboard } from './Fretboard.tsx'

export type PracticeScopeSummary =
  | { mode: 'all'; fullRange: boolean }
  | { mode: 'pentatonic'; position: number }
  | { mode: '3nps'; endFret: number; position: number; startFret: number }

type PracticeQuestion = {
  selection: FretboardCoordinate | null
  target: PracticeTarget
}

type PracticeViewProps = {
  fretRange: { start: number; end: number }
  instrument: Instrument
  onNext: () => void
  onSelect: (coordinate: FretboardCoordinate) => void
  onSoundChange: (enabled: boolean) => void
  onTargetTypeChange: (type: PracticeTargetType) => void
  positions: readonly PracticePosition[]
  question: PracticeQuestion | null
  root: PitchClass
  scaleLabel: string
  scaleTones: readonly ScaleTone[]
  scope: PracticeScopeSummary
  soundEnabled: boolean
  targetType: PracticeTargetType
}

function scopeLabel(scope: PracticeScopeSummary): string {
  if (scope.mode === 'pentatonic') {
    return `Pentatonic · Shape ${scope.position}`
  }
  if (scope.mode === '3nps') {
    return `3NPS · Position ${scope.position} · Frets ${scope.startFret}–${scope.endFret}`
  }
  return scope.fullRange ? 'All Notes · All Frets' : 'All Notes'
}

function prompt(target: PracticeTarget): string {
  return target.type === 'note'
    ? `Find ${target.value}`
    : `Find the ${formatIntervalLabel(target.value)}`
}

export function PracticeView({
  fretRange,
  instrument,
  onNext,
  onSelect,
  onSoundChange,
  onTargetTypeChange,
  positions,
  question,
  root,
  scaleLabel,
  scaleTones,
  scope,
  soundEnabled,
  targetType,
}: PracticeViewProps) {
  const selection = question?.selection ?? null
  const selectedPosition = findPracticePosition(positions, selection)
  const correctCoordinates = question
    ? getCorrectPracticeCoordinates(positions, question.target)
    : []
  const correctTone = question
    ? scaleTones.find((tone) => question.target.type === 'note'
      ? tone.note === question.target.value
      : tone.interval === question.target.value)
    : undefined
  const isCorrect = question && selection
    ? evaluatePracticeAnswer(positions, question.target, selection)
    : false
  const formattedCorrectInterval = correctTone
    ? formatIntervalLabel(correctTone.interval)
    : ''
  const feedback = selectedPosition && correctTone
    ? isCorrect
      ? question?.target.type === 'note'
        ? `✓ Correct — ${correctTone.note} is the ${formattedCorrectInterval} of ${root} ${scaleLabel}`
        : `✓ Correct — ${correctTone.note} is the ${formattedCorrectInterval}`
      : `✗ Incorrect — you selected ${selectedPosition.note} (${formatIntervalLabel(selectedPosition.interval)}). Correct answer: ${correctTone.note} (${formattedCorrectInterval})`
    : null
  const fullScopeLabel = scope.mode === 'all' && !scope.fullRange
    ? `${scopeLabel(scope)} · Frets ${fretRange.start}–${fretRange.end}`
    : scopeLabel(scope)

  return createElement(
    'section',
    { 'aria-labelledby': 'practice-title', className: 'practice-view' },
    createElement(
      'div',
      { className: 'practice-context' },
      createElement(
        'div',
        { className: 'practice-context-copy' },
        createElement('strong', null, `${instrument === 'bass' ? 'Bass' : 'Guitar'} · ${root} ${scaleLabel}`),
        createElement('span', null, fullScopeLabel),
      ),
      createElement(
        'label',
        { className: 'toggle-control practice-sound-toggle' },
        createElement('input', {
          checked: soundEnabled,
          onChange: (event: { target: { checked: boolean } }) => onSoundChange(event.target.checked),
          type: 'checkbox',
        }),
        createElement('span', null, 'Sound'),
      ),
    ),
    createElement(
      'div',
      { className: 'practice-exercise' },
      createElement(
        'fieldset',
        { className: 'practice-type-control' },
        createElement('legend', null, 'Exercise'),
        createElement(
          'div',
          null,
          ...(['note', 'degree'] as const).map((type) => createElement(
            'button',
            {
              'aria-pressed': targetType === type,
              className: targetType === type ? 'selected' : '',
              key: type,
              onClick: () => onTargetTypeChange(type),
              type: 'button',
            },
            type === 'note' ? 'Note' : 'Degree',
          )),
        ),
      ),
      createElement('h2', { id: 'practice-title' }, 'Practice'),
      question
        ? createElement('p', { className: 'practice-prompt' }, prompt(question.target))
        : createElement(
            'p',
            { className: 'practice-empty-state', role: 'status' },
            'No scale positions are available in this scope.',
          ),
    ),
    question && createElement(Fretboard, {
      activePatternNotes: null,
      blueNoteInterval: null,
      chordToneIntervals: null,
      displayMode: 'both',
      focusedInterval: 'all',
      focusedIntervalExists: false,
      fretRange,
      instrument,
      playingCoordinate: null,
      presentation: {
        correctCoordinates,
        mode: 'practice',
        onSelect,
        phase: selection ? 'answered' : 'unanswered',
        positions,
        selectedCoordinate: selection,
      },
      root,
      scaleTones,
      showOtherNotes: false,
    }),
    selection && createElement(
      'div',
      { className: 'practice-review' },
      createElement(
        'output',
        {
          'aria-live': 'polite',
          className: `practice-feedback ${isCorrect ? 'correct' : 'incorrect'}`,
        },
        feedback,
      ),
      createElement(
        'button',
        { className: 'practice-next-button', onClick: onNext, type: 'button' },
        'Next',
      ),
    ),
  )
}
