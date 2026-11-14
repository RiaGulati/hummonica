import { Stack } from 'expo-router';

import { Fonts } from '@/constants/theme';

export default function SavedLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center', headerTitleStyle: { fontFamily: Fonts.display } }}>
      <Stack.Screen name="index" options={{ title: 'Saved' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="add" options={{ title: 'Add a tab' }} />
    </Stack>
  );
}
