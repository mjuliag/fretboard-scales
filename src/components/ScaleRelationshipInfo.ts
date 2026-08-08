import { createElement } from 'react'
import type {
  ModeRelationship,
  ScaleNavigationRelationship,
} from '../music'

type ScaleRelationshipInfoProps = {
  destinationLabel: string
  modeRelationship: ModeRelationship | null
  navigation: ScaleNavigationRelationship
  onNavigate: () => void
  sourceLabel: string
}

function ordinal(degree: number): string {
  return `${degree}${degree === 1 ? 'st' : degree === 2 ? 'nd' : degree === 3 ? 'rd' : 'th'}`
}

export function ScaleRelationshipInfo({
  destinationLabel,
  modeRelationship,
  navigation,
  onNavigate,
  sourceLabel,
}: ScaleRelationshipInfoProps) {
  const copy = [
    createElement('strong', { key: 'source' }, sourceLabel),
  ]

  if (modeRelationship && modeRelationship.degree > 1) {
    copy.push(createElement(
      'span',
      { key: 'parent' },
      `${ordinal(modeRelationship.degree)} mode of ${modeRelationship.parentRoot} Major`,
    ))
  }

  if (navigation.label !== 'Parent major') {
    copy.push(createElement(
      'span',
      { key: 'navigation' },
      `${navigation.label}: ${destinationLabel}`,
    ))
  }

  copy.push(createElement(
    'small',
    { key: 'shared-notes' },
    'Same notes · different tonal center',
  ))

  return createElement(
    'aside',
    { 'aria-label': 'Scale relationship', className: 'relative-scale-info' },
    createElement('div', { className: 'relative-scale-copy' }, copy),
    createElement(
      'button',
      { onClick: onNavigate, type: 'button' },
      `${navigation.label === 'Parent major' ? 'View' : 'Switch to'} ${destinationLabel}`,
    ),
  )
}
