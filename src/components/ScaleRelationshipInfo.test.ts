import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ScaleRelationshipInfo } from './ScaleRelationshipInfo.ts'
import {
  getModeRelationship,
  getScaleNavigationRelationship,
  type PitchClass,
  type ScaleName,
} from '../music/index.ts'

function renderRelationship(root: PitchClass, scale: ScaleName): string {
  const navigation = getScaleNavigationRelationship(root, scale)
  assert.ok(navigation)
  const destinationScaleLabel = {
    aeolian: 'Aeolian',
    ionian: 'Ionian',
    major: 'Major',
    naturalMinor: 'Natural Minor',
  }[navigation.destinationScale]

  return renderToStaticMarkup(createElement(ScaleRelationshipInfo, {
    destinationLabel: `${navigation.destinationRoot} ${destinationScaleLabel}`,
    modeRelationship: getModeRelationship(root, scale),
    navigation,
    onNavigate: () => {},
    sourceLabel: `${root} ${scale}`,
  }))
}

describe('ScaleRelationshipInfo', () => {
  for (const [root, scale, degree, parent] of [
    ['D', 'dorian', 2, 'C'],
    ['E', 'phrygian', 3, 'C'],
    ['F', 'lydian', 4, 'C'],
    ['G', 'mixolydian', 5, 'C'],
    ['B', 'locrian', 7, 'C'],
    ['A', 'dorian', 2, 'G'],
  ] as const) {
    it(`renders ${root} ${scale} as degree ${degree} of ${parent} Major`, () => {
      const markup = renderRelationship(root, scale)
      assert.match(markup, new RegExp(`${degree}(?:nd|rd|th) mode of ${parent} Major`))
      assert.match(markup, new RegExp(`>View ${parent} Major<\\/button>`))
      assert.match(markup, /Same notes · different tonal center/)
      assert.equal((markup.match(/<button/g) ?? []).length, 1)
    })
  }

  it('shows both Aeolian concepts with one relative navigation action', () => {
    const markup = renderRelationship('A', 'aeolian')
    assert.match(markup, /6th mode of C Major/)
    assert.match(markup, /Relative major: C Ionian/)
    assert.match(markup, />Switch to C Ionian<\/button>/)
    assert.doesNotMatch(markup, />View C Major<\/button>/)
    assert.equal((markup.match(/<button/g) ?? []).length, 1)
  })

  it('keeps Ionian relative-minor navigation without a parent self-switch', () => {
    const markup = renderRelationship('C', 'ionian')
    assert.match(markup, /Relative minor: A Aeolian/)
    assert.match(markup, />Switch to A Aeolian<\/button>/)
    assert.doesNotMatch(markup, />View C Major<\/button>/)
    assert.equal((markup.match(/<button/g) ?? []).length, 1)
  })
})
