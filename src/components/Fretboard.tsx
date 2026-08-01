import type { CSSProperties } from 'react'
import {
  getNoteAtFret,
  STANDARD_TUNINGS,
  type Instrument,
  type PitchClass,
} from '../music'

const FRETS = Array.from({ length: 25 }, (_, fret) => fret)
const SINGLE_MARKER_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21])
const DOUBLE_MARKER_FRETS = new Set([12, 24])

type FretboardProps = {
  instrument: Instrument
  root: PitchClass
  scaleNotes: readonly PitchClass[]
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

export function Fretboard({ instrument, root, scaleNotes }: FretboardProps) {
  const tuning = STANDARD_TUNINGS[instrument]
  const scaleNoteSet = new Set(scaleNotes)

  return (
    <section className="fretboard-section" aria-labelledby="fretboard-title">
      <div className="fretboard-heading">
        <h2 id="fretboard-title">{instrument} fretboard</h2>
        <div className="note-legend" aria-label="Note colors">
          <span><i className="legend-swatch root-note" />Root</span>
          <span><i className="legend-swatch scale-note" />Scale note</span>
          <span><i className="legend-swatch other-note" />Other note</span>
        </div>
      </div>

      <div className="fretboard-scroll" tabIndex={0}>
        <table className="fretboard">
          <thead>
            <tr>
              {FRETS.map((fret) => (
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
            {tuning.map((openString, stringIndex) => {
              const stringThickness = 1 + (tuning.length - stringIndex - 1) * 0.7
              const rowStyle = {
                '--string-thickness': `${stringThickness}px`,
              } as CSSProperties

              return (
                <tr key={`${openString}-${stringIndex}`} style={rowStyle}>
                  {FRETS.map((fret) => {
                    const note = getNoteAtFret(openString, fret)
                    const noteType = note === root
                      ? 'root-note'
                      : scaleNoteSet.has(note)
                        ? 'scale-note'
                        : 'other-note'

                    return (
                      <td
                        className={fret === 0 ? 'open-fret' : undefined}
                        key={fret}
                      >
                        <span className={`note ${noteType}`}>{note}</span>
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
