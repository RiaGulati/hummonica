import { Stack } from 'expo-router';

/** The History tab has its own stack, so a detail screen can be pushed on top of the list. */
export default function HistoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'History' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
