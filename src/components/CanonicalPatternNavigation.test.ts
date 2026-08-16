import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { CanonicalPatternNavigation } from './CanonicalPatternNavigation.ts'

describe('CanonicalPatternNavigation', () => {
  it('labels Pentatonic navigation as Shape and keeps positions 1–5', () => {
    const markup = renderToStaticMarkup(createElement(CanonicalPatternNavigation, {
      mode: 'pentatonic',
      onChange: () => {},
      positions: [1, 2, 3, 4, 5],
      selectedPosition: 1,
    }))

    assert.match(markup, /<legend>Shape<\/legend>/)
    assert.deepEqual([...markup.matchAll(/aria-label="Pentatonic shape (\d)"/g)].map((match) => match[1]), ['1', '2', '3', '4', '5'])
    assert.doesNotMatch(markup, /Fretboard Range/)
  })

  it('keeps the canonical 3NPS Position label and positions 1–7', () => {
    const markup = renderToStaticMarkup(createElement(CanonicalPatternNavigation, {
      mode: '3nps',
      onChange: () => {},
      positions: [1, 2, 3, 4, 5, 6, 7],
      selectedPosition: 6,
    }))

    assert.match(markup, /<legend>3NPS Position<\/legend>/)
    assert.deepEqual([...markup.matchAll(/aria-label="3NPS position (\d)"/g)].map((match) => match[1]), ['1', '2', '3', '4', '5', '6', '7'])
    assert.doesNotMatch(markup, /Fretboard Range/)
  })
})
