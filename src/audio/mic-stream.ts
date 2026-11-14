/**
 * Raw microphone samples. On the phone this is expo-audio's useAudioStream;
 * the web version (mic-stream.web.ts) uses the browser's Web Audio API,
 * because expo-audio does not stream the mic on web yet.
 */

import { AudioModule } from 'expo-audio';

export { useAudioStream as useMicStream } from 'expo-audio';

/**
 * True when the installed native code supports mic streaming. Older builds of
 * Expo Go may not include it; in that case the app needs a development build.
 */
// AudioModule is an object, not a namespace import, so this lint rule does not apply.
// eslint-disable-next-line import/namespace
export const isMicStreamingSupported = typeof AudioModule?.AudioStream === 'function';
