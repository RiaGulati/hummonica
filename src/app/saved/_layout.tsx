import { Stack } from 'expo-router';

export default function SavedLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Saved' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="add" options={{ title: 'Add a tab' }} />
    </Stack>
  );
}
