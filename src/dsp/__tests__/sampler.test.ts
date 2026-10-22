/**
 * @jest-environment node
 */
/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

import { HARMONICA_SAMPLE_FILES } from '../../audio/harmonica-sample-map';
import { ALL_POSITIONS } from '../../harmonica/layout';
import { median, midiToFrequency, PitchTracker, rms } from '../index';
import { nearestSample, renderSampledNote, type HarmonicaSample } from '../sampler';
import { decodeWav } from '../wav';

const RATE = 44100;
const ASSETS = join(__dirname, '../../../assets/harmonica');

// Load the real samples from disk, the way the app loads them from its assets.
const NAMES = ['4_b', '5_e', '5_ab', '6_c', '6_e'];
const bank: HarmonicaSample[] = HARMONICA_SAMPLE_FILES.map((file, i) => ({
  midi: file.midi,
  sampleRate: RATE,
  held: decodeWav(readFileSync(join(ASSETS, `${NAMES[i]}.wav`))).samples,
  release: decodeWav(readFileSync(join(ASSETS, `${NAMES[i]}-release.wav`))).samples,
  loopStart: file.loopStart,
  loopEnd: file.loopEnd,
}));

function measuredMidi(audio: Float32Array): number {
  const voiced = new PitchTracker(RATE).push(audio).filter((f) => f.voiced);
  return median(voiced.map((f) => f.midi));
}

describe('sampler', () => {
  it('uses the nearest recorded note, preferring to shift down on a tie', () => {
    expect(nearestSample(bank, 77).midi).toBe(76);
    expect(nearestSample(bank, 78).midi).toBe(80); // 2 from E5 and G#5: use G#5
    expect(nearestSample(bank, 60).midi).toBe(71);
  });

  it('plays every note of the harmonica at the right pitch', () => {
    const notes = [...new Set(ALL_POSITIONS.map((p) => p.midi))].sort((a, b) => a - b);
    for (const midi of notes) {
      const audio = renderSampledNote(bank, midiToFrequency(midi), 0.6, RATE);
      expect([midi, Math.round(measuredMidi(audio))]).toEqual([midi, midi]);
    }
  });

  it('keeps a long note going by looping, without gaps', () => {
    // E5 has the shortest loop (42 ms), so a 3 s note repeats it many times.
    const audio = renderSampledNote(bank, midiToFrequency(76), 3, RATE);
    const levels: number[] = [];
    for (let t = 0.2; t < 2.6; t += 0.1) levels.push(rms(audio.subarray(t * RATE, (t + 0.1) * RATE)));
    expect(Math.min(...levels)).toBeGreaterThan(0.5 * Math.max(...levels));
  });

  it('has loop points inside every sample', () => {
    for (const sample of bank) expect(sample.loopEnd).toBeLessThanOrEqual(sample.held.length);
  });

  it('ends quietly and never clips', () => {
    for (const duration of [0.08, 0.3, 1.5]) {
      const audio = renderSampledNote(bank, midiToFrequency(72), duration, RATE);
      expect(audio.length).toBe(Math.round(duration * RATE));
      expect(Math.abs(audio[audio.length - 1])).toBeLessThan(0.01);
      expect(Math.max(...audio.map(Math.abs))).toBeLessThan(1);
    }
  });
});
