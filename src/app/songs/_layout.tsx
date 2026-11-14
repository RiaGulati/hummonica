import { Stack } from 'expo-router';

import { Fonts } from '@/constants/theme';

export default function SongsLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center', headerTitleStyle: { fontFamily: Fonts.display } }}>
      <Stack.Screen name="index" options={{ title: 'Songs' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="online/[id]" options={{ title: '' }} />
    </Stack>
  );
}
