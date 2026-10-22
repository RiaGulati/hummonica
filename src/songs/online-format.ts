/**
 * Reading tabs from harmonica.com. Pure TypeScript (no network), so it can be
 * tested in Node. The network part is in harmonica-com.ts.
 *
 * The site is built with WordPress, which offers a public "REST API": the
 * list of tabs and each tab page can be downloaded as JSON. A tab page's text
 * is HTML; the tab itself is inside <pre> blocks, and short facts (such as
 * which harmonica to use) are in <p> paragraphs.
 *
 * Tabs on the site are written for people, not computers, so the reader is
 * forgiving:
 *   - lines with lyrics (letters) are kept for display but skipped for notes,
 *   - notes written without a space, like "-6-7", are split,
 *   - chords like "45" or "-56" (two holes at once) are played as their top
 *     hole, which usually carries the melody,
 *   - curly quotes count as bend marks, and markers such as "*" are ignored.
 */

import { ALL_POSITIONS, type Breath, type HarpPosition, type Tab } from '../harmonica';

export interface OnlineTabSummary {
  id: number;
  title: string;
  artist: string;
}

export interface OnlineTabPage {
  /** Short facts from the page, such as "Harmonica type: diatonic". */
  facts: string[];
  /** The tab text blocks, exactly as written (may include lyrics). */
  blocks: string[];
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Turn HTML entities such as "&#8217;" or "&amp;" back into characters. */
export function decodeHtml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/** Remove HTML tags (line breaks become new lines) and decode entities. */
function htmlToText(html: string): string {
  return decodeHtml(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
}

/** The tab list from the API: [{ id, title: { rendered }, "tab-artist": [ids] }]. */
export function parseTabIndex(tabsJson: unknown, artistNames: Map<number, string>): OnlineTabSummary[] {
  if (!Array.isArray(tabsJson)) return [];
  const result: OnlineTabSummary[] = [];
  for (const item of tabsJson) {
    const id = item?.id;
    const title = item?.title?.rendered;
    if (typeof id !== 'number' || typeof title !== 'string') continue;
    const artistIds: unknown[] = Array.isArray(item['tab-artist']) ? item['tab-artist'] : [];
    const artist = artistIds
      .map((artistId) => artistNames.get(artistId as number))
      .filter(Boolean)
      .join(', ');
    result.push({ id, title: htmlToText(title).trim(), artist });
  }
  return result;
}

/** The artist list from the API: [{ id, name }]. */
export function parseArtists(json: unknown): Map<number, string> {
  const names = new Map<number, string>();
  if (Array.isArray(json)) {
    for (const item of json) {
      if (typeof item?.id === 'number' && typeof item?.name === 'string') {
        names.set(item.id, htmlToText(item.name).trim());
      }
    }
  }
  return names;
}

/** Take the facts and the tab blocks out of a tab page's HTML. */
export function extractTabPage(html: string): OnlineTabPage {
  const facts = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => htmlToText(match[1]).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const blocks = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)]
    .map((match) => htmlToText(match[1]).replace(/\s+$/, ''))
    .filter((block) => block.trim() !== '');
  return { facts, blocks };
}

/** One note symbol: sign, hole number(s), arrow, bend marks, and an ignored "*". */
const SYMBOL = /([+-]?)(\d+)([↑↓]?)(['’′‘"”″“]*)\*?/g;
/** Characters allowed in a tab line. Anything else (letters) means lyrics. */
const TAB_LINE = /^[\s\d+\-↑↓'’′‘"”″“*[\]|()x,.]*$/i;

/** Hole numbers in a run of digits: "4" -> [4], "45" -> [4, 5], "910" -> [9, 10]. */
function holesIn(digits: string): number[] {
  if (digits === '10') return [10];
  if (digits.endsWith('10')) return [...holesIn(digits.slice(0, -2)), 10];
  return [...digits].map(Number).filter((hole) => hole >= 1 && hole <= 9);
}

function bendCount(marks: string): number {
  let count = 0;
  for (const mark of marks) count += '"”″“'.includes(mark) ? 2 : 1;
  return count;
}

/** Is this line a tab line (not lyrics or a heading)? */
export function isTabLine(line: string): boolean {
  return /\d/.test(line) && TAB_LINE.test(line.replace(/x\d+/gi, ''));
}

/**
 * Read the notes of a tab text. Returns one list of positions per tab line
 * (lyrics lines are skipped), and how many symbols could not be read.
 */
export function readTabText(text: string): { lines: HarpPosition[][]; unreadable: number } {
  const lines: HarpPosition[][] = [];
  let unreadable = 0;
  for (const line of text.split('\n')) {
    if (!isTabLine(line)) continue;
    const positions: HarpPosition[] = [];
    // Repeat marks like "x2" are not notes.
    for (const match of line.replace(/x\d+/gi, ' ').matchAll(SYMBOL)) {
      const [, sign, digits, arrow, marks] = match;
      const breath: Breath = sign === '-' || arrow === '↓' ? 'draw' : 'blow';
      const holes = holesIn(digits);
      // For a chord, the top hole carries the melody.
      const hole = holes[holes.length - 1];
      const position = ALL_POSITIONS.find(
        (p) => p.hole === hole && p.breath === breath && p.bend === bendCount(marks)
      );
      if (position) positions.push(position);
      else unreadable++;
    }
    if (positions.length > 0) lines.push(positions);
  }
  return { lines, unreadable };
}

/** Seconds per note, and the extra pause at the end of each tab line. */
const NOTE_SECONDS = 0.5;
const LINE_PAUSE_SECONDS = 0.5;

/**
 * A playable tab from tab text, with the holes exactly as written. Website
 * tabs have no rhythm, so notes are evenly spaced, with a short pause at the
 * end of each line (lines are usually musical phrases).
 */
export function tabFromText(text: string): Tab {
  const { lines } = readTabText(text);
  const entries: Tab['entries'] = [];
  let time = 0;
  for (const line of lines) {
    for (const position of line) {
      entries.push({
        detectedMidi: position.midi,
        midi: position.midi,
        start: time,
        duration: NOTE_SECONDS - 0.05,
        position,
      });
      time += NOTE_SECONDS;
    }
    time += LINE_PAUSE_SECONDS;
  }
  return { shift: 0, entries };
}
