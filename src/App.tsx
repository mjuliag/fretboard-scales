import { useState } from 'react'
import { Fretboard, type DisplayMode } from './components/Fretboard'
import {
  getScaleTones,
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
  ionian: 'Ionian',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Aeolian',
  locrian: 'Locrian',
} as const satisfies Record<ScaleName, string>

const SCALE_OPTIONS = Object.keys(SCALE_INTERVALS) as ScaleName[]
const DISPLAY_MODES = ['notes', 'intervals', 'both'] as const

function App() {
  const [instrument, setInstrument] = useState<Instrument>('bass')
  const [root, setRoot] = useState<PitchClass>('A')
  const [scaleName, setScaleName] = useState<ScaleName>('minorPentatonic')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both')
  const [showOtherNotes, setShowOtherNotes] = useState(true)
  const scaleTones = getScaleTones(root, scaleName)

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

        <fieldset className="display-mode-control">
          <legend>Display</legend>
          <div>
            {DISPLAY_MODES.map((mode) => (
              <button
                type="button"
                className={displayMode === mode ? 'selected' : ''}
                aria-pressed={displayMode === mode}
                key={mode}
                onClick={() => setDisplayMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="other-notes-control">
          <input
            type="checkbox"
            checked={showOtherNotes}
            onChange={(event) => setShowOtherNotes(event.target.checked)}
          />
          <span>Show other notes</span>
        </label>
      </section>

      <Fretboard
        displayMode={displayMode}
        instrument={instrument}
        root={root}
        scaleTones={scaleTones}
        showOtherNotes={showOtherNotes}
      />
    </main>
  )
}

export default App
