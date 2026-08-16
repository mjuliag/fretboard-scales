import { createElement } from 'react'

type CanonicalPatternNavigationProps = {
  mode: '3nps' | 'pentatonic'
  onChange: (position: number) => void
  positions: readonly number[]
  selectedPosition: number
}

export function CanonicalPatternNavigation({
  mode,
  onChange,
  positions,
  selectedPosition,
}: CanonicalPatternNavigationProps) {
  const isThreeNps = mode === '3nps'
  const legend = isThreeNps ? '3NPS Position' : 'Shape'
  const ariaPrefix = isThreeNps ? '3NPS position' : 'Pentatonic shape'

  return createElement(
    'fieldset',
    { className: `three-nps-position-control ${isThreeNps ? '' : 'pentatonic-shape-control'}` },
    createElement('legend', null, legend),
    createElement(
      'div',
      null,
      positions.map((position) => createElement(
        'button',
        {
          'aria-label': `${ariaPrefix} ${position}`,
          'aria-pressed': selectedPosition === position,
          className: selectedPosition === position ? 'selected' : '',
          key: position,
          onClick: () => onChange(position),
          type: 'button',
        },
        position,
      )),
    ),
  )
}
