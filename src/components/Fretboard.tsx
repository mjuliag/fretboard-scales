import type { CSSProperties } from 'react'
import {
  getNoteAtFret,
  STANDARD_TUNINGS,
  type Instrument,
  type IntervalLabel,
  type PitchClass,
  type ScaleTone,
} from '../music/index.ts'
import { getFretboardPitch } from '../music/pitch.ts'
import {
  isFretboardCoordinate,
  type FretboardCoordinate,
} from '../music/fretboardPosition.ts'
import {
  formatIntervalLabel,
  type PracticePosition,
} from '../practiceMode.ts'

const SINGLE_MARKER_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21])
const DOUBLE_MARKER_FRETS = new Set([12, 24])

export type DisplayMode = 'notes' | 'intervals' | 'both'

export type FretboardPresentation =
  | { mode: 'explore' }
  | {
      correctCoordinates: readonly FretboardCoordinate[]
      mode: 'practice'
      onSelect: (coordinate: FretboardCoordinate) => void
      phase: 'unanswered' | 'answered'
      positions: readonly PracticePosition[]
      selectedCoordinate: FretboardCoordinate | null
    }

type FretboardProps = {
  activePatternNotes: readonly { fret: number; stringIndex: number }[] | null
  blueNoteInterval: IntervalLabel | null | undefined
  chordToneIntervals: readonly IntervalLabel[] | null
  displayMode: DisplayMode
  focusedInterval: 'all' | IntervalLabel
  focusedIntervalExists: boolean
  fretRange: {
    start: number
    end: number
  }
  instrument: Instrument
  onPositionSelect?: (coordinate: FretboardCoordinate) => void
  playingCoordinate: FretboardCoordinate | null
  presentation?: FretboardPresentation
  root: PitchClass
  scaleTones: readonly ScaleTone[]
  showOtherNotes: boolean
}

function FretMarker({ fret }: { fret: number }) {
  const markerCount = DOUBLE_MARKER_FRETS.has(fret)
    ? 2
    : Number(SINGLE_MARKER_FRETS.has(fret))

  if (markerCount === 0) return null

  return (
    <span className="fret-marker" aria-hidden="true">
      {Array.from({ length: markerCount }, (_, index) => (
        <span className="fret-marker-dot" key={index} />
      ))}
    </span>
  )
}

