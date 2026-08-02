import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isValidFretDraft, parseFretRangeDraft } from './fretRange.ts'

describe('individual fret drafts', () => {
  it('accepts an empty draft or a fret from 0 through 24', () => {
    for (const draft of ['', '0', '12', '24']) {
      assert.equal(isValidFretDraft(draft), true)
    }
  })

  it('rejects invalid characters and impossible fret values', () => {
    for (const draft of ['-1', '-5', '25', '120', '1.5', 'abc']) {
      assert.equal(isValidFretDraft(draft), false)
    }
  })
})

describe('position fret range validation', () => {
  it('accepts valid ranges across the fretboard', () => {
    assert.deepEqual(parseFretRangeDraft('0', '1'), { start: 0, end: 1 })
    assert.deepEqual(parseFretRangeDraft('17', '24'), {
      start: 17,
      end: 24,
    })
    assert.deepEqual(parseFretRangeDraft('23', '24'), {
      start: 23,
      end: 24,
    })
  })

  it('allows a draft range to move from 5–6 to 12–17 as a pair', () => {
    let committedRange = { start: 5, end: 6 }

    const temporaryDraft = parseFretRangeDraft('12', '6')
    if (temporaryDraft) committedRange = temporaryDraft
    assert.deepEqual(committedRange, { start: 5, end: 6 })

    const completedDraft = parseFretRangeDraft('12', '17')
    if (completedDraft) committedRange = completedDraft
    assert.deepEqual(committedRange, {
      start: 12,
      end: 17,
    })
  })

  it('normalizes equal endpoints to a two-fret range', () => {
    assert.deepEqual(parseFretRangeDraft('5', '5'), { start: 5, end: 6 })
    assert.deepEqual(parseFretRangeDraft('12', '12'), {
      start: 12,
      end: 13,
    })
    assert.deepEqual(parseFretRangeDraft('24', '24'), {
      start: 23,
      end: 24,
    })
  })

  it('rejects reversed endpoints', () => {
    assert.equal(parseFretRangeDraft('12', '11'), null)
  })

  it('rejects empty, non-numeric, and out-of-bounds drafts', () => {
    assert.equal(parseFretRangeDraft('', '9'), null)
    assert.equal(parseFretRangeDraft('5', ''), null)
    assert.equal(parseFretRangeDraft('start', '9'), null)
    assert.equal(parseFretRangeDraft('-1', '5'), null)
    assert.equal(parseFretRangeDraft('17', '25'), null)
  })
})
