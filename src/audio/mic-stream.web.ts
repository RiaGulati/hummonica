/**
 * Web version of mic-stream.ts: raw microphone samples from the browser.
 *
 * expo-audio's useAudioStream does nothing on web yet, so this does the same
 * job with the Web Audio API: getUserMedia opens the mic, and a small
 * AudioWorklet copies the samples off the audio thread in blocks of
 * BLOCK_SIZE. Each block is passed to onBuffer in the same shape expo-audio
 * uses on the phone (mono float32), so capture.ts does not need to know which
 * one it is talking to.
 *
 * The browser's echo cancellation, noise suppression and automatic gain are
 * turned off: they are tuned for speech and would distort the pitch of notes.
 */

import type { AudioStreamBuffer, AudioStreamOptions } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

/** Samples per buffer: about 43 ms at 48 kHz, like the phone's buffers. */
const BLOCK_SIZE = 2048;

const WORKLET = `
class Collector extends AudioWorkletProcessor {
  constructor() {
    super();
    this.block = new Float32Array(${BLOCK_SIZE});
    this.filled = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      let read = 0;
      while (read < channel.length) {
        const count = Math.min(channel.length - read, this.block.length - this.filled);
        this.block.set(channel.subarray(read, read + count), this.filled);
        this.filled += count;
        read += count;
        if (this.filled === this.block.length) {
          this.port.postMessage(this.block, [this.block.buffer]);
          this.block = new Float32Array(${BLOCK_SIZE});
          this.filled = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('mic-collector', Collector);
`;

export const isMicStreamingSupported =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof AudioWorkletNode === 'function';

interface Running {
  context: AudioContext;
  media: MediaStream;
}

export function useMicStream(options: AudioStreamOptions) {
  // Always call the latest onBuffer, which closes over the current React state.
  const onBuffer = useRef(options.onBuffer);
  useEffect(() => {
    onBuffer.current = options.onBuffer;
  });

  const [isStreaming, setIsStreaming] = useState(false);

  // One stream object for the life of the component, like expo-audio's.
  const [stream] = useState(() => {
    let running: Running | null = null;

    async function start(): Promise<void> {
      if (running) return;
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const context = new AudioContext();
      try {
        const moduleUrl = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
        await context.audioWorklet.addModule(moduleUrl);
        URL.revokeObjectURL(moduleUrl);

        const source = context.createMediaStreamSource(media);
        const collector = new AudioWorkletNode(context, 'mic-collector', {
          numberOfInputs: 1,
          numberOfOutputs: 0,
          channelCount: 1,
          channelCountMode: 'explicit',
        });
        const startedAt = context.currentTime;
        collector.port.onmessage = (event: MessageEvent<Float32Array>) => {
          const buffer: AudioStreamBuffer = {
            data: event.data.buffer as ArrayBuffer,
            sampleRate: context.sampleRate,
            channels: 1,
            timestamp: context.currentTime - startedAt,
          };
          onBuffer.current?.(buffer);
        };
        source.connect(collector);
        await context.resume();
      } catch (error) {
        media.getTracks().forEach((track) => track.stop());
        void context.close();
        throw error;
      }
      running = { context, media };
      setIsStreaming(true);
    }

    function stop(): void {
      if (!running) return;
      running.media.getTracks().forEach((track) => track.stop());
      void running.context.close();
      running = null;
      setIsStreaming(false);
    }

    return { start, stop };
  });

  return { stream, isStreaming };
}
