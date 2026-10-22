/**
 * Melody extraction for full songs ("Song" mode).
 *
 * YIN assumes the sound is a single note, so it fails when a singer is mixed
 * with chords, bass and drums. This module follows the idea of the Melodia
 * algorithm (J. Salamon and E. Gomez, "Melody Extraction From Polyphonic Music
 * Signals Using Pitch Contour Characteristics", IEEE TASLP, 2012), simplified:
 *
 *   1. Spectrum: an FFT of each frame shows which frequencies are present.
 *   2. Peaks: keep only the local maxima of the spectrum (the partials of the
 *      instruments), with their exact frequency found by parabolic interpolation.
 *   3. Salience: for every candidate pitch, add up the energy of the peaks that
 *      could be its harmonics (1x, 2x, 3x ... the pitch). A real note has energy
 *      at all its harmonics, so its candidate collects a lot. Higher harmonics
 *      count a little less (each one is weighted 0.8 times the one before).
 *   4. Candidates: the few strongest pitches in each frame.
 *   5. Tracking and voicing: the lead melody is usually the strongest voice
 *      AND moves smoothly, AND it sometimes rests (between notes or phrases)
 *      while the band keeps playing. Dynamic programming (the same Viterbi idea
 *      as the hole chooser) picks, for every frame, either one candidate or
 *      "no melody", so that the total cost is as small as possible:
 *        - choosing a weaker candidate than the frame's best costs a little,
 *        - jumping in pitch costs a little per semitone,
 *        - "no melody" costs more the stronger the frame's best candidate is,
 *        - switching between melody and "no melody" costs a little.
 *      Without the "no melody" choice, the gap between two sung notes would be
 *      filled with a chord note, because some pitch has to be chosen.
 *
 * The result has the same PitchFrame format as PitchTracker, so the same
 * segmentation, tuning correction and tab code can be used afterwards.
 */

import { hannWindow, magnitudeSpectrum } from './fft';
import { frequencyToMidi, midiToFrequency } from './notes';
import { median } from './segment';
import { rms, type PitchFrame } from './tracker';

export interface MelodyTrackerOptions {
  /** FFT size. 4096 samples at 44.1 kHz separates frequencies about 11 Hz apart. */
  frameSize?: number;
  hopSize?: number;
  /**
   * Lowest melody note considered (MIDI). 55 = G3. Lower pitches in a song are
   * mostly bass and chords, and choosing them caused octave errors on real
   * recordings. Low male voices still work: their notes are found an octave up,
   * which the harmonica tab moves back with the octave transposer.
   */
  minMidi?: number;
  /** Highest melody note considered (MIDI). 93 = A6. */
  maxMidi?: number;
  /** Number of harmonics added up for each candidate pitch. */
  harmonics?: number;
  /** Weight of each harmonic compared with the previous one. */
  harmonicDecay?: number;
  /** Ignore spectral peaks this many dB below the loudest peak of the frame. */
  peakFloorDb?: number;
  /** Candidate pitches kept per frame. */
  candidates?: number;
  /** Cost of a pitch jump per semitone, compared with the log of salience ratios. */
  jumpPenalty?: number;
  /**
   * Salience, as a fraction of the typical (median) melody salience, at which
   * "melody" and "no melody" cost the same. Weaker frames lean to "no melody".
   */
  voicingRatio?: number;
  /** Cost of switching between melody and "no melody". Stops rapid flicker. */
  voicingSwitchPenalty?: number;
  /** Frames quieter than this RMS are silence. */
  minRms?: number;
}

export const DEFAULT_MELODY_TRACKER_OPTIONS: Required<MelodyTrackerOptions> = {
  frameSize: 4096,
  hopSize: 512,
  minMidi: 55,
  maxMidi: 93,
  harmonics: 8,
  harmonicDecay: 0.8,
  peakFloorDb: -40,
  candidates: 5,
  jumpPenalty: 0.3,
  voicingRatio: 0.3,
  voicingSwitchPenalty: 0.5,
  minRms: 0.005,
};

/** Salience is computed on a grid of 10-cent steps (10 bins per semitone). */
const BINS_PER_SEMITONE = 10;
/** Partials above this frequency add little and are skipped to save time. */
const MAX_PEAK_FREQUENCY = 5000;

export interface PitchCandidate {
  /** Fractional MIDI value. */
  midi: number;
  /** How much harmonic energy supports this pitch. */
  salience: number;
}

interface CandidateFrame {
  time: number;
  rms: number;
  candidates: PitchCandidate[];
}

interface SpectralPeak {
  frequency: number;
  magnitude: number;
}

