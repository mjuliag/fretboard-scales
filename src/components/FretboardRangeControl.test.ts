import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { FretboardRangeControl } from './FretboardRangeControl.ts'

function render(value: 'full' | 'position'): string {
  return renderToStaticMarkup(createElement(FretboardRangeControl, {
    end: 9,
    endDraft: '9',
    onBlur: () => {},
    onCommit: () => {},
    onDraftChange: () => {},
    onViewChange: () => {},
    start: 5,
    startDraft: '5',
    value,
  }))
}

describe('FretboardRangeControl', () => {
  it('keeps custom range fields hidden for All Frets', () => {
    const markup = render('full')
    assert.match(markup, /class="fretboard-range-controls"/)
    assert.match(markup, /class="view-control"/)
    assert.match(markup, /Fretboard Range/)
    assert.match(markup, /aria-pressed="true"[^>]*>All Frets/)
    assert.match(markup, /Custom Range/)
    assert.doesNotMatch(markup, /type="checkbox"/)
    assert.doesNotMatch(markup, /Start fret|End fret|Frets 5–9/)
  })

  it('discloses range fields and status for Custom Range', () => {
    const markup = render('position')
    assert.match(markup, /aria-pressed="true"[^>]*>Custom Range/)
    assert.doesNotMatch(markup, /type="checkbox"/)
    assert.match(markup, /Start fret/)
    assert.match(markup, /End fret/)
    assert.match(markup, /Frets 5–9/)
  })
})
