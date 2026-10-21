import { useLocalSearchParams } from 'expo-router';

import { TranscriptionDetail } from '@/components/transcription-detail';

export default function TranscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TranscriptionDetail id={id} />;
}
