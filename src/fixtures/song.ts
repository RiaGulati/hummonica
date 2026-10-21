/**
 * Test fixture: a small "song" made of several instruments playing at once,
 * the kind of audio that Song mode has to handle:
 *   - the lead melody (Ode to Joy), sung with vibrato and harmonics, loudest,
 *   - chords (three-note triads) in octave 3, one chord per bar,
 *   - a bass line in octave 2, on every beat,
 *   - drums: a low "kick" on beats 1 and 3, a noise "snare" on 2 and 4.
 *
 * A pitch detector made for one note at a time (YIN) gets confused by this mix,
 * because the sound is no longer a single repeating waveform.
 */

import { midiToFrequency } from '../dsp/notes';
import { ODE_TO_JOY, ODE_TO_JOY_BPM } from './ode-to-joy';

const BEAT = 60 / ODE_TO_JOY_BPM;

/** One chord per bar (4 beats): C, G, C, G. MIDI notes of each triad. */
const CHORDS: number[][] = [
  [48, 52, 55], // C3 E3 G3
  [55, 59, 62], // G3 B3 D4
  [48, 52, 55],
  [55, 59, 62],
];

/** Bass note for each bar: the root of the chord, one octave lower. */
const BASS = [36, 43, 36, 43]; // C2, G2, C2, G2

export interface SongOptions {
  /** Level of the melody compared with the other instruments. 1 = default mix. */
  melodyLevel?: number;
}

/** Render the song. Its length matches the melody. */
export function renderSong(sampleRate: number, { melodyLevel = 1 }: SongOptions = {}): Float32Array {
  const totalSeconds = ODE_TO_JOY.reduce((sum, n) => sum + n.duration, 0);
  const output = new Float32Array(Math.round(totalSeconds * sampleRate));

  // Seeded random numbers so the drums are the same on every run.
  let seed = 11;
  const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

  // Melody: the voice from the hum fixture, simplified (vibrato, harmonics,
  // a short gap between notes so repeated notes are re-attacked).
  let phase = 0;
  let noteStart = 0;
  for (const note of ODE_TO_JOY) {
    if (note.midi === null) {
      noteStart += note.duration;
      continue;
    }
    const start = Math.round(noteStart * sampleRate);
    const sounding = Math.round((note.duration - 0.06) * sampleRate);
    for (let i = 0; i < sounding && start + i < output.length; i++) {
      const t = noteStart + i / sampleRate;
      const pitch = note.midi + 0.2 * Math.sin(2 * Math.PI * 5.5 * t);
      phase += (2 * Math.PI * midiToFrequency(pitch)) / sampleRate;
      const envelope = Math.min(1, i / (0.02 * sampleRate), (sounding - i) / (0.02 * sampleRate));
      const voice =
        Math.sin(phase) + 0.6 * Math.sin(2 * phase) + 0.3 * Math.sin(3 * phase) + 0.15 * Math.sin(4 * phase);
      output[start + i] += 0.2 * melodyLevel * envelope * voice;
    }
    noteStart += note.duration;
  }

  const beats = Math.floor(totalSeconds / BEAT);
  for (let beat = 0; beat < beats; beat++) {
    const bar = Math.floor(beat / 4) % CHORDS.length;
    const start = Math.round(beat * BEAT * sampleRate);
    const length = Math.round(BEAT * sampleRate);

    for (let i = 0; i < length && start + i < output.length; i++) {
      const t = i / sampleRate;
      // Chords and bass: a plucked sound that fades out over the beat.
      const pluck = Math.exp(-3 * t) * Math.min(1, i / (0.005 * sampleRate));
      let value = 0;
      for (const midi of CHORDS[bar]) {
        const f = midiToFrequency(midi);
        value += 0.06 * pluck * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t));
      }
      const bassF = midiToFrequency(BASS[bar]);
      value += 0.15 * pluck * (Math.sin(2 * Math.PI * bassF * t) + 0.3 * Math.sin(4 * Math.PI * bassF * t));

      // Drums. Kick: a sine that drops quickly in pitch. Snare: a burst of noise.
      if (beat % 2 === 0) {
        const kickF = 50 + 100 * Math.exp(-30 * t);
        value += 0.3 * Math.exp(-20 * t) * Math.sin(2 * Math.PI * kickF * t);
      } else {
        value += 0.15 * Math.exp(-25 * t) * (random() * 2 - 1);
      }
      output[start + i] += value;
    }
  }
  return output;
}
