/**
 * Scores detected notes against a reference melody.
 *
 * The two lists usually differ in length (notes can be missed or added), so we
 * cannot compare them position by position. Instead we align them with the
 * edit distance algorithm (Levenshtein, as used by spell checkers): find the
 * cheapest set of edits that turns one list into the other. Each edit is one of:
 *
 *   correct  same note                                   cost 0
 *   octave   same note name in another octave (E4 vs E5) cost 0.5
 *   wrong    a different note                            cost 1
 *   missing  a reference note with no detected note      cost 1
 *   extra    a detected note with no reference note      cost 1
 *
 * Dynamic programming fills a table where cell [i][j] is the cheapest way to
 * align the first i detected notes with the first j reference notes.
 */

export type AlignmentKind = 'correct' | 'octave' | 'wrong' | 'missing' | 'extra';

export interface AlignedPair {
  kind: AlignmentKind;
  detected: number | null;
  reference: number | null;
}

export interface NoteScore {
  correct: number;
  octave: number;
  wrong: number;
  missing: number;
  extra: number;
  /** Reference notes taken into account (fewer than all of them in partial mode). */
  referenceCount: number;
  /** correct / referenceCount: how much of the melody was found (recall). */
  accuracy: number;
  /** correct / detected notes: how many detected notes were right. */
  precision: number;
  /**
   * F1: the harmonic mean of accuracy and precision, from 0 to 1. It is only
   * high when the melody is found AND there are few extra notes, so a long
   * list of random notes cannot score well. This is the main number to watch.
   */
  f1: number;
  /** Total edit cost. Lower is better. */
  cost: number;
  /** Semitones added to the detected notes before comparing. */
  shift: number;
  pairs: AlignedPair[];
}

export interface ScoreOptions {
  /**
   * The recording may stop before the end of the reference (for example a
   * 30 second clip of a long song). Reference notes after the last aligned
   * one are then not counted as missing.
   */
  partial?: boolean;
  /** Semitones added to every detected note before comparing. */
  shift?: number;
}

const COST = { octave: 0.5, wrong: 1, missing: 1, extra: 1 };

function substitution(detected: number, reference: number): { kind: AlignmentKind; cost: number } {
  if (detected === reference) return { kind: 'correct', cost: 0 };
  if ((detected - reference) % 12 === 0) return { kind: 'octave', cost: COST.octave };
  return { kind: 'wrong', cost: COST.wrong };
}

export function scoreNotes(detectedNotes: number[], reference: number[], options: ScoreOptions = {}): NoteScore {
  const shift = options.shift ?? 0;
  const detected = detectedNotes.map((midi) => midi + shift);
  const n = detected.length;
  const m = reference.length;

  // table[i][j]: cheapest alignment of detected[0..i) with reference[0..j).
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) table[i][0] = i * COST.extra;
  for (let j = 1; j <= m; j++) table[0][j] = j * COST.missing;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      table[i][j] = Math.min(
        table[i - 1][j - 1] + substitution(detected[i - 1], reference[j - 1]).cost,
        table[i - 1][j] + COST.extra,
        table[i][j - 1] + COST.missing
      );
    }
  }

  // Where the alignment ends: after all reference notes, or (partial mode)
  // after whichever number of reference notes is cheapest.
  let end = m;
  if (options.partial) {
    for (let j = 0; j <= m; j++) if (table[n][j] < table[n][end]) end = j;
  }

  // Walk back through the table to recover the edits.
  const pairs: AlignedPair[] = [];
  let i = n;
  let j = end;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const sub = substitution(detected[i - 1], reference[j - 1]);
      if (table[i][j] === table[i - 1][j - 1] + sub.cost) {
        pairs.push({ kind: sub.kind, detected: detected[i - 1], reference: reference[j - 1] });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && table[i][j] === table[i - 1][j] + COST.extra) {
      pairs.push({ kind: 'extra', detected: detected[i - 1], reference: null });
      i--;
    } else {
      pairs.push({ kind: 'missing', detected: null, reference: reference[j - 1] });
      j--;
    }
  }
  pairs.reverse();

  const count = (kind: AlignmentKind) => pairs.filter((p) => p.kind === kind).length;
  const correct = count('correct');
  const accuracy = end > 0 ? correct / end : 0;
  const precision = n > 0 ? correct / n : 0;
  return {
    correct,
    octave: count('octave'),
    wrong: count('wrong'),
    missing: count('missing'),
    extra: count('extra'),
    referenceCount: end,
    accuracy,
    precision,
    f1: accuracy + precision > 0 ? (2 * accuracy * precision) / (accuracy + precision) : 0,
    cost: table[n][end],
    shift,
    pairs,
  };
}

/**
 * Score with the best key shift. A recording of the original song is often in
 * another key than the tab (which is written for a C harmonica), so every
 * shift from -12 to +12 semitones is tried and the cheapest one is kept.
 */
export function scoreNotesAnyKey(detected: number[], reference: number[], options: ScoreOptions = {}): NoteScore {
  let best: NoteScore | null = null;
  for (let shift = -12; shift <= 12; shift++) {
    const score = scoreNotes(detected, reference, { ...options, shift });
    if (!best || score.cost < best.cost) best = score;
  }
  return best!;
}
