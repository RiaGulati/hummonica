import { useLocalSearchParams } from 'expo-router';

import { SavedDetail } from '@/components/saved-detail';

export default function SavedTabScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SavedDetail id={id} />;
}
