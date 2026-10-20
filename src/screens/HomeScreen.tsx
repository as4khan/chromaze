import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { MazeBoard } from '../components/MazeBoard';
import { commitSlide, initialGame, slide } from '../game/engine';
import { levels } from '../game/levels';
import { Progress } from '../storage/progression';
import { theme } from '../theme';
import { useSharedValue } from 'react-native-reanimated';
export function HomeScreen({ progress, onPlay }: { progress: Progress; onPlay: (level: number) => void }) {
  const animationProgress = useSharedValue(0);
  const level = levels[0]!;
  const preview = commitSlide(initialGame(level), slide(level, level.start, 'right'));
  return <ScrollView contentContainerStyle={styles.root}>
    <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>chromaze<Text style={{ color: theme.paint }}>.</Text></Text>
      <Text style={styles.subtitle}>Find your flow. Leave your color.</Text></View>
    <View accessible accessibilityLabel="A lavender ball leaves a mint trail through a dark maze" style={styles.preview}>
      <MazeBoard level={level} game={preview} size={220} active={null} progress={animationProgress} onReached={() => {}} onFinish={() => {}} />
    </View>
    <View style={styles.bottom}><Text style={styles.instructions}>One swipe. A little momentum.{ '\n' }Paint every path to make it yours.</Text>
      <Button label={progress.finished ? 'Play again' : progress.unlocked > 1 ? `Continue · Level ${progress.unlocked}` : 'Play'}
        onPress={() => onPlay(progress.finished ? 0 : progress.unlocked - 1)} />
      {progress.unlocked > 1 && !progress.finished && <Button label="Start from level 1" secondary onPress={() => onPlay(0)} />}
      <Text style={styles.footer}>THREE MAZES. TAKE YOUR TIME.</Text>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  root: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-around', padding: 24, gap: 28 },
  heading: { alignItems: 'center', gap: 10 }, title: { fontFamily: 'SpaceGrotesk_700Bold', color: theme.text, fontSize: 44, letterSpacing: -1.6 },
  subtitle: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, color: theme.muted },
  preview: { transform: [{ rotate: '-8deg' }], paddingVertical: 10 },
  bottom: { gap: 14, width: '100%', maxWidth: 360 },
  instructions: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.text, textAlign: 'center', fontSize: 17, lineHeight: 26, marginBottom: 12 },
  footer: { fontFamily: 'SpaceGrotesk_500Medium', color: theme.muted, textAlign: 'center', fontSize: 10, letterSpacing: 2, marginTop: 8 },
});
