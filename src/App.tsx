import { useEffect, useRef, useState, type FocusEvent } from 'react'
import {
  playFrequency,
  startFrequencySequence,
} from './audio'
import { Fretboard } from './components/Fretboard'
import { ScaleRelationshipInfo } from './components/ScaleRelationshipInfo'
import { ScaleInfo } from './components/ScaleInfo'
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
import {
  getPentatonicFretRange,
  getPentatonicPattern,
  PENTATONIC_POSITIONS,
  supportsPentatonicPatterns,
} from './music/pentatonicPatterns'
import { getFretboardPitch, pitchToFrequency } from './music/pitch'
import {
  DEFAULT_SOUND_ENABLED,
  getNotePlaybackHandler,
  isPatternPlaybackAvailable,
  PatternPlaybackSession,
} from './soundState'
import {
  createPatternPlaybackRoute,
  type PatternPlaybackStep,
} from './patternPlayback'
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

function App() {
  const [instrument, setInstrument] = useState<Instrument>('bass')
  const [controlState, setControlState] = useState(DEFAULT_APP_CONTROL_STATE)
  const {
    chordToneMode,
    displayMode,
    focusedInterval,
    fretboardView,
    patternMode,
    pentatonicPosition,
    root,
    scaleName,
    threeNpsPosition,
  } = controlState
  const [showOtherNotes, setShowOtherNotes] = useState(true)
  const [includeBlueNote, setIncludeBlueNote] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(DEFAULT_SOUND_ENABLED)
  const [isPatternPlaying, setIsPatternPlaying] = useState(false)
  const [playingPatternStep, setPlayingPatternStep] = useState<PatternPlaybackStep | null>(null)
  const isMountedRef = useRef(true)
  const patternPlaybackSessionRef = useRef<PatternPlaybackSession | null>(null)
  if (!patternPlaybackSessionRef.current) {
    patternPlaybackSessionRef.current = new PatternPlaybackSession()
  }
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
  const pentatonicSupported = supportsPentatonicPatterns(scaleName)
  const threeNpsActive = patternMode === '3nps' && threeNpsSupported
  const pentatonicActive = patternMode === 'pentatonic' && pentatonicSupported
  const generatedThreeNpsPattern = threeNpsActive
    ? getThreeNpsPattern(root, scaleName, instrument, threeNpsPosition)
    : null
  const threeNpsPattern = generatedThreeNpsPattern
    ? shiftThreeNpsPattern(generatedThreeNpsPattern, threeNpsFretShift)
    : null
  const pentatonicPattern = pentatonicActive
    ? getPentatonicPattern(root, scaleName, instrument, pentatonicPosition)
    : null
  const activePatternNotes = threeNpsPattern?.notes
    ?? pentatonicPattern?.notes
    ?? null
  const fretRange = threeNpsPattern
    ? getThreeNpsFretRange(threeNpsPattern)
    : pentatonicPattern
      ? getPentatonicFretRange(pentatonicPattern)
    : fretboardView === 'full'
      ? FULL_FRET_RANGE
      : { start: positionStart, end: positionEnd }
  const availablePatternPlaybackRoute = activePatternNotes
    ? createPatternPlaybackRoute(instrument, activePatternNotes)
    : null

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      patternPlaybackSessionRef.current?.cancel()
    }
  }, [])

  function cancelPatternPlayback() {
    patternPlaybackSessionRef.current?.cancel()
    patternPlaybackSessionRef.current = new PatternPlaybackSession()
    setPlayingPatternStep(null)
    setIsPatternPlaying(false)
  }

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

      cancelPatternPlayback()
      updateControlState({ threeNpsPosition: equivalentPosition.position })
      setThreeNpsFretShift(equivalentPosition.fretShift)
    } else {
      cancelPatternPlayback()
      setThreeNpsFretShift(0)
    }

    updateControlState({
      root: scaleRelationship.destinationRoot,
      scaleName: scaleRelationship.destinationScale,
    })
  }

  function handlePlayPattern() {
    const route = availablePatternPlaybackRoute
    if (!route?.length) return

    const started = patternPlaybackSessionRef.current?.start(
      soundEnabled,
      (onStep) => startFrequencySequence(
        route.map(({ frequency }) => frequency),
        onStep,
      ),
      (index) => {
        if (isMountedRef.current) {
          setPlayingPatternStep(route[index])
        }
      },
      () => {
        if (isMountedRef.current) {
          setPlayingPatternStep(null)
          setIsPatternPlaying(false)
        }
      },
    )
    if (started) setIsPatternPlaying(true)
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
              onClick={() => {
                if (option.value === instrument) return
                cancelPatternPlayback()
                setInstrument(option.value)
              }}
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
              cancelPatternPlayback()
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
              cancelPatternPlayback()
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
          visible={!threeNpsActive && !pentatonicActive}
        />
        </div>

        <div className="pattern-controls">
          <PatternModeControl
            activeMode={threeNpsActive
              ? '3nps'
              : pentatonicActive
                ? 'pentatonic'
                : 'all'}
            onChange={(nextPatternMode: PatternMode) => {
              if (nextPatternMode === patternMode) return
              cancelPatternPlayback()
              setControlState((state) => transitionPatternMode(state, nextPatternMode))
            }}
            threeNpsSupported={threeNpsSupported}
            pentatonicSupported={pentatonicSupported}
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
                      if (position === threeNpsPosition) return
                      cancelPatternPlayback()
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

          {pentatonicActive && (
            <fieldset className="three-nps-position-control">
              <legend>Pentatonic Pattern</legend>
              <div>
                {PENTATONIC_POSITIONS.map((position) => (
                  <button
                    type="button"
                    className={pentatonicPosition === position ? 'selected' : ''}
                    aria-label={`Pentatonic pattern ${position}`}
                    aria-pressed={pentatonicPosition === position}
                    key={position}
                    onClick={() => {
                      if (position === pentatonicPosition) return
                      cancelPatternPlayback()
                      updateControlState({ pentatonicPosition: position })
                    }}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {!threeNpsSupported && !pentatonicSupported && (
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
            {pentatonicPattern && (
              <output className="three-nps-summary" aria-live="polite">
                <strong>
                  {root} {SCALE_LABELS[scaleName]} · Pattern {pentatonicPosition}
                </strong>
                <span>Canonical pentatonic position</span>
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
          <label className="toggle-control sound-toggle">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            <span>Sound</span>
          </label>
          {activePatternNotes && (
            <button
              type="button"
              className="play-pattern-button"
              disabled={!isPatternPlaying && !isPatternPlaybackAvailable(
                soundEnabled,
                false,
                availablePatternPlaybackRoute !== null
                  && availablePatternPlaybackRoute.length > 0,
              )}
              onClick={isPatternPlaying
                ? cancelPatternPlayback
                : handlePlayPattern}
            >
              {isPatternPlaying ? 'Stop' : 'Play Pattern'}
            </button>
          )}
          </div>
        </div>
      </section>

      <ScaleInfo
        intervals={SCALE_INTERVAL_LABELS[scaleName]}
        modeRelationship={modeRelationship}
        root={root}
        scaleLabel={SCALE_LABELS[scaleName]}
        scaleTones={scaleTones}
      />

      <Fretboard
        activePatternNotes={activePatternNotes}
        blueNoteInterval={showBlueNoteOption && includeBlueNote ? blueNote?.interval : null}
        chordToneIntervals={chordToneIntervals}
        displayMode={displayMode}
        focusedInterval={focusedInterval}
        focusedIntervalExists={chordToneMode === 'off' && focusedIntervalExists}
        fretRange={fretRange}
        instrument={instrument}
        onPlayNote={getNotePlaybackHandler(
          soundEnabled,
          (stringIndex, fret) => {
            const pitch = getFretboardPitch(instrument, stringIndex, fret)
            void playFrequency(pitchToFrequency(pitch))
          },
        )}
        playingCoordinate={playingPatternStep?.instrument === instrument
          ? playingPatternStep.coordinate
          : null}
        root={root}
        scaleTones={scaleTones}
        showOtherNotes={showOtherNotes}
      />
    </main>
  )
}

export default App
