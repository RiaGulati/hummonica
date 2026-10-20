/**
 * YIN pitch detection.
 *
 * Reference: A. de Cheveigne and H. Kawahara, "YIN, a fundamental frequency
 * estimator for speech and music", Journal of the Acoustical Society of
 * America, 2002.
 *
 * The idea: a periodic signal repeats itself every T samples (T is the
 * "period"). If we compare the signal with a copy of itself shifted by some lag
 * "tau", the two line up almost perfectly when tau equals T. YIN measures how
 * badly they line up for every candidate lag and picks the best one. The pitch
 * is then sampleRate / T.
 *
 * The algorithm has four steps, each marked below:
 *   1. Difference function: how different is the signal from itself shifted by tau?
 *   2. Cumulative mean normalized difference: rescale step 1 so a single
 *      threshold works for loud and quiet signals, and so tau = 0 is never chosen.
 *   3. Absolute threshold: take the FIRST lag whose normalized difference drops
 *      below the threshold. Choosing the first dip (not the deepest) avoids
 *      "octave errors", where a lag of 2T or 3T is picked by mistake.
 *   4. Parabolic interpolation: the true period is rarely a whole number of
 *      samples, so fit a parabola through the best lag and its neighbours to
 *      estimate the minimum between samples. This matters most for high notes,
 *      where the period is only about 20 samples long.
 */

export interface YinOptions {
  /** Step 3 threshold. Lower is stricter. The paper suggests 0.10 to 0.15. */
  threshold?: number;
  /** Lowest frequency to search for, in Hz. Sets the longest lag examined. */
  minFrequency?: number;
  /** Highest frequency to search for, in Hz. Sets the shortest lag examined. */
  maxFrequency?: number;
}

export const DEFAULT_YIN_OPTIONS: Required<YinOptions> = {
  threshold: 0.15,
  // Low enough for a deep hummed voice. Such notes are later shifted up into
  // harmonica range by whole octaves.
  minFrequency: 70,
  // A little above C7 (2093 Hz), the top note of a C harmonica.
  maxFrequency: 2200,
};

export interface PitchEstimate {
  /** Detected fundamental frequency in Hz. */
  frequency: number;
  /**
   * How periodic the frame is, from 0 (noise) to 1 (perfectly periodic).
   * Computed as 1 minus the normalized difference at the chosen lag.
   */
  confidence: number;
}

/**
 * Estimate the pitch of one frame of audio.
 *
 * @param frame Audio samples. Only the first half is used as the comparison
 *   window; the second half supplies the shifted copy. With 2048 samples the
 *   window is 1024 samples long.
 * @param sampleRate Samples per second, for example 44100.
 */
export function detectPitch(
  frame: ArrayLike<number>,
  sampleRate: number,
  options: YinOptions = {}
): PitchEstimate {
  const { threshold, minFrequency, maxFrequency } = { ...DEFAULT_YIN_OPTIONS, ...options };

  // W in the paper: the number of samples compared at each lag.
  const windowSize = Math.floor(frame.length / 2);

  // A high frequency has a short period, so maxFrequency gives the smallest lag
  // and minFrequency the largest. tauMin is at least 2 so step 4 always has a
  // left neighbour. tauMax stops one short of the window so step 4 always has a
  // right neighbour.
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const tauMax = Math.min(windowSize - 1, Math.ceil(sampleRate / minFrequency));
  if (tauMax <= tauMin) {
    return { frequency: 0, confidence: 0 };
  }

  // Step 1: difference function.
  //   d(tau) = sum over j of (x[j] - x[j + tau])^2
  // d(tau) is close to zero when shifting by tau lines the signal up with itself.
  const difference = new Float64Array(tauMax + 2);
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      const delta = frame[j] - frame[j + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }

  // Step 2: cumulative mean normalized difference (CMND).
  //   d'(0)   = 1
  //   d'(tau) = d(tau) / (average of d(1) .. d(tau))
  // Plain d(tau) is also small for very short lags, simply because neighbouring
  // samples are similar. Dividing by the running average removes that bias and
  // makes the values independent of loudness, so one threshold fits all inputs.
  const normalized = new Float64Array(tauMax + 2);
  normalized[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    runningSum += difference[tau];
    normalized[tau] = runningSum === 0 ? 1 : (difference[tau] * tau) / runningSum;
  }

  // Step 3: absolute threshold.
  // Find the first lag that dips below the threshold, then keep walking while
  // the curve still goes down so we land on the bottom of that dip.
  let bestTau = -1;
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (normalized[tau] < threshold) {
      while (tau + 1 <= tauMax && normalized[tau + 1] < normalized[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }

  // Nothing dipped below the threshold: the frame is probably noise or
  // silence. Fall back to the deepest dip so the caller still gets an estimate,
  // but its confidence will be low and it will normally be discarded.
  if (bestTau === -1) {
    bestTau = tauMin;
    for (let tau = tauMin + 1; tau <= tauMax; tau++) {
      if (normalized[tau] < normalized[bestTau]) {
        bestTau = tau;
      }
    }
  }

  // Step 4: parabolic interpolation.
  // Fit a parabola through the three points (bestTau - 1, a), (bestTau, b) and
  // (bestTau + 1, c). Its lowest point is offset from bestTau by
  //   0.5 * (a - c) / (a - 2b + c)
  // which gives the period to a fraction of a sample.
  const a = normalized[bestTau - 1];
  const b = normalized[bestTau];
  const c = normalized[bestTau + 1];
  const curvature = a - 2 * b + c;
  let offset = curvature > 0 ? (0.5 * (a - c)) / curvature : 0;
  offset = Math.max(-1, Math.min(1, offset));
  const period = bestTau + offset;

  return {
    frequency: sampleRate / period,
    confidence: Math.max(0, Math.min(1, 1 - b)),
  };
}
