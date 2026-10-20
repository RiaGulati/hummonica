/**
 * @jest-environment node
 */
import { frequencyToMidi, midiToFrequency, midiToName } from '../notes';
import { renderTone } from '../synth';
import { detectPitch } from '../yin';

const FRAME_SIZE = 2048;
const C4 = 60;
const C7 = 96;

/** Error between two frequencies in cents. */
function centsError(detected: number, expected: number): number {
  return (frequencyToMidi(detected) - frequencyToMidi(expected)) * 100;
}

/** Small seeded random number generator so the noise test is repeatable. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const semitones = Array.from({ length: C7 - C4 + 1 }, (_, i) => C4 + i);

describe.each([44100, 48000, 22050])('YIN at %i Hz', (sampleRate) => {
  it.each(semitones.map((midi) => [midiToName(midi), midi]))(
    'detects a pure sine at %s within 10 cents',
    (_name, midi) => {
      const frequency = midiToFrequency(midi as number);
      // An odd starting phase so we are not testing a lucky alignment.
      const frame = renderTone(frequency, FRAME_SIZE / sampleRate, sampleRate, {
        fadeMs: 0,
        phase: 1.234,
      });
      const result = detectPitch(frame, sampleRate);
      expect(Math.abs(centsError(result.frequency, frequency))).toBeLessThan(10);
      expect(result.confidence).toBeGreaterThan(0.9);
    }
  );
});

describe('YIN robustness', () => {
  const sampleRate = 44100;

  it.each(semitones.filter((m) => m % 3 === 0))(
    'does not make octave errors on a tone with strong harmonics (MIDI %i)',
    (midi) => {
      const frequency = midiToFrequency(midi);
      const frame = renderTone(frequency, FRAME_SIZE / sampleRate, sampleRate, {
        fadeMs: 0,
        harmonics: [1, 0.8, 0.6, 0.4],
      });
      const result = detectPitch(frame, sampleRate);
      expect(Math.abs(centsError(result.frequency, frequency))).toBeLessThan(10);
    }
  );

  it('detects a low hummed note below the harmonica range (G2, 98 Hz)', () => {
    const frequency = midiToFrequency(43);
    const frame = renderTone(frequency, FRAME_SIZE / sampleRate, sampleRate, { fadeMs: 0 });
    const result = detectPitch(frame, sampleRate);
    expect(Math.abs(centsError(result.frequency, frequency))).toBeLessThan(10);
  });

  it('gives low confidence for white noise', () => {
    const random = seededRandom(42);
    const frame = Float32Array.from({ length: FRAME_SIZE }, () => random() * 2 - 1);
    expect(detectPitch(frame, sampleRate).confidence).toBeLessThan(0.5);
  });

  it('gives zero confidence for silence', () => {
    expect(detectPitch(new Float32Array(FRAME_SIZE), sampleRate).confidence).toBe(0);
  });
});