/** Steps 1 and 2: the peaks of the spectrum. */
function findPeaks(spectrum: Float64Array, sampleRate: number, floorDb: number): SpectralPeak[] {
  const binHz = sampleRate / (spectrum.length * 2);
  const maxBin = Math.min(spectrum.length - 2, Math.floor(MAX_PEAK_FREQUENCY / binHz));
  let loudest = 0;
  for (let k = 1; k <= maxBin; k++) loudest = Math.max(loudest, spectrum[k]);
  if (loudest === 0) return [];
  const floor = loudest * Math.pow(10, floorDb / 20);

  const peaks: SpectralPeak[] = [];
  for (let k = 1; k <= maxBin; k++) {
    const m = spectrum[k];
    if (m < floor || m <= spectrum[k - 1] || m < spectrum[k + 1]) continue;
    // Parabolic interpolation on the log magnitudes, like YIN step 4. A peak
    // usually falls between two bins; this finds where.
    const a = Math.log(spectrum[k - 1] + 1e-12);
    const b = Math.log(m);
    const c = Math.log(spectrum[k + 1] + 1e-12);
    const curvature = a - 2 * b + c;
    const offset = curvature < 0 ? (0.5 * (a - c)) / curvature : 0;
    peaks.push({
      frequency: (k + offset) * binHz,
      magnitude: Math.exp(b - 0.25 * (a - c) * offset),
    });
  }
  return peaks;
}

/** Steps 3 and 4: harmonic-sum salience and the strongest candidate pitches. */
function salienceCandidates(peaks: SpectralPeak[], opts: Required<MelodyTrackerOptions>): PitchCandidate[] {
  const binCount = (opts.maxMidi - opts.minMidi) * BINS_PER_SEMITONE + 1;
  const salience = new Float64Array(binCount);

  for (const peak of peaks) {
    let weight = peak.magnitude;
    for (let h = 1; h <= opts.harmonics; h++, weight *= opts.harmonicDecay) {
      // If this peak is harmonic number h, the note's pitch is frequency / h.
      const pitch = frequencyToMidi(peak.frequency / h);
      if (pitch < opts.minMidi - 1) break;
      if (pitch > opts.maxMidi + 1) continue;
      // Spread the contribution over +-1 semitone with a cos^2 bump, so a
      // slightly mistuned harmonic still counts for the nearby pitch.
      const centre = (pitch - opts.minMidi) * BINS_PER_SEMITONE;
      const from = Math.max(0, Math.ceil(centre - BINS_PER_SEMITONE));
      const to = Math.min(binCount - 1, Math.floor(centre + BINS_PER_SEMITONE));
      for (let bin = from; bin <= to; bin++) {
        const distance = (bin - centre) / BINS_PER_SEMITONE;
        const bump = Math.cos((distance * Math.PI) / 2);
        salience[bin] += weight * bump * bump;
      }
    }
  }

  // Local maxima of the salience curve are the candidate pitches.
  const candidates: PitchCandidate[] = [];
  for (let bin = 1; bin < binCount - 1; bin++) {
    const s = salience[bin];
    if (s <= 0 || s <= salience[bin - 1] || s < salience[bin + 1]) continue;
    const a = salience[bin - 1];
    const c = salience[bin + 1];
    const curvature = a - 2 * s + c;
    const offset = curvature < 0 ? (0.5 * (a - c)) / curvature : 0;
    candidates.push({ midi: opts.minMidi + (bin + offset) / BINS_PER_SEMITONE, salience: s });
  }
  candidates.sort((x, y) => y.salience - x.salience);
  const strongest = candidates[0]?.salience ?? 0;
  return candidates.slice(0, opts.candidates).filter((c) => c.salience >= strongest * 0.1);
}

/**
 * Step 5: choose one candidate, or "no melody" (null), for every frame,
 * minimizing the total cost described at the top of this file (Viterbi).
 *
 * The states of a frame are its candidates plus one extra "no melody" state,
 * stored at index candidates.length.
 */
