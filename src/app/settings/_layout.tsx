import { Stack } from 'expo-router';

/** A stack only to get the same native header as History. */
export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
    </Stack>
  );
}
