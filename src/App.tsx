import { useEffect, useRef, useState, type FocusEvent } from 'react'
import {
  playFrequency,
  startFrequencySequence,
} from './audio'
import { Fretboard } from './components/Fretboard'
import { CanonicalPatternNavigation } from './components/CanonicalPatternNavigation'
import { FretboardRangeControl } from './components/FretboardRangeControl'
import { ScaleRelationshipInfo } from './components/ScaleRelationshipInfo'
import { ScaleInfo } from './components/ScaleInfo'
import { PatternModeControl, type PatternMode } from './components/PatternModeControl'
import { isValidFretDraft, parseFretRangeDraft } from './fretRange'
import {
  DEFAULT_APP_CONTROL_STATE,
  normalizePatternModeForScale,
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

  const audioControls = (
    <div className="audio-controls">
      <label className="toggle-control sound-toggle">
        <input type="checkbox" checked={soundEnabled}
          onChange={(event) => setSoundEnabled(event.target.checked)} />
        <span>Sound</span>
      </label>
      {activePatternNotes && (
        <button type="button" className="play-pattern-button"
          disabled={!isPatternPlaying && !isPatternPlaybackAvailable(
            soundEnabled, false, availablePatternPlaybackRoute !== null
              && availablePatternPlaybackRoute.length > 0,
          )}
          onClick={isPatternPlaying ? cancelPatternPlayback : handlePlayPattern}>
          {isPatternPlaying ? 'Stop' : 'Play Pattern'}
        </button>
      )}
    </div>
  )

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Fretboard Scales</h1>
      </header>

      <section className="scale-controls" aria-label="Explore controls">
        <div className="context-section">
          <p className="section-label">Explore</p>
          <div className="context-controls">
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
            <div className="tonal-context-controls">
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
                    const nextScaleName = event.target.value as ScaleName
                    cancelPatternPlayback()
                    setControlState((state) => normalizePatternModeForScale(
                      { ...state, scaleName: nextScaleName },
                      supportsThreeNps(nextScaleName),
                      supportsPentatonicPatterns(nextScaleName),
                    ))
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
            </div>
          </div>
        </div>

        <div className="study-section">
          <p className="section-label">Study</p>
          <div className="study-controls">
            <div className="study-navigation">
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

              {!threeNpsActive && !pentatonicActive && (
                <div className="all-notes-controls">
                <FretboardRangeControl
                  end={positionEnd}
                  endDraft={positionEndDraft}
                  onBlur={handlePositionControlsBlur}
                  onCommit={commitPositionRange}
                  onDraftChange={(boundary, value) => {
                    if (!isValidFretDraft(value)) return
                    if (boundary === 'start') setPositionStartDraft(value)
                    else setPositionEndDraft(value)
                  }}
                  onViewChange={(fretboardView) => updateControlState({ fretboardView })}
                  start={positionStart}
                  startDraft={positionStartDraft}
                  value={fretboardView}
                />
                  {audioControls}
                </div>
              )}

            {threeNpsActive && (
                <CanonicalPatternNavigation
                  mode="3nps"
                  positions={THREE_NPS_POSITIONS}
                  selectedPosition={threeNpsPosition}
                  onChange={(position) => {
                    if (position === threeNpsPosition) return
                    cancelPatternPlayback()
                    updateControlState({ threeNpsPosition: position as typeof threeNpsPosition })
                    setThreeNpsFretShift(0)
                  }}
                />
            )}

            {pentatonicActive && (
                <CanonicalPatternNavigation
                  mode="pentatonic"
                  positions={PENTATONIC_POSITIONS}
                  selectedPosition={pentatonicPosition}
                  onChange={(position) => {
                    if (position === pentatonicPosition) return
                    cancelPatternPlayback()
                    updateControlState({ pentatonicPosition: position as typeof pentatonicPosition })
                  }}
                />
            )}

            {threeNpsPattern && (
                <output className="pattern-summary" aria-live="polite">
                  <strong>{root} {SCALE_LABELS[scaleName]} · 3NPS · Position {threeNpsPosition}</strong>
                  <span>3 notes per string</span>
                </output>
            )}
            {pentatonicPattern && (
                <output className="pattern-summary" aria-live="polite">
                  <strong>{root} {SCALE_LABELS[scaleName]} · Shape {pentatonicPosition}</strong>
                  <span>Canonical pentatonic position</span>
                </output>
            )}
            </div>
            {(threeNpsActive || pentatonicActive) && audioControls}
          </div>
        </div>

        <div className="display-analysis-section">
          <p className="section-label">Display &amp; Analysis</p>
          <div className="display-analysis-controls">
            <fieldset className="display-mode-control">
              <legend>Display</legend>
              <div>
                {DISPLAY_MODES.map((mode) => (
                  <button type="button" className={displayMode === mode ? 'selected' : ''}
                    aria-pressed={displayMode === mode} key={mode}
                    onClick={() => updateControlState({ displayMode: mode })}>{mode}</button>
                ))}
              </div>
            </fieldset>

            <div className="focus-control">
              <label>
                <span>Highlight Degree</span>
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
                <span>Highlight Chord Tones</span>
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
              {showBlueNoteOption && (
                <label className="toggle-control blue-note-toggle">
                  <input type="checkbox" checked={includeBlueNote}
                    onChange={(event) => setIncludeBlueNote(event.target.checked)} />
                  <span>Include blue note</span>
                </label>
              )}
            </div>

            <label className="toggle-control visibility-toggle">
              <input type="checkbox" checked={showOtherNotes}
                onChange={(event) => setShowOtherNotes(event.target.checked)} />
              <span>Show Non-Scale Notes</span>
            </label>
          </div>
          <div className="analysis-feedback">
            {chordToneMode === 'off' && focusedIntervalExists && (
              <output className="focus-status" aria-live="polite">
                Focusing {focusedInterval}
              </output>
            )}
            {chordToneMode === 'off'
              && focusedInterval !== 'all'
              && !focusedIntervalExists && (
              <output className="missing-focus-message" aria-live="polite">
                <span>{focusedInterval} is not part of {root} {SCALE_LABELS[scaleName]}</span>
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
                <strong>Cannot build a complete {chordToneMode} chord from this scale.</strong>
                {chordToneResult.missingDegrees.length > 0 && (
                  <span>Missing degrees: {chordToneResult.missingDegrees.join(', ')}</span>
                )}
                {chordToneResult.ambiguousDegrees.length > 0 && (
                  <span>Ambiguous degrees: {chordToneResult.ambiguousDegrees.join(', ')}</span>
                )}
              </output>
            )}
          </div>
        </div>

      </section>

      <section className="theory-section" aria-label="Contextual theory">
        <ScaleInfo
          intervals={SCALE_INTERVAL_LABELS[scaleName]}
          modeRelationship={modeRelationship}
          root={root}
          scaleLabel={SCALE_LABELS[scaleName]}
          scaleTones={scaleTones}
        />
        {scaleRelationship && (
          <ScaleRelationshipInfo
            destinationLabel={`${scaleRelationship.destinationRoot} ${SCALE_LABELS[scaleRelationship.destinationScale]}`}
            modeRelationship={modeRelationship}
            navigation={scaleRelationship}
            onNavigate={handleScaleRelationshipSwitch}
            sourceLabel={`${root} ${SCALE_LABELS[scaleName]}`}
          />
        )}
      </section>

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
