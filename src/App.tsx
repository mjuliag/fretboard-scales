import { useState } from 'react'
import { Fretboard } from './components/Fretboard'
import {
  getScale,
  PITCH_CLASSES,
  SCALE_INTERVALS,
  type Instrument,
  type PitchClass,
  type ScaleName,
} from './music'
import './App.css'

const INSTRUMENT_OPTIONS = [
  { value: 'guitar', label: 'Guitar' },
  { value: 'bass', label: 'Bass' },
] as const satisfies readonly { value: Instrument; label: string }[]

const SCALE_LABELS = {
  major: 'Major',
  naturalMinor: 'Natural Minor',
  majorPentatonic: 'Major Pentatonic',
  minorPentatonic: 'Minor Pentatonic',
  blues: 'Blues',
} as const satisfies Record<ScaleName, string>

const SCALE_OPTIONS = Object.keys(SCALE_INTERVALS) as ScaleName[]

function App() {
  const [instrument, setInstrument] = useState<Instrument>('bass')
  const [root, setRoot] = useState<PitchClass>('A')
  const [scaleName, setScaleName] = useState<ScaleName>('minorPentatonic')
  const selectedScale = getScale(root, scaleName)

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

      <section className="scale-controls" aria-label="Scale selection">
        <label>
          <span>Root</span>
          <select
            value={root}
            onChange={(event) => setRoot(event.target.value as PitchClass)}
          >
            {PITCH_CLASSES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Scale</span>
          <select
            value={scaleName}
            onChange={(event) => setScaleName(event.target.value as ScaleName)}
          >
            {SCALE_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {SCALE_LABELS[name]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <Fretboard
        instrument={instrument}
        root={root}
        scaleNotes={selectedScale}
      />
    </main>
  )
}

export default App
