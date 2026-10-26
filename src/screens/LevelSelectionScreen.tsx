/** Scrollable campaign stages with retained star ratings, personal bests, and explicit availability. */
import { useEffect } from 'react';
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { CampaignProgress } from '../components/CampaignProgress';
import { icons } from '../assets';
import { levels, stages } from '../game/levels';
import { levelStatus, Progress, totalStars } from '../game/progression';
import { RatingStars } from '../components/RatingStars';
import { theme } from '../theme';

/** Locked rows are disabled here; App repeats the same guard before loading a level. */
export function LevelSelectionScreen({ progress, onPlay, onBack }: { progress: Progress; onPlay: (index: number) => void; onBack: () => void }) {
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => back.remove();
  }, [onBack]);
  return <View style={styles.root}>
    <View style={styles.top}><Button label="Home" secondary icon={icons.home} onPress={onBack} /><Text accessibilityRole="header" style={styles.title}>Your campaign</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <CampaignProgress completed={progress.completed.length} total={levels.length} stars={totalStars(progress)} />
      {stages.map(stage => <View key={stage.id} style={styles.stage}>
        <View style={styles.stageHeading}><Text accessibilityRole="header" style={styles.stageName}>{stage.name}</Text>
          <Text style={styles.meta}>{stage.levels.filter(level => progress.completed.includes(level.id)).length} / {stage.levels.length}</Text></View>
        <Text style={styles.description}>{stage.description}</Text>
        <View style={styles.list}>{stage.levels.map((level, i) => {
          const index = level.id - 1, status = levelStatus(progress, index, levels.length), locked = status === 'locked';
          const label = status === 'completed' ? 'Completed' : locked ? 'Locked' : 'Ready to play';
          const record = progress.records[level.id], stars = record?.stars ?? 0;
          const bestLabel = record?.bestMoves != null ? 'Best ' + record.bestMoves + ' moves' : status === 'completed' ? 'Replay to set a best' : '';
          return <Pressable key={level.id} accessibilityRole="button" accessibilityLabel={'Level ' + level.id + ', ' + level.name + ', ' + label + ', minimum ' + level.minimumMoves + ' moves, ' + stars + ' of 3 stars' + (bestLabel ? ', ' + bestLabel : '')}
            accessibilityState={{ disabled: locked }} disabled={locked} onPress={() => onPlay(index)}
            style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: theme.floor }]}>
            <View style={styles.number}><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.numberText, locked && { color: theme.muted }]}>{level.id}</Text></View>
            <View style={styles.detail}><Text style={[styles.levelName, locked && { color: theme.muted }]}>{level.name}</Text>
              <Text style={styles.meta}>Minimum {level.minimumMoves} moves</Text>
              <RatingStars value={stars} /><Text style={[styles.status, status === 'completed' && { color: theme.paint }]}>{label}{bestLabel ? ' · ' + bestLabel : ''}</Text></View>
            <Image source={locked ? icons.lock : status === 'completed' ? icons.paint : icons.play} accessible={false}
              style={[styles.icon, { tintColor: locked ? theme.muted : theme.paint }]} />
          </Pressable>;
        })}</View>
      </View>)}
      <Text style={styles.description}>Finish a maze to open the next. Your completed mazes are always here to replay.</Text>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  title: { flex: 1, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 23, color: theme.text },
  content: { paddingTop: 12, paddingBottom: 28, gap: 28 }, stage: { gap: 10 },
  stageHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  stageName: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 25, color: theme.text },
  description: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, lineHeight: 22, color: theme.muted },
  list: { borderRadius: 16, overflow: 'hidden', backgroundColor: theme.recess },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 96, padding: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.wall },
  number: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.floor, justifyContent: 'center', alignItems: 'center' },
  numberText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 23, color: theme.text },
  detail: { flex: 1, minWidth: 0, gap: 4 }, levelName: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.text, fontSize: 17 },
  meta: { color: theme.muted, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13 },
  status: { color: theme.muted, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12 }, icon: { width: 22, height: 22 },
});
