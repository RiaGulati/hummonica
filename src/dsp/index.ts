/**
 * Public entry point of the DSP module. Pure TypeScript: no React, no native
 * code, so everything here runs (and is tested) in plain Node.
 */

import { segmentNotes, type DetectedNote, type SegmentOptions } from './segment';
import { PitchTracker, type TrackerOptions } from './tracker';

export * from './notes';
export * from './segment';
export * from './synth';
export * from './tracker';
export * from './yin';

export interface TranscribeOptions {
  tracker?: TrackerOptions;
  segment?: SegmentOptions;
}

/** Full pipeline for a complete recording: samples in, notes out. */
export function transcribe(
  samples: Float32Array,
  sampleRate: number,
  options: TranscribeOptions = {}
): DetectedNote[] {
  const tracker = new PitchTracker(sampleRate, options.tracker);
  const frames = tracker.push(samples);
  return segmentNotes(frames, tracker.hopSeconds, options.segment);
}
