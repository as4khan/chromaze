/** Bundled star artwork keeps reward shapes consistent across native fonts and screen densities. */
import { Image, View } from 'react-native';
import { icons } from '../assets';
import { theme } from '../theme';
export function RatingStars({ value, size = 20 }: { value: number; size?: number }) {
  return <View accessible accessibilityRole="image" accessibilityLabel={value + ' of 3 stars'} style={{ flexDirection: 'row', gap: 5 }}>
    {[0, 1, 2].map(index => <Image key={index} accessible={false} source={index < value ? icons.starFilled : icons.starOutline}
      style={{ width: size, height: size, tintColor: index < value ? theme.accent : theme.muted }} />)}
  </View>;
}
