/**
 * Hole chooser: decides which hole to use for each note.
 *
 * Most notes can only be played one way, but some have two options. Without
 * bends, G4 is either 2 draw or 3 blow. The goal is to keep the harmonica
 * moving as little as possible, which is easier to play.
 *
 * Choosing greedily (the closest option to the previous note) can paint you
 * into a corner, so instead we use dynamic programming (the Viterbi
 * algorithm), which finds the choice for every note that minimizes the TOTAL
 * hole movement over the whole melody:
 *
 *   cost[i][option] = cheapest total movement to reach note i played with "option"
 *                   = min over previous options p of
 *                       cost[i-1][p] + |hole(option) - hole(p)| + bendPenalty(option)
 *
 * We remember which previous option gave each minimum, then walk backwards
 * from the cheapest final option to recover the full sequence.
 *
 * Unplayable notes get no position (null). They are skipped, so the note
 * after one is compared with the last playable note before it.
 */

import { positionsFor, type HarpPosition } from './layout';

/**
 * Extra cost per semitone of bend. Bent notes are harder to play in tune, so
 * when an unbent option exists we would rather use it. Smaller than one hole
 * of movement, so it only breaks ties.
 */
const BEND_PENALTY = 0.5;

/**
 * Final tiebreaker for options that cost the same. The only unbent note with
 * two options is G4, and standard scale charts play it as 2 draw, so prefer
 * draw. The value is tiny so it can never outweigh real hole movement.
 */
function tieBreak(position: HarpPosition): number {
  return position.breath === 'draw' ? 0 : 1e-6;
}

export function chooseHoles(midiNotes: number[], allowBends: boolean): (HarpPosition | null)[] {
  const result: (HarpPosition | null)[] = midiNotes.map(() => null);

  // Only playable notes take part in the dynamic programming.
  const playable = midiNotes
    .map((midi, index) => ({ index, options: positionsFor(midi, allowBends) }))
    .filter((note) => note.options.length > 0);
  if (playable.length === 0) return result;

  // costs[i][k] and previous[i][k] for option k of playable note i.
  const costs: number[][] = [];
  const previous: number[][] = [];

  playable.forEach((note, i) => {
    costs.push([]);
    previous.push([]);
    note.options.forEach((option, k) => {
      const ownCost = option.bend * BEND_PENALTY + tieBreak(option);
      if (i === 0) {
        costs[i][k] = ownCost;
        previous[i][k] = -1;
        return;
      }
      let best = Infinity;
      let bestPrevious = 0;
      playable[i - 1].options.forEach((prevOption, p) => {
        const total = costs[i - 1][p] + Math.abs(option.hole - prevOption.hole);
        if (total < best) {
          best = total;
          bestPrevious = p;
        }
      });
      costs[i][k] = best + ownCost;
      previous[i][k] = bestPrevious;
    });
  });

  // Walk backwards from the cheapest ending.
  const last = playable.length - 1;
  let k = costs[last].indexOf(Math.min(...costs[last]));
  for (let i = last; i >= 0; i--) {
    result[playable[i].index] = playable[i].options[k];
    k = previous[i][k];
  }
  return result;
}
