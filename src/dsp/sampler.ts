/**
 * A sampler: plays notes using short recordings of a real harmonica.
 *
 * We have recordings ("samples") of only a few notes. Every other note is
 * made from the nearest one by playing it slightly faster or slower: playing
 * a recording 2^(1/12) = 1.059 times faster raises it by one semitone. Small
 * shifts (1 or 2 semitones) sound natural; big ones start to sound
 * unnatural, which is why the nearest sample is used.
 *
 * Each sample has two parts:
 *   - held: the start of the note (the breath "attack") followed by a section
 *     that can repeat seamlessly (the loop, between loopStart and loopEnd).
 *     A note longer than the recording keeps jumping back to loopStart.
 *   - release: the sound of the note ending, played at the end of each note
 *     with a short cross-fade, so notes end naturally instead of being cut.
 */

import { frequencyToMidi } from './notes';

export interface HarmonicaSample {
  /** The note that was recorded (MIDI). */
  midi: number;
  sampleRate: number;
  held: Float32Array;
  release: Float32Array;
  /** First sample of the loop. */
  loopStart: number;
  /** First sample after the loop (the loop is loopStart .. loopEnd - 1). */
  loopEnd: number;
}

/** Length of the cross-fade from the held sound into the release. */
const CROSSFADE_SECONDS = 0.015;
/** Very short fade at the very end, in case the release had to be cut short. */
const END_FADE_SECONDS = 0.004;

/** The recorded sample closest to the note. On a tie, shift a higher sample down. */
export function nearestSample(bank: HarmonicaSample[], midi: number): HarmonicaSample {
  let best = bank[0];
  for (const sample of bank) {
    const distance = Math.abs(sample.midi - midi);
    const bestDistance = Math.abs(best.midi - midi);
    if (distance < bestDistance || (distance === bestDistance && sample.midi > best.midi)) {
      best = sample;
    }
  }
  return best;
}

/** Read a buffer at a fractional position by blending the two nearest samples. */
function readAt(buffer: Float32Array, position: number, wrapTo: number, wrapAt: number): number {
  const index = Math.floor(position);
  let next = index + 1;
  if (next >= wrapAt) next = wrapTo; // inside a loop, the sample after the end is the loop start
  const fraction = position - index;
  return buffer[index] + fraction * ((buffer[next] ?? 0) - buffer[index]);
}

/** Render one note of the given frequency and length from the sample bank. */
export function renderSampledNote(
  bank: HarmonicaSample[],
  frequency: number,
  durationSeconds: number,
  outputRate: number
): Float32Array {
  const midi = frequencyToMidi(frequency);
  const sample = nearestSample(bank, midi);
  // How far to move through the recording for each output sample: faster for
  // a higher note, and corrected for any difference in sample rate.
  const step = Math.pow(2, (midi - sample.midi) / 12) * (sample.sampleRate / outputRate);

  const length = Math.round(durationSeconds * outputRate);
  const output = new Float32Array(length);
  // The release takes the end of the note, but at most half of it.
  const releaseLength = Math.min(Math.floor(sample.release.length / step), Math.floor(length / 2));
  const crossfade = Math.min(Math.round(CROSSFADE_SECONDS * outputRate), releaseLength);
  const holdEnd = length - releaseLength + crossfade; // the held sound continues under the cross-fade
  const loopLength = sample.loopEnd - sample.loopStart;

  // 1. The held sound, looping as long as needed.
  let position = 0;
  for (let i = 0; i < holdEnd && i < length; i++) {
    let value = readAt(sample.held, position, sample.loopStart, sample.loopEnd);
    const intoFade = i - (length - releaseLength);
    if (intoFade >= 0) value *= 1 - intoFade / crossfade; // fade out under the release
    output[i] = value;
    position += step;
    while (position >= sample.loopEnd) position -= loopLength;
  }

  // 2. The release, faded in over the cross-fade.
  const releaseStart = length - releaseLength;
  for (let j = 0; j < releaseLength; j++) {
    const fadeIn = j < crossfade ? j / crossfade : 1;
    const value = readAt(sample.release, j * step, sample.release.length, sample.release.length);
    output[releaseStart + j] += fadeIn * value;
  }

  // 3. A tiny fade at the very end so a shortened release never clicks.
  const endFade = Math.min(Math.round(END_FADE_SECONDS * outputRate), length);
  for (let k = 0; k < endFade; k++) output[length - 1 - k] *= k / endFade;
  return output;
}
