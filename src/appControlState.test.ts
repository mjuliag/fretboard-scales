import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  DEFAULT_APP_CONTROL_STATE,
  normalizePatternModeForScale,
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
  it('preserves Custom Range and all unrelated App state through 3NPS and back', () => {
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
    assert.match(renderView(initial), /class="selected"[^>]*>Custom Range/)

    const inThreeNps = transitionPatternMode(initial, '3nps')
    assert.equal(renderView(inThreeNps), '')
    assert.deepEqual(inThreeNps, { ...initial, patternMode: '3nps' })
    assert.equal(inThreeNps.fretboardView, 'position')

    const restored = transitionPatternMode(inThreeNps, 'all')
    assert.match(renderView(restored), /class="selected"[^>]*>Custom Range/)
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

  it('resets incompatible 3NPS without forgetting its position', () => {
    const inThreeNps = {
      ...DEFAULT_APP_CONTROL_STATE,
      patternMode: '3nps' as const,
      scaleName: 'major' as const,
      threeNpsPosition: 6 as const,
    }

    const onBlues = normalizePatternModeForScale(
      { ...inThreeNps, scaleName: 'blues' },
      false,
      false,
    )
    const backOnMajor = normalizePatternModeForScale(
      { ...onBlues, scaleName: 'major' },
      true,
      false,
    )

    assert.equal(onBlues.patternMode, 'all')
    assert.equal(backOnMajor.patternMode, 'all')
    assert.equal(backOnMajor.threeNpsPosition, 6)
    assert.equal(transitionPatternMode(backOnMajor, '3nps').threeNpsPosition, 6)
  })

  it('resets incompatible Pentatonic without forgetting its shape', () => {
    const inPentatonic = {
      ...DEFAULT_APP_CONTROL_STATE,
      patternMode: 'pentatonic' as const,
      pentatonicPosition: 4 as const,
    }
    const onMajor = normalizePatternModeForScale(
      { ...inPentatonic, scaleName: 'major' },
      true,
      false,
    )

    assert.equal(onMajor.patternMode, 'all')
    assert.equal(onMajor.pentatonicPosition, 4)
    assert.equal(transitionPatternMode(onMajor, 'pentatonic').pentatonicPosition, 4)
  })
})
