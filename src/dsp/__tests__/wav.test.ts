/**
 * @jest-environment node
 */
import { decodeWav, encodeWav } from '../wav';

describe('wav', () => {
  it('round-trips samples through encode and decode', () => {
    const samples = Float32Array.from([0, 0.5, -0.5, 1, -1, 0.25]);
    const decoded = decodeWav(encodeWav(samples, 48000));
    expect(decoded.sampleRate).toBe(48000);
    expect(decoded.samples.length).toBe(samples.length);
    samples.forEach((s, i) => expect(decoded.samples[i]).toBeCloseTo(s, 3));
  });

  it('clips samples outside -1..1', () => {
    const decoded = decodeWav(encodeWav(Float32Array.from([2, -2]), 44100));
    expect(decoded.samples[0]).toBeCloseTo(1, 3);
    expect(decoded.samples[1]).toBeCloseTo(-1, 3);
  });

  it('mixes stereo down to mono and skips unknown chunks', () => {
    // Build a stereo 16-bit file by hand, with a "LIST" chunk before "data".
    const frames = [
      [0.5, -0.5],
      [0.5, 0.5],
    ];
    const header = 12 + 24 + 12 + 8;
    const bytes = new Uint8Array(header + frames.length * 4);
    const view = new DataView(bytes.buffer);
    const text = (at: number, s: string) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
    text(0, 'RIFF');
    view.setUint32(4, bytes.length - 8, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, 22050, true);
    view.setUint16(34, 16, true);
    text(36, 'LIST');
    view.setUint32(40, 4, true);
    text(48, 'data');
    view.setUint32(52, frames.length * 4, true);
    frames.flat().forEach((s, i) => view.setInt16(56 + i * 2, s * 0x7fff, true));

    const decoded = decodeWav(bytes);
    expect(decoded.sampleRate).toBe(22050);
    expect(decoded.samples[0]).toBeCloseTo(0, 3);
    expect(decoded.samples[1]).toBeCloseTo(0.5, 3);
  });

  it('rejects files that are not WAV', () => {
    expect(() => decodeWav(new Uint8Array(40))).toThrow('Not a WAV file');
  });
});
