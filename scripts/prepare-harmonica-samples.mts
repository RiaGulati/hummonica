/**
 * One-time preparation of the harmonica samples used for tab playback.
 *
 * Source: "Harmonica multisample notes" by j_e_f_f_g on Freesound, CC0
 * (public domain): https://freesound.org/people/j_e_f_f_g/packs/20090/
 * Each note has a held sample with loop points (a "smpl" chunk) and a short
 * release sample (the sound of the note ending).
 *
 * For each note this script:
 *   1. mixes it to mono (and halves the rate of the one 88.2 kHz file),
 *   2. keeps the start of the note up to the end of its loop (the rest is
 *      never played, because playback jumps back to the loop start),
 *   3. smooths the loop seam with a cross-fade (see below),
 *   4. scales every note to the same loudness,
 *   5. writes small 16-bit WAV files to assets/harmonica/, and
 *   6. writes src/audio/harmonica-sample-map.ts with the loop points.
 *
 * Usage (Node 23 or newer runs TypeScript directly):
 *   node scripts/prepare-harmonica-samples.mts <folder with the unzipped pack>
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { decodeWav, encodeWav } from '../src/dsp/wav.ts';

/**
 * The notes we use, by their name in the pack. "6_ab" is left out: its
 * partials are 830 Hz apart, so it is really G#5 (a duplicate), not G#6.
 */
const NOTES = [
  { name: '4_b', midi: 71 },
  { name: '5_e', midi: 76 },
  { name: '5_ab', midi: 80 },
  { name: '6_c', midi: 84 },
  { name: '6_e', midi: 88 },
];

/** Length of the loop cross-fade. */
const LOOP_CROSSFADE_SAMPLES = 441; // 10 ms at 44.1 kHz

/**
 * Loop cross-fade. When playback reaches the end of the loop it jumps back to
 * loopStart. If the waveform there does not match the end, the jump makes a
 * click. We blend the last few milliseconds of the loop into the audio that
 * comes just BEFORE loopStart. The loop then ends with exactly the samples
 * that lead into loopStart, so the jump is smooth.
 */
function crossfadeLoop(held: Float32Array, start: number, end: number): void {
  const length = Math.min(LOOP_CROSSFADE_SAMPLES, start, Math.floor((end - start) / 2));
  for (let k = 0; k < length; k++) {
    const blend = (k + 1) / length; // 0 = original loop end, 1 = audio before loopStart
    const at = end - length + k;
    held[at] = held[at] * (1 - blend) + held[start - length + k] * blend;
  }
}

/** Every note is scaled so its looped part has this loudness (RMS). */
const TARGET_RMS = 0.2;
const OUTPUT_RATE = 44100;

/** Read the first loop (start and end sample) from a WAV file's "smpl" chunk. */
function readLoop(bytes: Uint8Array): { start: number; end: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const name = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (name === 'smpl') {
      // The first loop record starts 36 bytes into the chunk; start and end
      // are its 3rd and 4th numbers. The end sample is included in the loop.
      const loop = offset + 8 + 36;
      return { start: view.getUint32(loop + 8, true), end: view.getUint32(loop + 12, true) + 1 };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error('No loop points in this file');
}

/** Halve the sample rate by averaging pairs of samples (a simple low-pass filter). */
function halveRate(samples: Float32Array): Float32Array {
  const output = new Float32Array(Math.floor(samples.length / 2));
  for (let i = 0; i < output.length; i++) output[i] = (samples[2 * i] + samples[2 * i + 1]) / 2;
  return output;
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / samples.length);
}

const sourceFolder = process.argv[2];
if (!sourceFolder) throw new Error('Usage: node scripts/prepare-harmonica-samples.mts <pack folder>');
const files = readdirSync(sourceFolder);
const findFile = (suffix: string) => {
  const file = files.find((f) => f.endsWith(`__${suffix}.wav`));
  if (!file) throw new Error(`Missing ${suffix}.wav`);
  return join(sourceFolder, file);
};

const outputFolder = 'assets/harmonica';
mkdirSync(outputFolder, { recursive: true });
const entries: string[] = [];

for (const { name, midi } of NOTES) {
  const bytes = new Uint8Array(readFileSync(findFile(name)));
  let { samples, sampleRate } = decodeWav(bytes);
  let { start, end } = readLoop(bytes);
  let release = decodeWav(new Uint8Array(readFileSync(findFile(`${name}_r`)))).samples;

  if (sampleRate === 2 * OUTPUT_RATE) {
    samples = halveRate(samples);
    start = Math.round(start / 2);
    end = Math.round(end / 2);
    sampleRate = OUTPUT_RATE;
  }
  if (sampleRate !== OUTPUT_RATE) throw new Error(`${name}: unexpected rate ${sampleRate}`);
  // Some files mark a loop end just past the last sample; keep it inside the audio.
  end = Math.min(end, samples.length);

  const held = samples.slice(0, end);
  crossfadeLoop(held, start, end);
  const gain = TARGET_RMS / rms(held.subarray(start));
  for (let i = 0; i < held.length; i++) held[i] *= gain;
  release = release.map((s) => s * gain);

  writeFileSync(join(outputFolder, `${name}.wav`), encodeWav(held, OUTPUT_RATE));
  writeFileSync(join(outputFolder, `${name}-release.wav`), encodeWav(release, OUTPUT_RATE));
  entries.push(
    `  {\n    midi: ${midi},\n    held: require('../../assets/harmonica/${name}.wav'),\n` +
      `    release: require('../../assets/harmonica/${name}-release.wav'),\n` +
      `    loopStart: ${start},\n    loopEnd: ${end},\n  },`
  );
  console.log(`${name}: ${(held.length / OUTPUT_RATE).toFixed(2)} s, loop ${start}-${end}, gain ${gain.toFixed(2)}`);
}

writeFileSync(
  'src/audio/harmonica-sample-map.ts',
  `/**
 * Generated by scripts/prepare-harmonica-samples.mts. Do not edit by hand.
 *
 * Harmonica samples: "Harmonica multisample notes" by j_e_f_f_g on Freesound,
 * CC0 (public domain): https://freesound.org/people/j_e_f_f_g/packs/20090/
 * Sample rate ${OUTPUT_RATE} Hz. Loop points are in samples; loopEnd is not included.
 */

export const HARMONICA_SAMPLE_RATE = ${OUTPUT_RATE};

export const HARMONICA_SAMPLE_FILES = [
${entries.join('\n')}
];
`
);
