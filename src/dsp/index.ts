/**
 * Public entry point of the DSP module. Pure TypeScript: no React, no native
 * code, so everything here runs (and is tested) in plain Node.
 */

import { MelodyTracker, type MelodyTrackerOptions } from './melody';
import { removeOutlierNotes, type OutlierOptions } from './outliers';
import { segmentNotes, type DetectedNote, type SegmentOptions } from './segment';
import { PitchTracker, type PitchFrame, type TrackerOptions } from './tracker';
import { correctTuning } from './tuning';

export * from './fft';
export * from './melody';
export * from './notes';
export * from './outliers';
export * from './segment';
export * from './synth';
export * from './tracker';
export * from './tuning';
export * from './yin';

/**
 * 'voice': one note at a time (humming, singing, whistling, a harmonica).
 *          Uses YIN, which is fast and precise for a single sound.
 * 'song':  recorded music with a lead melody over other instruments.
 *          Uses MelodyTracker, which picks the melody out of the mix.
 */
export type TranscribeMode = 'voice' | 'song';

export interface TranscribeOptions {
  /** Which pitch tracker to use. 'voice' by default. */
  mode?: TranscribeMode;
  /** Options for the YIN tracker ('voice' mode). */
  tracker?: TrackerOptions;
  /** Options for the melody tracker ('song' mode). */
  melody?: MelodyTrackerOptions;
  segment?: SegmentOptions;
  /** Song mode: options for removing isolated notes far from the melody. */
  outliers?: OutlierOptions;
  /** Correct for the singer's tuning offset and drift. On by default. */
  correctTuning?: boolean;
}

/**
 * Segmentation settings that differ in Song mode. There the "loudness" of a
 * frame is the salience of the melody (see melody.ts), which wobbles more
 * than the volume of a single voice, so a bigger jump is needed to count as
 * a re-attacked note. 9 dB improved all three real test recordings.
 */
export const SONG_SEGMENT_OPTIONS: SegmentOptions = { energyOnsetDb: 9 };

/** Second half of the pipeline: pitch frames in, notes out. */
export function notesFromFrames(
  frames: PitchFrame[],
  hopSeconds: number,
  options: TranscribeOptions = {}
): DetectedNote[] {
  const segment = options.mode === 'song' ? { ...SONG_SEGMENT_OPTIONS, ...options.segment } : options.segment;
  let notes = segmentNotes(frames, hopSeconds, segment);
  // In a song, other instruments cause isolated stray notes. A single voice does not.
  if (options.mode === 'song') notes = removeOutlierNotes(notes, options.outliers);
  return options.correctTuning === false ? notes : correctTuning(notes);
}

/** Full pipeline for a complete recording: samples in, notes out. */
export function transcribe(
  samples: Float32Array,
  sampleRate: number,
  options: TranscribeOptions = {}
): DetectedNote[] {
  if (options.mode === 'song') {
    const tracker = new MelodyTracker(sampleRate, options.melody);
    tracker.push(samples);
    return notesFromFrames(tracker.finish(), tracker.hopSeconds, options);
  }
  const tracker = new PitchTracker(sampleRate, options.tracker);
  const frames = tracker.push(samples);
  return notesFromFrames(frames, tracker.hopSeconds, options);
}
