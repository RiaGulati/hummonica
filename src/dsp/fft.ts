/**
 * Fast Fourier Transform (radix-2 Cooley-Tukey).
 *
 * The Fourier transform rewrites a block of audio as a sum of sine waves and
 * tells us how strong each frequency is. A direct calculation takes N * N
 * steps; the FFT gets the same answer in about N * log2(N) steps by splitting
 * the problem in half again and again (even samples and odd samples), which
 * for N = 4096 is about 340 times less work.
 *
 * The size must be a power of two.
 */

/**
 * Values that depend only on the FFT size, computed once and reused for every
 * frame: the bit-reversed position of each index, and the "twiddle factors"
 * cos(2 pi k / n) and sin(2 pi k / n). Calling Math.cos and Math.sin inside the
 * inner loop made the FFT about 20 times slower, which matters on a phone.
 */
interface FftTables {
  reversed: Uint32Array;
  cos: Float64Array;
  sin: Float64Array;
}

const tableCache = new Map<number, FftTables>();

function tablesFor(n: number): FftTables {
  let tables = tableCache.get(n);
  if (tables) return tables;

  const reversed = new Uint32Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    reversed[i] = j;
  }
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) {
    cos[k] = Math.cos((-2 * Math.PI * k) / n);
    sin[k] = Math.sin((-2 * Math.PI * k) / n);
  }
  tables = { reversed, cos, sin };
  tableCache.set(n, tables);
  return tables;
}

/** In-place FFT. `real` and `imag` hold the input and receive the output. */
export function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) throw new Error('FFT size must be a power of two');
  const { reversed, cos, sin } = tablesFor(n);

  // Step 1: reorder the input into bit-reversed order. After this, the
  // butterflies below can work on neighbouring blocks.
  for (let i = 1; i < n; i++) {
    const j = reversed[i];
    if (i < j) {
      let swap = real[i];
      real[i] = real[j];
      real[j] = swap;
      swap = imag[i];
      imag[i] = imag[j];
      imag[j] = swap;
    }
  }

  // Step 2: combine blocks of size 2, 4, 8, ... n. Each "butterfly" merges the
  // transforms of two half-size blocks using a rotation (the twiddle factor).
  // The rotation for step k of a block of this size is entry k * (n / size)
  // of the tables, because cos(2 pi k / size) = cos(2 pi k (n / size) / n).
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const stride = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const c = cos[k * stride];
        const s = sin[k * stride];
        const a = start + k;
        const b = a + half;
        const tr = real[b] * c - imag[b] * s;
        const ti = real[b] * s + imag[b] * c;
        real[b] = real[a] - tr;
        imag[b] = imag[a] - ti;
        real[a] += tr;
        imag[a] += ti;
      }
    }
  }
}

/** Hann window: fades a frame in and out so its edges do not create false frequencies. */
export function hannWindow(size: number): Float64Array {
  const window = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  return window;
}

/**
 * Magnitude spectrum of a frame: how strong each frequency is. Bin k is the
 * frequency k * sampleRate / size. Only the first half is returned, because
 * for real-valued audio the second half mirrors the first.
 */
export function magnitudeSpectrum(frame: ArrayLike<number>, window: Float64Array): Float64Array {
  const n = window.length;
  const real = new Float64Array(n);
  const imag = new Float64Array(n);
  for (let i = 0; i < n; i++) real[i] = frame[i] * window[i];
  fft(real, imag);
  const magnitudes = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) {
    magnitudes[k] = Math.hypot(real[k], imag[k]);
  }
  return magnitudes;
}
