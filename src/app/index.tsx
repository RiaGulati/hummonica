import { StyleSheet } from 'react-native';

import { isStreamingSupported } from '@/audio/capture';
import { ListenPanel } from '@/components/listen-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function ListenScreen() {
  if (!isStreamingSupported) {
    return (
      <ThemedView style={styles.unsupported}>
        <ThemedText style={styles.centred}>
          Live microphone streaming is not available in this build. Run the app in a development
          build instead (npx expo run:ios or npx expo run:android).
        </ThemedText>
      </ThemedView>
    );
  }
  return <ListenPanel />;
}

const styles = StyleSheet.create({
  unsupported: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centred: {
    textAlign: 'center',
  },
});
