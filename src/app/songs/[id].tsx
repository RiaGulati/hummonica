import { useLocalSearchParams } from 'expo-router';

import { SongDetail } from '@/components/song-detail';

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SongDetail id={id} />;
}
