import { useState, type FocusEvent } from 'react'
import { Fretboard } from './components/Fretboard'
import { ScaleRelationshipInfo } from './components/ScaleRelationshipInfo'
import { ViewControl } from './components/ViewControl'
import { PatternModeControl, type PatternMode } from './components/PatternModeControl'
import { isValidFretDraft, parseFretRangeDraft } from './fretRange'
import {
  DEFAULT_APP_CONTROL_STATE,
  transitionPatternMode,
  type AppControlState,
  type IntervalFocus,
} from './appControlState'
import {
  getModeRelationship,
  getChordTones,
  getScaleNavigationRelationship,
  getScaleTones,
  PITCH_CLASSES,
  SCALE_INTERVAL_LABELS,
  SCALE_INTERVALS,
  type Instrument,
  type ChordToneMode,
  type PitchClass,
  type ScaleName,
} from './music'
import {
  findEquivalentThreeNpsPosition,
  getThreeNpsFretRange,
  getThreeNpsPattern,
  shiftThreeNpsPattern,
  supportsThreeNps,
  THREE_NPS_POSITIONS,
} from './music/threeNps'
import './App.css'

const INSTRUMENT_OPTIONS = [
  { value: 'guitar', label: 'Guitar', stringCount: 6 },
  { value: 'bass', label: 'Bass', stringCount: 4 },
] as const satisfies readonly {
  value: Instrument
  label: string
  stringCount: number
}[]

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
const CHORD_TONE_MODES = ['off', 'triad', 'seventh'] as const
const FULL_FRET_RANGE = { start: 0, end: 24 } as const

function ordinal(degree: number): string {
  return `${degree}${degree === 1 ? 'st' : degree === 2 ? 'nd' : degree === 3 ? 'rd' : 'th'}`
}

