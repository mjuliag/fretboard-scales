export const MIN_FRET = 0
export const MAX_FRET = 24

export type FretRange = {
  start: number
  end: number
}

export function isValidFretDraft(value: string): boolean {
  if (value === '') return true
  if (!/^\d+$/.test(value)) return false

  const fret = Number(value)
  return fret >= MIN_FRET && fret <= MAX_FRET
}

export function parseFretRangeDraft(
  startDraft: string,
  endDraft: string,
): FretRange | null {
  if (
    startDraft === '' ||
    endDraft === '' ||
    !isValidFretDraft(startDraft) ||
    !isValidFretDraft(endDraft)
  ) {
    return null
  }

  const start = Number(startDraft)
  const end = Number(endDraft)

  if (start > end) return null

  if (start === end) {
    return start === MAX_FRET
      ? { start: MAX_FRET - 1, end: MAX_FRET }
      : { start, end: start + 1 }
  }

  return { start, end }
}
