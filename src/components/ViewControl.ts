import { createElement } from 'react'

export type FretboardView = 'full' | 'position'

type ViewControlProps = {
  onChange: (view: FretboardView) => void
  value: FretboardView
  visible: boolean
}

export function ViewControl({ onChange, value, visible }: ViewControlProps) {
  if (!visible) return null

  return createElement(
    'fieldset',
    { className: 'view-control' },
    createElement('legend', null, 'Fretboard Range'),
    createElement(
      'div',
      null,
      createElement(
        'button',
        {
          'aria-pressed': value === 'full',
          className: value === 'full' ? 'selected' : '',
          onClick: () => onChange('full'),
          type: 'button',
        },
        'All Frets',
      ),
      createElement(
        'button',
        {
          'aria-pressed': value === 'position',
          className: value === 'position' ? 'selected' : '',
          onClick: () => onChange('position'),
          type: 'button',
        },
        'Custom Range',
      ),
    ),
  )
}
