import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { getScaleTones } from '../music/index.ts'
import type { PracticePosition, PracticeTarget } from '../practiceMode.ts'
import {
  PracticeView,
  type PracticeScopeSummary,
} from './PracticeView.tsx'

const positions: PracticePosition[] = [
  { coordinate: { fret: 8, stringIndex: 0 }, interval: '1', note: 'C' },
  { coordinate: { fret: 7, stringIndex: 1 }, interval: '5', note: 'E' },
]

function renderPractice(options: {
  scope?: PracticeScopeSummary
  selection?: { fret: number; stringIndex: number } | null
  target?: PracticeTarget
  targetType?: 'note' | 'degree'
} = {}): string {
  const target = options.target ?? { type: 'note', value: 'C' }
  return renderToStaticMarkup(createElement(PracticeView, {
    fretRange: { start: 5, end: 9 },
    instrument: 'bass',
    onNext: () => {},
    onSelect: () => {},
    onSoundChange: () => {},
    onTargetTypeChange: () => {},
    positions,
    question: { selection: options.selection ?? null, target },
    root: 'C',
    scaleLabel: 'Major',
    scaleTones: getScaleTones('C', 'major'),
    scope: options.scope ?? { fullRange: false, mode: 'all' },
    soundEnabled: false,
    targetType: options.targetType ?? target.type,
  }))
}

describe('PracticeView', () => {
  it('renders focused All Notes context, Sound, selector, and prompt', () => {
    const markup = renderPractice()

    assert.match(markup, /Bass · C Major/)
    assert.match(markup, /All Notes · Frets 5–9/)
    assert.match(markup, />Sound</)
    assert.match(markup, /aria-pressed="true"[^>]*>Note/)
    assert.match(markup, /aria-pressed="false"[^>]*>Degree/)
    assert.match(markup, /Find C/)
    assert.doesNotMatch(markup, /Play Pattern|Highlight Degree|Chord Tones/)
    assert.doesNotMatch(markup, />Next</)
  })

  it('renders full, Pentatonic, and 3NPS scope summaries', () => {
    assert.match(renderPractice({ scope: { fullRange: true, mode: 'all' } }), /All Notes · All Frets/)
    assert.match(renderPractice({ scope: { mode: 'pentatonic', position: 1 } }), /Pentatonic · Shape 1/)
    assert.match(renderPractice({
      scope: { endFret: 12, mode: '3nps', position: 4, startFret: 7 },
    }), /3NPS · Position 4 · Frets 7–12/)
  })

  it('formats flat and sharp degree prompts typographically', () => {
    const flat = renderPractice({
      target: { type: 'degree', value: 'b3' },
      targetType: 'degree',
    })
    const sharp = renderPractice({
      target: { type: 'degree', value: '#4' },
      targetType: 'degree',
    })

    assert.match(flat, /Find the ♭3/)
    assert.match(sharp, /Find the ♯4/)
  })

  it('shows concise educational correct feedback and Next', () => {
    const markup = renderPractice({ selection: { fret: 8, stringIndex: 0 } })

    assert.match(markup, /✓ Correct — C is the 1 of C Major/)
    assert.match(markup, /aria-live="polite"/)
    assert.match(markup, />Next</)
  })

  it('shows selected and correct note-degree information when incorrect', () => {
    const markup = renderPractice({ selection: { fret: 7, stringIndex: 1 } })

    assert.match(markup, /✗ Incorrect — you selected E \(5\)/)
    assert.match(markup, /Correct answer: C \(1\)/)
    assert.match(markup, />Next</)
  })
})
