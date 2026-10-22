/**
 * A harmonica-like voice for playback.
 *
 * A harmonica is a "free reed" instrument: each note is a small brass tongue
 * that the breath makes swing through a slot, opening and closing the air
 * flow hundreds of times a second. That chopped air flow is a buzzy pulse,
 * rich in harmonics (whole-number multiples of the note's frequency). The
 * cover plates and the player's mouth then boost a band of frequencies around
 * 1 to 3 kHz, which gives the harmonica its bright, slightly nasal sound.
 *
 * We imitate that with:
 *   1. Additive synthesis: build one cycle of the waveform by adding the
 *      harmonics with those strengths (a "wavetable"), then play the cycle over
 *      and over. Reading a table is much cheaper than calling Math.sin for
 *      every harmonic of every sample, which matters on a phone.
 *   2. A breathy start: the note fades in over ~35 ms and starts a little flat,
 *      sliding up to pitch, like a reed getting going.
 *   3. A gentle tremolo (throat vibrato) on longer notes.
 *   4. A little air noise, as heard on real recordings.
 */

/** Samples in one stored cycle. Large enough that reading between them is smooth. */
const TABLE_SIZE = 2048;
/** Centre and width (in octaves) of the resonance band that makes the tone bright. */
const RESONANCE_HZ = 1600;
const RESONANCE_WIDTH_OCTAVES = 0.7;
/** Harmonics above this are left out: they add little and can alias. */
const MAX_HARMONIC_HZ = 8000;

const ATTACK_SECONDS = 0.035;
const RELEASE_SECONDS = 0.06;
/** The note starts this many cents flat and slides up over SCOOP_SECONDS. */
const SCOOP_CENTS = 25;
const SCOOP_SECONDS = 0.05;
/** Tremolo: a slow wobble in loudness, only on notes longer than TREMOLO_AFTER. */
const TREMOLO_HZ = 5;
const TREMOLO_DEPTH = 0.12;
const TREMOLO_AFTER_SECONDS = 0.35;
const BREATH_LEVEL = 0.025;

/** Strength of harmonic number n (1 = the note itself) for a note of frequency f. */
export function reedHarmonicStrength(n: number, frequency: number): number {
  // The buzzy pulse: harmonics get weaker roughly as 1 / n.
  const source = 1 / n;
  // The resonance: a bump (a bell curve on a log-frequency scale) around RESONANCE_HZ.
  const octavesAway = Math.log2((n * frequency) / RESONANCE_HZ);
  const resonance = 1 + 2.5 * Math.exp(-(octavesAway ** 2) / (2 * RESONANCE_WIDTH_OCTAVES ** 2));
  return source * resonance;
}

/** One cycle of the reed waveform for this frequency, scaled to a peak of 1. */
function buildCycle(frequency: number, sampleRate: number): Float32Array {
  const table = new Float32Array(TABLE_SIZE);
  const limit = Math.min(MAX_HARMONIC_HZ, 0.45 * sampleRate);
  for (let n = 1; n * frequency < limit; n++) {
    const strength = reedHarmonicStrength(n, frequency);
    for (let i = 0; i < TABLE_SIZE; i++) {
      table[i] += strength * Math.sin((2 * Math.PI * n * i) / TABLE_SIZE);
    }
  }
  let peak = 0;
  for (const value of table) peak = Math.max(peak, Math.abs(value));
  for (let i = 0; i < TABLE_SIZE; i++) table[i] /= peak || 1;
  return table;
}

/** Cycles are reused for repeated notes (a tune uses only a few different pitches). */
const cycleCache = new Map<string, Float32Array>();

function cycleFor(frequency: number, sampleRate: number): Float32Array {
  const key = `${frequency.toFixed(3)}@${sampleRate}`;
  let cycle = cycleCache.get(key);
  if (!cycle) {
    cycle = buildCycle(frequency, sampleRate);
    cycleCache.set(key, cycle);
  }
  return cycle;
}

/** Render one harmonica-like note. Its sound ends (fades out) within `durationSeconds`. */
export function renderReedNote(
  frequency: number,
  durationSeconds: number,
  sampleRate: number,
  amplitude = 0.4
): Float32Array {
  const cycle = cycleFor(frequency, sampleRate);
  const length = Math.round(durationSeconds * sampleRate);
  const output = new Float32Array(length);
  const attack = Math.min(ATTACK_SECONDS * sampleRate, length / 3);
  const release = Math.min(RELEASE_SECONDS * sampleRate, length / 3);

  // Seeded random numbers, so the same tab always sounds the same.
  let seed = 12345;
  let previousNoise = 0;

  let phase = 0; // position in the cycle, from 0 to TABLE_SIZE
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;

    // Pitch: start slightly flat and slide up to the note.
    const scoop = t < SCOOP_SECONDS ? SCOOP_CENTS * (1 - t / SCOOP_SECONDS) : 0;
    const currentFrequency = frequency * Math.pow(2, -scoop / 1200);
    phase += (currentFrequency * TABLE_SIZE) / sampleRate;
    if (phase >= TABLE_SIZE) phase -= TABLE_SIZE;

    // Read the cycle, blending the two nearest stored samples.
    const index = Math.floor(phase);
    const fraction = phase - index;
    const next = index + 1 === TABLE_SIZE ? 0 : index + 1;
    const tone = cycle[index] + fraction * (cycle[next] - cycle[index]);

    // Air noise. Subtracting the previous value keeps only the hiss (high
    // frequencies), which sounds like breath rather than a rumble.
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const noise = seed / 4294967296 - 0.5;
    const breath = noise - previousNoise;
    previousNoise = noise;

    // Loudness: smooth fade in and out (a quarter sine), plus tremolo.
    let envelope = 1;
    if (i < attack) envelope = Math.sin((Math.PI / 2) * (i / attack));
    else if (i > length - release) envelope = Math.sin((Math.PI / 2) * ((length - i) / release));
    const tremolo =
      t > TREMOLO_AFTER_SECONDS
        ? 1 - TREMOLO_DEPTH * 0.5 * (1 - Math.cos(2 * Math.PI * TREMOLO_HZ * (t - TREMOLO_AFTER_SECONDS)))
        : 1;

    output[i] = amplitude * envelope * tremolo * (tone + BREATH_LEVEL * breath);
  }
  return output;
}