function trackMelody(
  frames: CandidateFrame[],
  typical: number,
  opts: Required<MelodyTrackerOptions>
): (PitchCandidate | null)[] {
  const threshold = typical * opts.voicingRatio;
  const costs: number[][] = [];
  const previous: number[][] = [];

  frames.forEach((frame, t) => {
    const states = frame.candidates.length;
    const strongest = frame.candidates[0]?.salience ?? 0;
    // How far the frame's best candidate is above (> 0) or below (< 0) the
    // voicing threshold, on a log scale. Above makes "no melody" expensive,
    // below makes every candidate expensive.
    const level = strongest > 0 && threshold > 0 ? Math.log(strongest / threshold) : -Infinity;
    costs.push([]);
    previous.push([]);

    for (let k = 0; k <= states; k++) {
      const candidate = k < states ? frame.candidates[k] : null;
      const own = candidate
        ? -Math.log(candidate.salience / strongest) + Math.max(0, -level)
        : Math.max(0, level);
      if (t === 0) {
        costs[t][k] = own;
        previous[t][k] = -1;
        continue;
      }

      const before = frames[t - 1].candidates;
      let best = Infinity;
      let bestPrevious = 0;
      for (let p = 0; p <= before.length; p++) {
        const prev = p < before.length ? before[p] : null;
        let transition = 0;
        if (candidate && prev) transition = opts.jumpPenalty * Math.abs(candidate.midi - prev.midi);
        else if (candidate !== null || prev !== null) transition = opts.voicingSwitchPenalty;
        const total = costs[t - 1][p] + transition;
        if (total < best) {
          best = total;
          bestPrevious = p;
        }
      }
      costs[t][k] = best + own;
      previous[t][k] = bestPrevious;
    }
  });

  // Walk back from the cheapest final state.
  const path: (PitchCandidate | null)[] = new Array(frames.length);
  const last = frames.length - 1;
  if (last < 0) return path;
  let k = costs[last].indexOf(Math.min(...costs[last]));
  for (let t = last; t >= 0; t--) {
    const candidates = frames[t].candidates;
    path[t] = k < candidates.length ? candidates[k] : null;
    k = previous[t][k];
  }
  return path;
}

export class MelodyTracker {
  private readonly opts: Required<MelodyTrackerOptions>;
  private readonly window: Float64Array;
  private buffer = new Float32Array(0);
  private bufferStart = 0;
  private frames: CandidateFrame[] = [];

  constructor(
    readonly sampleRate: number,
    options: MelodyTrackerOptions = {}
  ) {
    this.opts = { ...DEFAULT_MELODY_TRACKER_OPTIONS, ...options };
    this.window = hannWindow(this.opts.frameSize);
  }

  get hopSeconds(): number {
    return this.opts.hopSize / this.sampleRate;
  }

  /**
   * Add samples. Returns a quick preview for each new frame (its strongest
   * candidate) for the live display. The real melody is only known after
   * finish(), because tracking looks at the whole recording.
   */
  push(chunk: Float32Array): PitchFrame[] {
    const { frameSize, hopSize, minRms, peakFloorDb } = this.opts;
    const combined = new Float32Array(this.buffer.length + chunk.length);
    combined.set(this.buffer, 0);
    combined.set(chunk, this.buffer.length);

    const preview: PitchFrame[] = [];
    let offset = 0;
    while (offset + frameSize <= combined.length) {
      const frame = combined.subarray(offset, offset + frameSize);
      const time = (this.bufferStart + offset + frameSize / 2) / this.sampleRate;
      const loudness = rms(frame);
      const candidates =
        loudness < minRms
          ? []
          : salienceCandidates(
              findPeaks(magnitudeSpectrum(frame, this.window), this.sampleRate, peakFloorDb),
              this.opts
            );
      this.frames.push({ time, rms: loudness, candidates });

      const top = candidates[0];
      preview.push({
        time,
        frequency: top ? midiToFrequency(top.midi) : 0,
        confidence: top ? 1 : 0,
        rms: loudness,
        voiced: top !== undefined,
        midi: top ? top.midi : NaN,
      });
      offset += hopSize;
    }
    this.buffer = combined.slice(offset);
    this.bufferStart += offset;
    return preview;
  }

  /** Step 5 over the whole recording. Returns the melody as pitch frames. */
  finish(): PitchFrame[] {
    // "Typical" melody strength: the median best salience of the frames with sound.
    const sounding = this.frames.filter((f) => f.candidates.length > 0).map((f) => f.candidates[0].salience);
    const typical = sounding.length > 0 ? median(sounding) : 0;
    const path = trackMelody(this.frames, typical, this.opts);

    return this.frames.map((frame, t) => {
      const candidate = path[t];
      if (!candidate) {
        return { time: frame.time, frequency: 0, confidence: 0, rms: 0, voiced: false, midi: NaN };
      }
      return {
        time: frame.time,
        frequency: midiToFrequency(candidate.midi),
        confidence: Math.min(1, candidate.salience / typical),
        // The segmenter looks for jumps in loudness to find re-attacked
        // notes. In a song the whole mix stays loud, so we give it the
        // loudness of the melody itself: the salience of the chosen pitch.
        rms: candidate.salience,
        voiced: true,
        midi: candidate.midi,
      };
    });
  }
}
