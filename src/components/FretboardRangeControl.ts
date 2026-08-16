import { createElement, type FocusEvent, type KeyboardEvent } from 'react'
import { ViewControl, type FretboardView } from './ViewControl.ts'

type FretboardRangeControlProps = {
  end: number
  endDraft: string
  onBlur: (event: FocusEvent<HTMLDivElement>) => void
  onCommit: () => void
  onDraftChange: (boundary: 'start' | 'end', value: string) => void
  onViewChange: (view: FretboardView) => void
  start: number
  startDraft: string
  value: FretboardView
}

export function FretboardRangeControl({
  end,
  endDraft,
  onBlur,
  onCommit,
  onDraftChange,
  onViewChange,
  start,
  startDraft,
  value,
}: FretboardRangeControlProps) {
  function rangeInput(boundary: 'start' | 'end', draft: string) {
    const label = boundary === 'start' ? 'Start fret' : 'End fret'
    return createElement(
      'label',
      null,
      createElement('span', null, label),
      createElement('input', {
        inputMode: 'numeric',
        onChange: (event: { target: { value: string } }) => onDraftChange(boundary, event.target.value),
        onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') onCommit()
        },
        pattern: '[0-9]*',
        type: 'text',
        value: draft,
      }),
    )
  }

  return createElement(
    'div',
    { className: 'fretboard-range-controls' },
    createElement(ViewControl, { onChange: onViewChange, value, visible: true }),
    value === 'position' && createElement(
      'div',
      { className: 'position-controls', onBlur },
      rangeInput('start', startDraft),
      rangeInput('end', endDraft),
      createElement('output', { 'aria-live': 'polite' }, `Frets ${start}–${end}`),
    ),
  )
}
