/**
 * Public entry point of the DSP module. Pure TypeScript: no React, no native
 * code, so everything here runs (and is tested) in plain Node.
 */

import { MelodyTracker, type MelodyTrackerOptions } from './melody';
import { segmentNotes, type DetectedNote, type SegmentOptions } from './segment';
import { PitchTracker, type PitchFrame, type TrackerOptions } from './tracker';
import { correctTuning } from './tuning';

export * from './fft';
export * from './melody';
export * from './notes';
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
  /** Correct for the singer's tuning offset and drift. On by default. */
  correctTuning?: boolean;
}

/** Second half of the pipeline: pitch frames in, notes out. */
export function notesFromFrames(
  frames: PitchFrame[],
  hopSeconds: number,
  options: TranscribeOptions = {}
): DetectedNote[] {
  const notes = segmentNotes(frames, hopSeconds, options.segment);
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
