import { createElement } from 'react'
import type {
  IntervalLabel,
  ModeRelationship,
  PitchClass,
  ScaleTone,
} from '../music'

type ScaleInfoProps = {
  intervals: readonly IntervalLabel[]
  modeRelationship: ModeRelationship | null
  root: PitchClass
  scaleLabel: string
  scaleTones: readonly ScaleTone[]
}

function ordinal(degree: number): string {
  return `${degree}${degree === 1 ? 'st' : degree === 2 ? 'nd' : degree === 3 ? 'rd' : 'th'}`
}

export function ScaleInfo({
  intervals,
  modeRelationship,
  root,
  scaleLabel,
  scaleTones,
}: ScaleInfoProps) {
  return createElement(
    'aside',
    { 'aria-label': 'Scale information', className: 'mode-info' },
    createElement(
      'div',
      { className: 'mode-info-heading' },
      createElement('strong', null, `${root} ${scaleLabel}`),
      modeRelationship && createElement(
        'span',
        null,
        `${ordinal(modeRelationship.degree)} mode of ${modeRelationship.parentRoot} Major`,
      ),
    ),
    createElement(
      'div',
      { className: 'scale-info-details' },
      createElement(
        'p',
        { 'aria-label': 'Interval formula', className: 'mode-formula' },
        intervals.join(' · '),
      ),
      createElement(
        'p',
        { 'aria-label': 'Scale notes', className: 'scale-note-list' },
        scaleTones.map(({ note }) => note).join(' · '),
      ),
      modeRelationship && createElement(
        'p',
        null,
        `Uses the same notes as ${modeRelationship.parentRoot} Major, with ${root} as the tonal center.`,
      ),
    ),
  )
}
