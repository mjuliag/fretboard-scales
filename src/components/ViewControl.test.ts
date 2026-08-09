import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ViewControl, type FretboardView } from './ViewControl.ts'

function renderView(value: FretboardView, visible: boolean): string {
  return renderToStaticMarkup(createElement(ViewControl, {
    onChange: () => {},
    value,
    visible,
  }))
}

describe('ViewControl', () => {
  it('is visible with the current selection in All Notes', () => {
    const markup = renderView('full', true)
    assert.match(markup, /<legend>View<\/legend>/)
    assert.match(markup, /aria-pressed="true" class="selected"[^>]*>Full fretboard/)
    assert.match(markup, /aria-pressed="false" class=""[^>]*>Position/)
  })

  it('renders no active view or layout element in 3NPS', () => {
    assert.equal(renderView('full', false), '')
    assert.equal(renderView('position', false), '')
  })

})
