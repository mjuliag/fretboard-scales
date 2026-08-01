import { useState } from 'react'
import { Fretboard } from './components/Fretboard'
import type { Instrument } from './music'
import './App.css'

const INSTRUMENT_OPTIONS = [
  { value: 'guitar', label: 'Guitar' },
  { value: 'bass', label: 'Bass' },
] as const satisfies readonly { value: Instrument; label: string }[]

function App() {
  const [instrument, setInstrument] = useState<Instrument>('bass')

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Fretboard Scales</h1>

        <div className="instrument-selector" aria-label="Select instrument">
          {INSTRUMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={instrument === option.value ? 'selected' : ''}
              aria-pressed={instrument === option.value}
              onClick={() => setInstrument(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <Fretboard instrument={instrument} />
    </main>
  )
}

export default App
