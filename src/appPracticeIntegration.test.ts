import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { DEFAULT_APP_CONTROL_STATE } from './appControlState.ts'
import type { FretboardCoordinate } from './music/fretboardPosition.ts'
import { getScaleTones } from './music/index.ts'
import {
  choosePracticeTarget,
  enumerateAllNotesPracticePositions,
  getPracticeTargetCandidates,
  type PracticePosition,
  type PracticeTarget,
  type PracticeTargetType,
} from './practiceMode.ts'

class PracticeAppHarness {
  readonly exploreSettings = {
    controlState: { ...DEFAULT_APP_CONTROL_STATE },
    includeBlueNote: true,
    instrument: 'bass' as const,
    positionEnd: 9,
    positionStart: 5,
    showOtherNotes: false,
  }
  cancelledPlayback = 0
  lastTarget: Partial<Record<PracticeTargetType, PracticeTarget>> = {}
  playedCoordinates: FretboardCoordinate[] = []
  positions: PracticePosition[]
  question: { selection: FretboardCoordinate | null; target: PracticeTarget } | null = null
  soundEnabled = false
  targetType: PracticeTargetType = 'note'
  view: 'explore' | 'practice' = 'explore'
  randomValues = [0, 0.99, 0.5]

  constructor() {
    this.positions = enumerateAllNotesPracticePositions(
      this.exploreSettings.instrument,
      {
        end: this.exploreSettings.positionEnd,
        start: this.exploreSettings.positionStart,
      },
      getScaleTones(
        this.exploreSettings.controlState.root,
        this.exploreSettings.controlState.scaleName,
      ),
    )
  }

  createQuestion(type: PracticeTargetType) {
    const candidates = getPracticeTargetCandidates(
      this.positions,
      getScaleTones(
        this.exploreSettings.controlState.root,
        this.exploreSettings.controlState.scaleName,
      ),
      type,
    )
    const value = this.randomValues.shift() ?? 0
    const target = choosePracticeTarget(
      candidates,
      this.lastTarget[type] ?? null,
      () => value,
    )
    assert.ok(target)
    this.lastTarget[type] = target
    return { selection: null, target }
  }

  enterPractice() {
    this.cancelledPlayback += 1
    this.question = this.createQuestion(this.targetType)
    this.view = 'practice'
  }

  exitPractice() {
    this.question = null
    this.view = 'explore'
  }

  changeTargetType(type: PracticeTargetType) {
    this.targetType = type
    this.question = this.createQuestion(type)
  }

  select(coordinate: FretboardCoordinate) {
    if (!this.question || this.question.selection) return
    this.question = { ...this.question, selection: coordinate }
    if (this.soundEnabled) this.playedCoordinates.push(coordinate)
  }
}

describe('App Practice view lifecycle', () => {
  it('cancels playback, starts fresh on entry, clears on exit, and preserves Explore', () => {
    const app = new PracticeAppHarness()
    const originalExplore = structuredClone(app.exploreSettings)

    app.enterPractice()
    const firstTarget = app.question?.target
    assert.equal(app.cancelledPlayback, 1)
    assert.equal(app.view, 'practice')
    assert.ok(firstTarget)

    app.select(app.positions[0].coordinate)
    assert.ok(app.question?.selection)
    app.exitPractice()

    assert.equal(app.question, null)
    assert.equal(app.view, 'explore')
    assert.deepEqual(app.exploreSettings, originalExplore)

    app.enterPractice()
    assert.equal(app.cancelledPlayback, 2)
    const reenteredQuestion = app.question as {
      selection: FretboardCoordinate | null
      target: PracticeTarget
    } | null
    assert.ok(reenteredQuestion)
    assert.equal(reenteredQuestion.selection, null)
    assert.notDeepEqual(reenteredQuestion.target, firstTarget)
  })

  it('remembers target type and replaces the question when type changes', () => {
    const app = new PracticeAppHarness()
    app.enterPractice()
    const noteQuestion = app.question

    app.changeTargetType('degree')

    assert.equal(app.targetType, 'degree')
    assert.equal(app.question?.target.type, 'degree')
    assert.equal(app.question?.selection, null)
    assert.notDeepEqual(app.question, noteQuestion)

    app.exitPractice()
    app.enterPractice()
    assert.equal(app.question?.target.type, 'degree')
  })

  it('evaluates with Sound off and plays only the selected pitch with Sound on', () => {
    const app = new PracticeAppHarness()
    app.enterPractice()
    const firstSelection = app.positions[0].coordinate
    const ignoredSecondSelection = app.positions[1].coordinate

    app.select(firstSelection)
    app.select(ignoredSecondSelection)
    assert.deepEqual(app.question?.selection, firstSelection)
    assert.deepEqual(app.playedCoordinates, [])

    app.exitPractice()
    app.soundEnabled = true
    app.enterPractice()
    app.select(ignoredSecondSelection)

    assert.deepEqual(app.playedCoordinates, [ignoredSecondSelection])
    assert.equal(app.playedCoordinates.length, 1, 'correct answer is never auto-played')
  })
})
