import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { PatternModeControl } from './PatternModeControl.ts'

function render(threeNpsSupported: boolean, pentatonicSupported: boolean): string {
  return renderToStaticMarkup(createElement(PatternModeControl, {
    activeMode: 'all',
    onChange: () => {},
    pentatonicSupported,
    threeNpsSupported,
  }))
}

describe('PatternModeControl scale support', () => {
  it('offers 3NPS for supported seven-note scales', () => {
    const markup = render(true, false)
    assert.match(markup, />3NPS<\/button>/)
    assert.doesNotMatch(markup, /Pentatonic/)
  })

  it('offers Pentatonic without 3NPS for pentatonic scales', () => {
    const markup = render(false, true)
    assert.match(markup, />Pentatonic<\/button>/)
    assert.doesNotMatch(markup, />3NPS<\/button>/)
  })

  it('retains disabled 3NPS for unsupported scales', () => {
    const markup = render(false, false)
    assert.match(markup, /<button[^>]*disabled=""[^>]*>3NPS<\/button>/)
    assert.doesNotMatch(markup, /Pentatonic/)
  })
})
