import {
  getNoteAtFret,
  STANDARD_TUNINGS,
  type Instrument,
} from '../music'

const FRETS = Array.from({ length: 25 }, (_, fret) => fret)
const SINGLE_MARKER_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21])
const DOUBLE_MARKER_FRETS = new Set([12, 24])

type FretboardProps = {
  instrument: Instrument
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

export function Fretboard({ instrument }: FretboardProps) {
  const tuning = STANDARD_TUNINGS[instrument]

  return (
    <section className="fretboard-section" aria-labelledby="fretboard-title">
      <h2 id="fretboard-title">{instrument} fretboard</h2>

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
            {tuning.map((openString, stringIndex) => (
              <tr key={`${openString}-${stringIndex}`}>
                {FRETS.map((fret) => (
                  <td className={fret === 0 ? 'open-fret' : undefined} key={fret}>
                    <span className="note">{getNoteAtFret(openString, fret)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
