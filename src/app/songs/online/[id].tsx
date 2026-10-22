import { useLocalSearchParams } from 'expo-router';

import { OnlineSongDetail } from '@/components/online-song-detail';

export default function OnlineSongScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  return <OnlineSongDetail id={Number(id)} title={title} />;
}
