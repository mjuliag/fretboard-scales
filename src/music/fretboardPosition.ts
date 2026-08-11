export type FretboardCoordinate = {
  stringIndex: number
  fret: number
}

export function isFretboardCoordinate(
  coordinate: FretboardCoordinate | null,
  stringIndex: number,
  fret: number,
): boolean {
  return coordinate?.stringIndex === stringIndex && coordinate.fret === fret
}
