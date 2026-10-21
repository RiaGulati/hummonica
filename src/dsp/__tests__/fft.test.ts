/**
 * @jest-environment node
 */
import { fft, hannWindow, magnitudeSpectrum } from '../fft';
import { renderTone } from '../synth';

describe('fft', () => {
  it('matches a direct (slow) Fourier transform', () => {
    const n = 64;
    const input = Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1));
    const real = Float64Array.from(input);
    const imag = new Float64Array(n);
    fft(real, imag);

    for (let k = 0; k < n; k++) {
      let re = 0;
      let im = 0;
      for (let t = 0; t < n; t++) {
        re += input[t] * Math.cos((-2 * Math.PI * k * t) / n);
        im += input[t] * Math.sin((-2 * Math.PI * k * t) / n);
      }
      expect(real[k]).toBeCloseTo(re, 8);
      expect(imag[k]).toBeCloseTo(im, 8);
    }
  });

  it('rejects sizes that are not a power of two', () => {
    expect(() => fft(new Float64Array(100), new Float64Array(100))).toThrow();
  });

  it('puts a 1000 Hz tone in the right frequency bin', () => {
    const size = 4096;
    const sampleRate = 44100;
    const tone = renderTone(1000, size / sampleRate, sampleRate, { fadeMs: 0 });
    const spectrum = magnitudeSpectrum(tone, hannWindow(size));
    const loudestBin = spectrum.indexOf(Math.max(...spectrum));
    expect(loudestBin * (sampleRate / size)).toBeCloseTo(1000, -1);
  });
});
