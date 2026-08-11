import { createElement } from 'react'

export type PatternMode = 'all' | '3nps' | 'pentatonic'

type PatternModeControlProps = {
  activeMode: PatternMode
  onChange: (mode: PatternMode) => void
  threeNpsSupported: boolean
  pentatonicSupported: boolean
}

export function PatternModeControl({
  activeMode,
  onChange,
  threeNpsSupported,
  pentatonicSupported,
}: PatternModeControlProps) {
  const supportedMode = threeNpsSupported
    ? '3nps'
    : pentatonicSupported
      ? 'pentatonic'
      : '3nps'
  const supported = threeNpsSupported || pentatonicSupported
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
          'aria-pressed': activeMode === supportedMode,
          className: activeMode === supportedMode ? 'selected' : '',
          disabled: !supported,
          onClick: () => onChange(supportedMode),
          type: 'button',
        },
        supportedMode === 'pentatonic' ? 'Pentatonic' : '3NPS',
      ),
    ),
  )
}
