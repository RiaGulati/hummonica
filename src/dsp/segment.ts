/**
 * Note segmentation: turns a sequence of per-frame pitch readings into a list
 * of discrete notes, each with a start time and duration.
 *
 * Steps:
 *   1. Median filter the pitch track. A median ignores isolated outliers
 *      (such as a single frame that jumped an octave) while keeping sharp
 *      note changes sharp, unlike an average, which would blur them.
 *   2. Walk through the frames and start a new note at every "onset":
 *        - sound starts after silence,
 *        - the pitch moves away from the current note by more than
 *          `pitchChangeSemitones` (a change of note while playing legato),
 *        - the loudness jumps by more than `energyOnsetDb` (a re-attack, which
 *          is how a repeated note like "E E" is told apart from one long E).
 *      Short silent gaps (up to `maxGapMs`) inside a note are bridged, so a
 *      brief dropout does not split one note into two.
 *   3. Throw away "blips" shorter than `minNoteMs`.
 *   4. Give each note the median pitch of its frames.
 */

import { midiToFrequency } from './notes';
import type { PitchFrame } from './tracker';

export interface DetectedNote {
  /** Nearest MIDI note number. */
  midi: number;
  /** How far the sung pitch was from that note, in cents (-50 to +50). */
  cents: number;
  /** Median frequency of the note in Hz. */
  frequency: number;
  /** Start time in seconds. */
  start: number;
  /** Length in seconds. */
  duration: number;
}

export interface SegmentOptions {
  /** Number of frames in the median filter. Should be odd. */
  medianWindow?: number;
  /** Pitch distance from the current note that starts a new note. */
  pitchChangeSemitones?: number;
  /** Loudness rise (compared with the last few frames) that starts a new note. */
  energyOnsetDb?: number;
  /** Silent gaps up to this long do not end a note. */
  maxGapMs?: number;
  /** Notes shorter than this are discarded. */
  minNoteMs?: number;
}

export const DEFAULT_SEGMENT_OPTIONS: Required<SegmentOptions> = {
  medianWindow: 5,
  pitchChangeSemitones: 0.7,
  energyOnsetDb: 6,
  maxGapMs: 30,
  minNoteMs: 60,
};

/** Number of earlier frames whose quietest loudness is compared with the current frame. */
const ENERGY_LOOKBACK_FRAMES = 3;

/** Median of a list of numbers. */
export function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Median filter that skips NaN values (unvoiced frames). Each voiced value is
 * replaced by the median of the voiced values around it. Unvoiced frames stay
 * NaN, so silence is never filled in.
 */
export function medianFilter(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((value, i) => {
    if (Number.isNaN(value)) return NaN;
    const neighbours: number[] = [];
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      if (!Number.isNaN(values[j])) neighbours.push(values[j]);
    }
    return median(neighbours);
  });
}

/** True when frame i is clearly louder than the quietest of the frames just before it. */
function isEnergyOnset(frames: PitchFrame[], i: number, thresholdDb: number): boolean {
  if (i === 0) return false;
  let quietest = Infinity;
  for (let j = Math.max(0, i - ENERGY_LOOKBACK_FRAMES); j < i; j++) {
    quietest = Math.min(quietest, frames[j].rms);
  }
  if (quietest <= 0) return true;
  const riseDb = 20 * Math.log10(frames[i].rms / quietest);
  return riseDb >= thresholdDb;
}

interface NoteInProgress {
  startIndex: number;
  endIndex: number;
  pitches: number[];
}

/**
 * Group pitch frames into notes.
 *
 * @param frames Output of PitchTracker, in time order.
 * @param hopSeconds Time between consecutive frames.
 */
export function segmentNotes(
  frames: PitchFrame[],
  hopSeconds: number,
  options: SegmentOptions = {}
): DetectedNote[] {
  const opts = { ...DEFAULT_SEGMENT_OPTIONS, ...options };
  const maxGapFrames = Math.round(opts.maxGapMs / 1000 / hopSeconds);
  // A note must be at least minNoteMs long anyway, so we do not look for a new
  // onset until the current note has lasted that long. This stops the rising
  // loudness at the very start of a note from being seen as many onsets.
  const settleFrames = Math.round(opts.minNoteMs / 1000 / hopSeconds);

  // Step 1: smooth the pitch track.
  const smoothed = medianFilter(
    frames.map((frame) => (frame.voiced ? frame.midi : NaN)),
    opts.medianWindow
  );

  // Step 2: walk the frames, opening and closing notes at onsets.
  const finished: NoteInProgress[] = [];
  let current: NoteInProgress | null = null;
  let silentFrames = 0;

  for (let i = 0; i < frames.length; i++) {
    const pitch = smoothed[i];

    if (Number.isNaN(pitch)) {
      silentFrames++;
      if (current && silentFrames > maxGapFrames) {
        finished.push(current);
        current = null;
      }
      continue;
    }
    silentFrames = 0;

    if (current && i - current.startIndex >= settleFrames) {
      const pitchChanged =
        Math.abs(pitch - median(current.pitches)) >= opts.pitchChangeSemitones;
      const reattacked = isEnergyOnset(frames, i, opts.energyOnsetDb);
      if (pitchChanged || reattacked) {
        finished.push(current);
        current = null;
      }
    }

    if (!current) {
      current = { startIndex: i, endIndex: i, pitches: [] };
    }
    current.pitches.push(pitch);
    current.endIndex = i;
  }
  if (current) finished.push(current);

  // Steps 3 and 4: drop blips and summarize each note.
  return finished
    .map((note): DetectedNote => {
      const pitch = median(note.pitches);
      const midi = Math.round(pitch);
      return {
        midi,
        cents: (pitch - midi) * 100,
        frequency: midiToFrequency(pitch),
        start: frames[note.startIndex].time,
        duration: (note.endIndex - note.startIndex + 1) * hopSeconds,
      };
    })
    .filter((note) => note.duration * 1000 >= opts.minNoteMs);
}
