/** Shared campaign completion and earned-star totals for Home and level selection. */
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
export function CampaignProgress({ completed, total, stars }: { completed: number; total: number; stars: number }) {
  return <View style={styles.root}>
    <View style={styles.labels}><Text style={styles.label}>Campaign</Text><Text style={styles.count}>{completed} / {total} complete</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel="Campaign completion" accessibilityValue={{ min: 0, max: total, now: completed }} style={styles.track}>
      <View style={[styles.fill, { width: `${completed / total * 100}%` }]} />
    </View>
    <Text style={styles.stars} accessibilityLabel={stars + ' of ' + total * 3 + ' campaign stars'}>{stars} / {total * 3} stars</Text>
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 10, width: '100%' }, labels: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  stars: { color: theme.accent, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, fontVariant: ['tabular-nums'] },
  label: { color: theme.muted, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 },
  count: { color: theme.paint, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: theme.wall }, fill: { height: 5, backgroundColor: theme.paint },
});
