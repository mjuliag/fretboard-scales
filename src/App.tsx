import { useState } from 'react'
import './App.css'

type Instrument = 'Guitar' | 'Bass'

function App() {
  const [instrument, setInstrument] = useState<Instrument>('Bass')

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Fretboard Scales</h1>

        <div className="instrument-selector" aria-label="Select instrument">
          {(['Guitar', 'Bass'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={instrument === option ? 'selected' : ''}
              aria-pressed={instrument === option}
              onClick={() => setInstrument(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </header>
    </main>
  )
}

export default App
