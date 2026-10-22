/**
 * Reads harmonica tab text, as found on websites, back into notes. Used to
 * compare what the app detected with a published tab, and to let the user
 * type or paste a tab into the app.
 *
 * Accepted notations for one note (all for a C harmonica):
 *   4   +4   4↑     hole 4 blow
 *   -4  4↓          hole 4 draw
 *   -3' -3'' -3"    bends, one apostrophe per semitone (" and ″ count as two)
 *   3↓''            our own notation
 * Brackets, bar lines and repeat marks such as "x2" are ignored. Chords
 * (for example "45" for holes 4 and 5 together) are not supported.
 */

import { ALL_POSITIONS, type Breath, type HarpPosition } from './layout';

const NOTE_PATTERN = /^([+-]?)(10|[1-9])([↑↓]?)(['’′"”″]*)$/;
const IGNORED_PATTERN = /^(\[|\]|\||x\d+|\]x\d+)$/i;

/** Number of semitones a bend mark stands for. */
function bendCount(marks: string): number {
  let count = 0;
  for (const mark of marks) count += '"”″'.includes(mark) ? 2 : 1;
  return count;
}

/**
 * Turn tab text into harmonica positions (hole, blow or draw, bend), exactly
 * as written. Throws on anything it cannot read.
 */
export function parseTabPositions(text: string): HarpPosition[] {
  const tokens = text
    .replace(/[[\]|]/g, ' ')
    .split(/\s+/)
    .filter((token) => token !== '' && !IGNORED_PATTERN.test(token));

  return tokens.map((token) => {
    const match = NOTE_PATTERN.exec(token);
    if (!match) throw new Error(`Cannot read tab symbol "${token}"`);
    const [, sign, holeText, arrow, marks] = match;
    const breath: Breath = sign === '-' || arrow === '↓' ? 'draw' : 'blow';
    const hole = Number(holeText);
    const bend = bendCount(marks);

    const position = ALL_POSITIONS.find(
      (p) => p.hole === hole && p.breath === breath && p.bend === bend
    );
    if (!position) throw new Error(`"${token}" is not a note on a C harmonica`);
    return position;
  });
}

/** Turn tab text into a list of MIDI notes. Throws on anything it cannot read. */
export function parseTab(text: string): number[] {
  return parseTabPositions(text).map((position) => position.midi);
}
