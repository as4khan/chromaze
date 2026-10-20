import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
export function Button({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary,
      disabled && { opacity: 0.35 }, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}>
    <Text style={[styles.text, secondary && { color: theme.text }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 54, paddingHorizontal: 24, paddingVertical: 15, borderRadius: 14,
    backgroundColor: theme.paint, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: theme.wall },
  text: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: theme.background },
});
