/**
 * The Hummonica logo mark: a peach harmonica comb with four holes on a black
 * rounded square. Drawn with Views so it works on every platform.
 */

import { StyleSheet, View } from 'react-native';

export function HummonicaMark({ size = 40 }: { size?: number }) {
  const unit = size / 40;
  return (
    <View
      accessible={false}
      style={[styles.square, { width: size, height: size, borderRadius: 10 * unit }]}>
      <View
        style={[
          styles.comb,
          { width: 28 * unit, height: 12 * unit, borderRadius: 3 * unit, gap: 2.25 * unit },
        ]}>
        {[0, 1, 2, 3].map((hole) => (
          <View
            key={hole}
            style={{ width: 3 * unit, height: 4 * unit, borderRadius: unit, backgroundColor: '#000' }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comb: {
    backgroundColor: '#ffc396',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
