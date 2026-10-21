/**
 * Reading and writing WAV files, in plain TypeScript.
 *
 * A WAV file is a short header followed by the raw samples. The header is a
 * list of "chunks", each starting with a 4-letter name and its length:
 *   "RIFF" <size> "WAVE"
 *   "fmt " <size> <format, channels, sample rate, ... bits per sample>
 *   "data" <size> <the samples>
 * Other chunks (for example "LIST" with metadata) may appear and are skipped.
 * All numbers are little-endian (lowest byte first).
 */

export interface WavAudio {
  /** Mono samples from -1 to 1. Multi-channel files are mixed down. */
  samples: Float32Array;
  sampleRate: number;
}

/** WAV format codes. */
const FORMAT_PCM = 1;
const FORMAT_FLOAT = 3;
const FORMAT_EXTENSIBLE = 0xfffe;

const HEADER_SIZE = 44;

/** Encode mono samples (-1 to 1) as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const bytes = new Uint8Array(HEADER_SIZE + dataSize);
  const view = new DataView(bytes.buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, HEADER_SIZE - 8 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // size of the fmt chunk
  view.setUint16(20, FORMAT_PCM, true);
  view.setUint16(22, 1, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes per second
  view.setUint16(32, 2, true); // bytes per sample frame
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    // Clip to -1..1, then scale to the 16-bit range -32768..32767.
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(HEADER_SIZE + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}

/** Decode a WAV file (8, 16, 24 or 32-bit PCM, or 32-bit float) to mono samples. */
export function decodeWav(bytes: Uint8Array): WavAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const readText = (offset: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + 4));

  if (bytes.length < 12 || readText(0) !== 'RIFF' || readText(8) !== 'WAVE') {
    throw new Error('Not a WAV file');
  }

  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const name = readText(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;

    if (name === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
      // "Extensible" files keep the real format code further into the chunk.
      if (format === FORMAT_EXTENSIBLE && size >= 26) format = view.getUint16(body + 24, true);
    } else if (name === 'data') {
      if (format !== FORMAT_PCM && format !== FORMAT_FLOAT) {
        throw new Error(`Unsupported WAV format ${format}`);
      }
      const bytesPerSample = bits / 8;
      // Some recorders write a wrong size; never read past the end of the file.
      const available = Math.min(size, bytes.length - body);
      const frameCount = Math.floor(available / (bytesPerSample * channels));
      const samples = new Float32Array(frameCount);

      for (let i = 0; i < frameCount; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) {
          sum += readSample(view, body + (i * channels + c) * bytesPerSample, bits, format);
        }
        samples[i] = sum / channels;
      }
      return { samples, sampleRate };
    }
    // Chunks are padded to an even number of bytes.
    offset = body + size + (size % 2);
  }
  throw new Error('WAV file has no audio data');
}

/** Read one sample and scale it to -1..1. */
function readSample(view: DataView, at: number, bits: number, format: number): number {
  if (format === FORMAT_FLOAT) {
    if (bits === 32) return view.getFloat32(at, true);
    if (bits === 64) return view.getFloat64(at, true);
  } else {
    if (bits === 8) return (view.getUint8(at) - 128) / 128; // 8-bit WAV is unsigned
    if (bits === 16) return view.getInt16(at, true) / 0x8000;
    if (bits === 24) {
      const value = view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getInt8(at + 2) << 16);
      return value / 0x800000;
    }
    if (bits === 32) return view.getInt32(at, true) / 0x80000000;
  }
  throw new Error(`Unsupported WAV sample size ${bits} bits`);
}