function App() {
  const [instrument, setInstrument] = useState<Instrument>('bass')
  const [controlState, setControlState] = useState(DEFAULT_APP_CONTROL_STATE)
  const {
    chordToneMode,
    displayMode,
    focusedInterval,
    fretboardView,
    patternMode,
    root,
    scaleName,
    threeNpsPosition,
  } = controlState
  const [showOtherNotes, setShowOtherNotes] = useState(true)
  const [includeBlueNote, setIncludeBlueNote] = useState(false)
  const [positionStart, setPositionStart] = useState(5)
  const [positionEnd, setPositionEnd] = useState(9)
  const [positionStartDraft, setPositionStartDraft] = useState('5')
  const [positionEndDraft, setPositionEndDraft] = useState('9')
  const [threeNpsFretShift, setThreeNpsFretShift] = useState<-12 | 0 | 12>(0)
  const scaleTones = getScaleTones(root, scaleName)
  const chordToneResult = chordToneMode === 'off'
    ? null
    : getChordTones(scaleTones, chordToneMode, scaleName)
  const chordToneIntervals = chordToneResult?.supported
    ? chordToneResult.tones.map(({ interval }) => interval)
    : null
  const blueNote = scaleName === 'blues'
    ? scaleTones.find(({ interval }) => interval === 'b5')
    : undefined
  const showBlueNoteOption = scaleName === 'blues'
    && chordToneMode !== 'off'
  const focusOptions = scaleTones.map(({ interval }) => interval)
  const focusedIntervalExists = focusedInterval !== 'all'
    && focusOptions.some((interval) => interval === focusedInterval)
  const modeRelationship = getModeRelationship(root, scaleName)
  const scaleRelationship = getScaleNavigationRelationship(root, scaleName)
  const threeNpsSupported = supportsThreeNps(scaleName)
  const threeNpsActive = patternMode === '3nps' && threeNpsSupported
  const generatedThreeNpsPattern = threeNpsActive
    ? getThreeNpsPattern(root, scaleName, instrument, threeNpsPosition)
    : null
  const threeNpsPattern = generatedThreeNpsPattern
    ? shiftThreeNpsPattern(generatedThreeNpsPattern, threeNpsFretShift)
    : null
  const fretRange = threeNpsPattern
    ? getThreeNpsFretRange(threeNpsPattern)
    : fretboardView === 'full'
      ? FULL_FRET_RANGE
      : { start: positionStart, end: positionEnd }

  function updateControlState(patch: Partial<AppControlState>) {
    setControlState((state) => ({ ...state, ...patch }))
  }

  function commitPositionRange() {
    const nextRange = parseFretRangeDraft(
      positionStartDraft,
      positionEndDraft,
    )

    if (!nextRange) return

    setPositionStart(nextRange.start)
    setPositionEnd(nextRange.end)
    setPositionStartDraft(String(nextRange.start))
    setPositionEndDraft(String(nextRange.end))
  }

  function handlePositionControlsBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      commitPositionRange()
    }
  }

  function handleScaleRelationshipSwitch() {
    if (!scaleRelationship) return

    if (threeNpsActive && threeNpsPattern) {
      const equivalentPosition = findEquivalentThreeNpsPosition(
        threeNpsPattern,
        scaleRelationship.destinationRoot,
        scaleRelationship.destinationScale,
        instrument,
      )

      if (!equivalentPosition) return

      updateControlState({ threeNpsPosition: equivalentPosition.position })
      setThreeNpsFretShift(equivalentPosition.fretShift)
    } else {
      setThreeNpsFretShift(0)
    }

    updateControlState({
      root: scaleRelationship.destinationRoot,
      scaleName: scaleRelationship.destinationScale,
    })
  }

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
              <span
                className="instrument-string-icon"
                data-string-count={option.stringCount}
                aria-hidden="true"
              >
                {Array.from({ length: option.stringCount }, (_, index) => (
                  <i key={index} />
                ))}
                <span className="instrument-fret instrument-fret-one" />
                <span className="instrument-fret instrument-fret-two" />
                <span className="instrument-note-marker instrument-note-one" />
                <span className="instrument-note-marker instrument-note-two" />
                <span className="instrument-note-marker instrument-note-three" />
              </span>
              <span className="instrument-label">
                <strong>{option.label}</strong>
                <small>{option.stringCount} strings</small>
              </span>
            </button>
          ))}
        </div>
      </header>

      <section className="scale-controls" aria-label="Scale selection">
        <div className="primary-controls">
        <label>
          <span>Root</span>
          <select
            value={root}
            onChange={(event) => {
              updateControlState({ root: event.target.value as PitchClass })
              setThreeNpsFretShift(0)
            }}
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
            onChange={(event) => {
              updateControlState({ scaleName: event.target.value as ScaleName })
              setThreeNpsFretShift(0)
            }}
          >
            {SCALE_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {SCALE_LABELS[name]}
              </option>
            ))}
          </select>
        </label>

        <div className="focus-control">
          <label>
            <span>Focus interval</span>
            <select
              value={focusedInterval}
              disabled={chordToneMode !== 'off'}
              aria-describedby={chordToneMode !== 'off' ? 'focus-disabled-reason' : undefined}
              onChange={(event) => {
                updateControlState({ focusedInterval: event.target.value as IntervalFocus })
              }}
            >
              <option value="all">All</option>
              {focusedInterval !== 'all' && !focusedIntervalExists && (
                <option value={focusedInterval}>{focusedInterval}</option>
              )}
              {focusOptions.map((interval) => (
                <option key={interval} value={interval}>
                  {interval}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="chord-tone-control">
          <label>
            <span>Chord tones</span>
            <select
              value={chordToneMode}
              onChange={(event) => {
                updateControlState({ chordToneMode: event.target.value as ChordToneMode })
              }}
            >
              {CHORD_TONE_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode[0].toUpperCase() + mode.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="display-mode-control">
          <legend>Display</legend>
          <div>
            {DISPLAY_MODES.map((mode) => (
              <button
                type="button"
                className={displayMode === mode ? 'selected' : ''}
                aria-pressed={displayMode === mode}
                key={mode}
                onClick={() => updateControlState({ displayMode: mode })}
              >
                {mode}
              </button>
            ))}
          </div>
        </fieldset>

        <ViewControl
          onChange={(fretboardView) => updateControlState({ fretboardView })}
          value={fretboardView}
          visible={!threeNpsActive}
        />
        </div>

        <div className="pattern-controls">
          <PatternModeControl
            activeMode={threeNpsActive ? '3nps' : 'all'}
            onChange={(nextPatternMode: PatternMode) => {
              setControlState((state) => transitionPatternMode(state, nextPatternMode))
            }}
            threeNpsSupported={threeNpsSupported}
          />

          {threeNpsActive && (
            <fieldset className="three-nps-position-control">
              <legend>3NPS Position</legend>
              <div>
                {THREE_NPS_POSITIONS.map((position) => (
                  <button
                    type="button"
                    className={threeNpsPosition === position ? 'selected' : ''}
                    aria-label={`3NPS position ${position}`}
                    aria-pressed={threeNpsPosition === position}
                    key={position}
                    onClick={() => {
                      updateControlState({ threeNpsPosition: position })
                      setThreeNpsFretShift(0)
                    }}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {!threeNpsSupported && (
            <p className="pattern-availability">
              Classic 3NPS is available for seven-note scales and modes.
            </p>
          )}
        </div>

        <div className="secondary-controls">
          <div className="learning-context">
            {scaleRelationship && (
              <ScaleRelationshipInfo
                destinationLabel={`${scaleRelationship.destinationRoot} ${SCALE_LABELS[scaleRelationship.destinationScale]}`}
                modeRelationship={modeRelationship}
                navigation={scaleRelationship}
                onNavigate={handleScaleRelationshipSwitch}
                sourceLabel={`${root} ${SCALE_LABELS[scaleName]}`}
              />
            )}
            {threeNpsPattern && (
              <output className="three-nps-summary" aria-live="polite">
                <strong>
                  {root} {SCALE_LABELS[scaleName]} · 3NPS · Position {threeNpsPosition}
                </strong>
                <span>3 notes per string</span>
              </output>
            )}
            {chordToneMode === 'off' && focusedIntervalExists && (
              <output className="focus-status" aria-live="polite">
                Focusing {focusedInterval}
              </output>
            )}
            {chordToneMode === 'off'
              && focusedInterval !== 'all'
              && !focusedIntervalExists && (
              <output className="missing-focus-message" aria-live="polite">
                <span>
                  {focusedInterval} is not part of {root} {SCALE_LABELS[scaleName]}
                </span>
                <span>Scale intervals: {focusOptions.join(' · ')}</span>
              </output>
            )}
            {chordToneMode !== 'off' && chordToneResult?.supported && (
              <output className="chord-tone-summary" aria-live="polite">
                <span className="active-state-badge" id="focus-disabled-reason">
                  Chord tones active
                </span>
                <strong>
                  {root} {SCALE_LABELS[scaleName]} ·{' '}
                  {chordToneMode[0].toUpperCase() + chordToneMode.slice(1)}
                </strong>
                <span>{chordToneResult.tones.map(({ interval }) => interval).join(' · ')}</span>
                <span>{chordToneResult.tones.map(({ note }) => note).join(' · ')}</span>
                {scaleName === 'blues' && blueNote && (
                  <span className="blue-note-explanation">
                    Blue note: {blueNote.interval} ({blueNote.note})<br />
                    The perfect 5 is the chord tone; b5 is a blues color tone.
                  </span>
                )}
              </output>
            )}
            {chordToneMode !== 'off' && chordToneResult && !chordToneResult.supported && (
              <output className="chord-tone-summary chord-tone-error" aria-live="polite">
                <span className="active-state-badge" id="focus-disabled-reason">
                  Chord tones active
                </span>
                <strong>
                  Cannot build a complete {chordToneMode} chord from this scale.
                </strong>
                {chordToneResult.missingDegrees.length > 0 && (
                  <span>Missing degrees: {chordToneResult.missingDegrees.join(', ')}</span>
                )}
                {chordToneResult.ambiguousDegrees.length > 0 && (
                  <span>Ambiguous degrees: {chordToneResult.ambiguousDegrees.join(', ')}</span>
                )}
              </output>
            )}
            {showBlueNoteOption && (
              <label className="toggle-control">
                <input
                  type="checkbox"
                  checked={includeBlueNote}
                  onChange={(event) => setIncludeBlueNote(event.target.checked)}
                />
                <span>Include blue note</span>
              </label>
            )}
          </div>

          <div className="fretboard-context-controls">
          {fretboardView === 'position' && (
            <div className="position-controls" onBlur={handlePositionControlsBlur}>
            <label>
              <span>Start fret</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={positionStartDraft}
                onChange={(event) => {
                  if (isValidFretDraft(event.target.value)) {
                    setPositionStartDraft(event.target.value)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitPositionRange()
                }}
              />
            </label>
            <label>
              <span>End fret</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={positionEndDraft}
                onChange={(event) => {
                  if (isValidFretDraft(event.target.value)) {
                    setPositionEndDraft(event.target.value)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitPositionRange()
                }}
              />
            </label>
            <output aria-live="polite">Frets {positionStart}–{positionEnd}</output>
            </div>
          )}

          <label className="toggle-control visibility-toggle">
            <input
              type="checkbox"
              checked={showOtherNotes}
              onChange={(event) => setShowOtherNotes(event.target.checked)}
            />
            <span>Show other notes</span>
          </label>
          </div>
        </div>
      </section>

      {modeRelationship && (
        <aside className="mode-info" aria-label="Mode relationship">
          <div className="mode-info-heading">
            <strong>
              {root} {SCALE_LABELS[scaleName]}
            </strong>
            <span>
              {ordinal(modeRelationship.degree)} mode of{' '}
              {modeRelationship.parentRoot} Major
            </span>
          </div>
          <p className="mode-formula" aria-label="Interval formula">
            {SCALE_INTERVAL_LABELS[scaleName].join(' · ')}
          </p>
          <p>
            Uses the same notes as {modeRelationship.parentRoot} Major, with{' '}
            {root} as the tonal center.
          </p>
        </aside>
      )}

      <Fretboard
        activePatternNotes={threeNpsPattern?.notes ?? null}
        blueNoteInterval={showBlueNoteOption && includeBlueNote ? blueNote?.interval : null}
        chordToneIntervals={chordToneIntervals}
        displayMode={displayMode}
        focusedInterval={focusedInterval}
        focusedIntervalExists={chordToneMode === 'off' && focusedIntervalExists}
        fretRange={fretRange}
        instrument={instrument}
        root={root}
        scaleTones={scaleTones}
        showOtherNotes={showOtherNotes}
      />
    </main>
  )
}

export default App
