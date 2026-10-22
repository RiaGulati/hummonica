/**
 * Loads the harmonica samples (assets/harmonica/*.wav) for tab playback.
 *
 * The WAV files are bundled with the app as assets. expo-asset gives each one
 * a local file, we read its bytes with expo-file-system and decode them with
 * our own WAV decoder. This happens once; later calls reuse the result.
 */

import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import type { HarmonicaSample } from '@/dsp/sampler';
import { decodeWav } from '@/dsp/wav';

import { HARMONICA_SAMPLE_FILES, HARMONICA_SAMPLE_RATE } from './harmonica-sample-map';

let loading: Promise<HarmonicaSample[]> | null = null;

async function readSamples(assetModule: number): Promise<Float32Array> {
  const [asset] = await Asset.loadAsync(assetModule);
  if (!asset.localUri) throw new Error('Harmonica sample could not be loaded');
  return decodeWav(await new File(asset.localUri).bytes()).samples;
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
