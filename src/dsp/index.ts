/**
 * Public entry point of the DSP module. Pure TypeScript: no React, no native
 * code, so everything here runs (and is tested) in plain Node.
 */

import { segmentNotes, type DetectedNote, type SegmentOptions } from './segment';
import { PitchTracker, type PitchFrame, type TrackerOptions } from './tracker';
import { correctTuning } from './tuning';

export * from './notes';
export * from './segment';
export * from './synth';
export * from './tracker';
export * from './tuning';
export * from './yin';

export interface TranscribeOptions {
  tracker?: TrackerOptions;
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
  const tracker = new PitchTracker(sampleRate, options.tracker);
  const frames = tracker.push(samples);
  return notesFromFrames(frames, tracker.hopSeconds, options);
}
