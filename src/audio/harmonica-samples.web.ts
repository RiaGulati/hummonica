/**
 * Web version of harmonica-samples.ts. In the browser each bundled sample is a
 * URL, so its bytes are fetched instead of read from a file. Decoding is the
 * same.
 */

import { Asset } from 'expo-asset';

import type { HarmonicaSample } from '@/dsp/sampler';
import { decodeWav } from '@/dsp/wav';

import { HARMONICA_SAMPLE_FILES, HARMONICA_SAMPLE_RATE } from './harmonica-sample-map';

let loading: Promise<HarmonicaSample[]> | null = null;

async function readSamples(assetModule: number): Promise<Float32Array> {
  const asset = Asset.fromModule(assetModule);
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error(`Harmonica sample could not be loaded (${response.status})`);
  return decodeWav(new Uint8Array(await response.arrayBuffer())).samples;
}

async function load(): Promise<HarmonicaSample[]> {
  return Promise.all(
    HARMONICA_SAMPLE_FILES.map(async (file) => {
      const [held, release] = await Promise.all([readSamples(file.held), readSamples(file.release)]);
      return {
        midi: file.midi,
        sampleRate: HARMONICA_SAMPLE_RATE,
        held,
        release,
        loopStart: file.loopStart,
        loopEnd: file.loopEnd,
      };
    })
  );
}

/** The sample bank. If loading fails, the next call tries again. */
export function loadHarmonicaSamples(): Promise<HarmonicaSample[]> {
  loading ??= load().catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}