export function Fretboard({
  activePatternNotes,
  blueNoteInterval,
  chordToneIntervals,
  displayMode,
  focusedInterval,
  focusedIntervalExists,
  fretRange,
  instrument,
  onPositionSelect,
  playingCoordinate,
  presentation = { mode: 'explore' },
  root,
  scaleTones,
  showOtherNotes,
}: FretboardProps) {
  const frets = Array.from(
    { length: fretRange.end - fretRange.start + 1 },
    (_, index) => fretRange.start + index,
  )
  const tuning = STANDARD_TUNINGS[instrument]
  const stringsFromHighToLow = tuning.toReversed()
  const intervalsByNote = new Map(
    scaleTones.map(({ note, interval }) => [note, interval]),
  )
  const chordToneIntervalSet = chordToneIntervals
    ? new Set(chordToneIntervals)
    : null
  const activePatternCoordinates = activePatternNotes
    ? new Set(activePatternNotes.map(
      ({ fret, stringIndex }) => `${stringIndex}:${fret}`,
    ))
    : null
  const practicePositions = presentation.mode === 'practice'
    ? new Map(presentation.positions.map((position) => [
        `${position.coordinate.stringIndex}:${position.coordinate.fret}`,
        position,
      ]))
    : null
  const practiceCorrectCoordinates = presentation.mode === 'practice'
    ? new Set(presentation.correctCoordinates.map(
        ({ stringIndex, fret }) => `${stringIndex}:${fret}`,
      ))
    : null

  return (
    <section className="fretboard-section" aria-labelledby="fretboard-title">
      <div className="fretboard-heading">
        <h2 id="fretboard-title">{instrument} fretboard</h2>
        {presentation.mode === 'explore' && (
        <div className="note-legend" aria-label="Note colors">
          <span><i className="legend-swatch root-note" />Root</span>
          <span><i className="legend-swatch scale-note" />Scale note</span>
          {chordToneIntervals && (
            <span><i className="legend-swatch chord-tone" />Chord tone</span>
          )}
          {blueNoteInterval && (
            <span><i className="legend-swatch blue-note" />Blue note</span>
          )}
          {showOtherNotes && (
            <span><i className="legend-swatch other-note" />Other note</span>
          )}
        </div>
        )}
      </div>

      <div className="fretboard-scroll" tabIndex={0}>
        <table className="fretboard">
          <thead>
            <tr>
              {frets.map((fret) => (
                <th
                  className={fret === 0 ? 'open-fret' : undefined}
                  key={fret}
                  scope="col"
                >
                  <span className="fret-number">{fret}</span>
                  <FretMarker fret={fret} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stringsFromHighToLow.map((openString, stringIndex) => {
              const tuningStringIndex = tuning.length - stringIndex - 1
              const stringThickness = 1 + stringIndex * 0.7
              const rowStyle = {
                '--string-thickness': `${stringThickness}px`,
              } as CSSProperties

              return (
                <tr key={`${openString}-${stringIndex}`} style={rowStyle}>
                  {frets.map((fret) => {
                    const coordinate = { stringIndex: tuningStringIndex, fret }
                    const coordinateKey = `${tuningStringIndex}:${fret}`
                    const practicePosition = practicePositions?.get(coordinateKey)
                    if (presentation.mode === 'practice' && !practicePosition) {
                      return (
                        <td
                          className={fret === 0 ? 'open-fret' : undefined}
                          key={fret}
                        />
                      )
                    }

                    const note = getNoteAtFret(openString, fret)
                    const isActivePatternCoordinate = !activePatternCoordinates
                      || activePatternCoordinates.has(`${tuningStringIndex}:${fret}`)
                    const interval = isActivePatternCoordinate
                      ? intervalsByNote.get(note)
                      : undefined
                    const noteType = note === root && interval
                      ? 'root-note'
                      : interval
                        ? 'scale-note'
                        : 'other-note'
                    const showNoteName = !interval || displayMode !== 'intervals'
                    const showInterval = interval && displayMode !== 'notes'
                    const isHidden = !interval && !showOtherNotes
                    const isFocused = focusedIntervalExists
                      && interval === focusedInterval
                    const isSubdued = focusedIntervalExists
                      && Boolean(interval)
                      && !isFocused
                    const focusClass = isFocused
                      ? ' focused-note'
                      : isSubdued
                        ? ' subdued-note'
                        : ''
                    const isChordTone = Boolean(
                      interval && chordToneIntervalSet?.has(interval),
                    )
                    const chordToneClass = chordToneIntervalSet && interval
                      ? isChordTone
                        ? ' chord-tone'
                        : ' subdued-note'
                      : ''
                    const blueNoteClass = interval === blueNoteInterval
                      ? ' blue-note'
                      : ''
                    const physicalPitch = onPositionSelect
                      ? getFretboardPitch(instrument, tuningStringIndex, fret)
                      : null
                    const playingClass = isFretboardCoordinate(
                      playingCoordinate,
                      tuningStringIndex,
                      fret,
                    )
                      ? ' playing-note'
                      : ''

                    if (presentation.mode === 'practice' && practicePosition) {
                      const isAnswered = presentation.phase === 'answered'
                      const isSelected = isFretboardCoordinate(
                        presentation.selectedCoordinate,
                        tuningStringIndex,
                        fret,
                      )
                      const isCorrect = Boolean(
                        practiceCorrectCoordinates?.has(coordinateKey),
                      )
                      const reveal = isAnswered && (isSelected || isCorrect)
                      const resultClass = !isAnswered
                        ? ''
                        : isCorrect
                          ? ' practice-correct'
                          : isSelected
                            ? ' practice-incorrect'
                            : ''
                      const selectedClass = isSelected
                        ? ' practice-selected'
                        : ''
                      const practiceStringNumber = tuning.length - tuningStringIndex
                      const accessibleLabel = reveal
                        ? `${practicePosition.note}, ${formatIntervalLabel(practicePosition.interval)}, string ${practiceStringNumber}, fret ${fret}`
                        : `Select string ${practiceStringNumber}, fret ${fret}`

                      return (
                        <td
                          className={fret === 0 ? 'open-fret' : undefined}
                          key={fret}
                        >
                          <button
                            type="button"
                            className={`note playable-note practice-candidate${selectedClass}${resultClass}`}
                            aria-label={accessibleLabel}
                            onClick={() => presentation.onSelect(coordinate)}
                          >
                            {reveal && (
                              <>
                                <span className="note-name">{practicePosition.note}</span>
                                <span className="interval-label">
                                  {formatIntervalLabel(practicePosition.interval)}
                                </span>
                              </>
                            )}
                          </button>
                        </td>
                      )
                    }

                    return (
                      <td
                        className={fret === 0 ? 'open-fret' : undefined}
                        key={fret}
                      >
                        {onPositionSelect && physicalPitch
                          ? (
                              <button
                                type="button"
                                className={`note playable-note ${noteType}${focusClass}${chordToneClass}${blueNoteClass}${playingClass}${isHidden ? ' hidden-note' : ''}`}
                                aria-label={`${physicalPitch.pitchClass}${physicalPitch.octave}, string ${tuningStringIndex + 1}, fret ${fret}`}
                                onClick={() => onPositionSelect(coordinate)}
                              >
                                {showNoteName && <span className="note-name">{note}</span>}
                                {showInterval && (
                                  <span className="interval-label">{interval}</span>
                                )}
                              </button>
                            )
                          : (
                              <span
                                className={`note ${noteType}${focusClass}${chordToneClass}${blueNoteClass}${playingClass}${isHidden ? ' hidden-note' : ''}`}
                              >
                                {showNoteName && <span className="note-name">{note}</span>}
                                {showInterval && (
                                  <span className="interval-label">{interval}</span>
                                )}
                              </span>
                            )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
