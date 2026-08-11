import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ScaleInfo } from './ScaleInfo.ts'
import {
  getModeRelationship,
  getScaleTones,
  SCALE_INTERVAL_LABELS,
  type PitchClass,
  type ScaleName,
} from '../music/index.ts'

const SCALE_LABELS: Record<ScaleName, string> = {
  major: 'Major',
  naturalMinor: 'Natural Minor',
  majorPentatonic: 'Major Pentatonic',
  minorPentatonic: 'Minor Pentatonic',
  blues: 'Blues',
  ionian: 'Ionian',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Aeolian',
  locrian: 'Locrian',
}

function renderScaleInfo(root: PitchClass, scale: ScaleName): string {
  return renderToStaticMarkup(createElement(ScaleInfo, {
    intervals: SCALE_INTERVAL_LABELS[scale],
    modeRelationship: getModeRelationship(root, scale),
    root,
    scaleLabel: SCALE_LABELS[scale],
    scaleTones: getScaleTones(root, scale),
  }))
}

describe('ScaleInfo', () => {
  for (const [root, scale, label, intervals, notes] of [
    [
      'C',
      'major',
      'C Major',
      '1 · 2 · 3 · 4 · 5 · 6 · 7',
      'C · D · E · F · G · A · B',
    ],
    [
      'A',
      'naturalMinor',
      'A Natural Minor',
      '1 · 2 · b3 · 4 · 5 · b6 · b7',
      'A · B · C · D · E · F · G',
    ],
    [
      'A',
      'minorPentatonic',
      'A Minor Pentatonic',
      '1 · b3 · 4 · 5 · b7',
      'A · C · D · E · G',
    ],
  ] as const) {
    it(`renders formula and generated notes for ${label}`, () => {
      const markup = renderScaleInfo(root, scale)

      assert.match(markup, new RegExp(`<strong>${label}</strong>`))
      assert.ok(markup.includes(`>${intervals}</p>`))
      assert.ok(markup.includes(`>${notes}</p>`))
    })
  }

  it('keeps C Mixolydian mode information and current accidental naming', () => {
    const markup = renderScaleInfo('C', 'mixolydian')

    assert.match(markup, /<strong>C Mixolydian<\/strong>/)
    assert.ok(markup.includes('>1 · 2 · 3 · 4 · 5 · 6 · b7</p>'))
    assert.ok(markup.includes('>C · D · E · F · G · A · A#</p>'))
    assert.match(markup, /5th mode of F Major/)
    assert.match(
      markup,
      /Uses the same notes as F Major, with C as the tonal center\./,
    )
  })

  it('recomputes note names when Root changes', () => {
    const cMajor = renderScaleInfo('C', 'major')
    const gMajor = renderScaleInfo('G', 'major')

    assert.ok(cMajor.includes('>C · D · E · F · G · A · B</p>'))
    assert.ok(gMajor.includes('>G · A · B · C · D · E · F#</p>'))
    assert.doesNotMatch(gMajor, />C · D · E · F · G · A · B<\/p>/)
  })
})
