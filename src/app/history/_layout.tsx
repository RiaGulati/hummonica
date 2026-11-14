import { Stack } from 'expo-router';

import { Fonts } from '@/constants/theme';

/** The History tab has its own stack, so a detail screen can be pushed on top of the list. */
export default function HistoryLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center', headerTitleStyle: { fontFamily: Fonts.display } }}>
      <Stack.Screen name="index" options={{ title: 'History' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
