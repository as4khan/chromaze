/** Shared native action button with visual-kit glyphs and consistent accessible touch targets. */
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
/** Icons are decorative; the visible label remains the accessible name in every state. */
export function Button({ label, onPress, disabled = false, secondary = false, icon }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; icon?: ImageSourcePropType;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary,
      disabled && { opacity: 0.35 }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}>
    {icon && <Image source={icon} accessible={false} style={[styles.icon, { tintColor: secondary ? theme.text : theme.background }]} />}
    <Text style={[styles.text, secondary && { color: theme.text }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 54, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 16,
    backgroundColor: theme.paint, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: theme.wall },
  icon: { width: 22, height: 22, flexShrink: 0 },
  text: { flexShrink: 1, textAlign: 'center', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, color: theme.background },
});
