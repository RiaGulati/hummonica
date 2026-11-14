import { Stack } from 'expo-router';

import { Fonts } from '@/constants/theme';

/** A stack only to get the same native header as History. */
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center', headerTitleStyle: { fontFamily: Fonts.display } }}>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
    </Stack>
  );
}
