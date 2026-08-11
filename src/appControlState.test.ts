import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  DEFAULT_APP_CONTROL_STATE,
  transitionPatternMode,
  type AppControlState,
} from './appControlState.ts'
import { ViewControl } from './components/ViewControl.ts'

function renderView(state: AppControlState): string {
  return renderToStaticMarkup(createElement(ViewControl, {
    onChange: () => {},
    value: state.fretboardView,
    visible: state.patternMode === 'all',
  }))
}

describe('App Pattern/View state transition', () => {
  it('preserves Position and all unrelated App state through 3NPS and back', () => {
    const initial: AppControlState = {
      chordToneMode: 'seventh',
      displayMode: 'intervals',
      focusedInterval: 'b7',
      fretboardView: 'position',
      patternMode: 'all',
      pentatonicPosition: 4,
      root: 'G',
      scaleName: 'mixolydian',
      threeNpsPosition: 6,
    }
    assert.match(renderView(initial), /class="selected"[^>]*>Position/)

    const inThreeNps = transitionPatternMode(initial, '3nps')
    assert.equal(renderView(inThreeNps), '')
    assert.deepEqual(inThreeNps, { ...initial, patternMode: '3nps' })
    assert.equal(inThreeNps.fretboardView, 'position')

    const restored = transitionPatternMode(inThreeNps, 'all')
    assert.match(renderView(restored), /class="selected"[^>]*>Position/)
    assert.deepEqual(restored, initial)
  })

  it('preserves the selected pentatonic position through All Notes', () => {
    const initial = {
      ...DEFAULT_APP_CONTROL_STATE,
      patternMode: 'pentatonic' as const,
      pentatonicPosition: 4 as const,
    }

    const allNotes = transitionPatternMode(initial, 'all')
    const restored = transitionPatternMode(allNotes, 'pentatonic')

    assert.equal(allNotes.pentatonicPosition, 4)
    assert.deepEqual(restored, initial)
  })
})
