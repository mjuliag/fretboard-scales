import { createElement } from 'react'

export type PatternMode = 'all' | '3nps'

type PatternModeControlProps = {
  activeMode: PatternMode
  onChange: (mode: PatternMode) => void
  threeNpsSupported: boolean
}

export function PatternModeControl({
  activeMode,
  onChange,
  threeNpsSupported,
}: PatternModeControlProps) {
  return createElement(
    'fieldset',
    { className: 'pattern-mode-control' },
    createElement('legend', null, 'Pattern'),
    createElement(
      'div',
      null,
      createElement(
        'button',
        {
          'aria-pressed': activeMode === 'all',
          className: activeMode === 'all' ? 'selected' : '',
          onClick: () => onChange('all'),
          type: 'button',
        },
        'All Notes',
      ),
      createElement(
        'button',
        {
          'aria-pressed': activeMode === '3nps',
          className: activeMode === '3nps' ? 'selected' : '',
          disabled: !threeNpsSupported,
          onClick: () => onChange('3nps'),
          type: 'button',
        },
        '3NPS',
      ),
    ),
  )
}
