/** Branded Home and replay entry, adapting the visual-kit concept to native, scrollable layout. */
import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { brand, icons } from '../assets';
import { Button } from '../components/Button';
import { MazeBoard } from '../components/MazeBoard';
import { commitSlide, initialGame, slide } from '../game/engine';
import { levels } from '../game/levels';
import { Progress } from '../storage/progression';
import { theme } from '../theme';
import { BallAppearance } from '../appearance';

const ignorePreviewEvent = () => {};
/** Maps saved one-based unlocks to the existing zero-based Play/Continue navigation. */
export function HomeScreen({ progress, onPlay, appearance, onCustomize }: { progress: Progress; onPlay: (level: number) => void; appearance: BallAppearance; onCustomize: () => void }) {
  const { width, height } = useWindowDimensions();
  const level = levels[0]!;
  // Reuse an immutable engine snapshot: the hero is a real maze, never a screenshot or active game.
  const preview = useMemo(() => commitSlide(initialGame(level), slide(level, level.start, 'right')), [level]);
  const size = Math.max(0, Math.min(width - 68, height * 0.39, 340));
  return <ScrollView contentContainerStyle={styles.root}>
    <View style={styles.content}>
      <View style={styles.heading}>
        <View style={styles.brand}><Image source={brand.symbol} accessible={false} style={styles.symbol} />
          <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>chromaze<Text style={{ color: theme.paint }}>.</Text></Text></View>
        <Text style={styles.subtitle}>Find your flow. Leave your color.</Text>
      </View>
      <View accessible accessibilityLabel={appearance.name + ' ball and matching paint in a dark maze'} style={styles.preview}>
        <MazeBoard appearance={appearance} effects={false} level={level} game={preview} size={size} active={null} onReached={ignorePreviewEvent} onFinish={ignorePreviewEvent} />
      </View>
      <View style={styles.bottom}>
        <View style={styles.instructions}><Text style={styles.lead}>One swipe. A little momentum.</Text>
          <Text style={styles.body}>Paint every path to make it yours.</Text></View>
        <Button icon={icons.play} label={progress.finished ? 'Play again' : progress.unlocked > 1 ? 'Continue · Level ' + progress.unlocked : 'Play'}
          onPress={() => onPlay(progress.finished ? 0 : progress.unlocked - 1)} />
        {progress.unlocked > 1 && !progress.finished && <Button icon={icons.restart} label="Start from level 1" secondary onPress={() => onPlay(0)} />}
        <Button icon={icons.sparkle} label={'Choose ball · ' + appearance.name} secondary onPress={onCustomize} />
        <Text style={styles.footer}>THREE MAZES. TAKE YOUR TIME.</Text>
      </View>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  root: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 30 },
  heading: { width: '100%', gap: 8 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  symbol: { width: 38, height: 38 },
  title: { flexShrink: 1, fontFamily: 'SpaceGrotesk_700Bold', color: theme.text, fontSize: 42, letterSpacing: -1.4 },
  subtitle: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, lineHeight: 22, color: theme.muted },
  preview: { padding: 10, backgroundColor: theme.recess, borderRadius: 24 },
  bottom: { gap: 14, width: '100%' }, instructions: { gap: 6, marginBottom: 12 },
  lead: { fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.text, fontSize: 19, lineHeight: 27 },
  body: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 16, lineHeight: 24 },
  footer: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.muted, textAlign: 'center', fontSize: 10, letterSpacing: 1.6, marginTop: 14 },
});
