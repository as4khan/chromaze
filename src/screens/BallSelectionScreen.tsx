/** Accessible, scrollable cosmetic selection; all six supplied designs can be equipped immediately. */
import { useEffect } from 'react';
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { appearances, BallAppearance, BallId } from '../appearance';
import { ballImages, icons } from '../assets';
import { Button } from '../components/Button';
import { theme } from '../theme';

/** Selection equips immediately; App owns equipment and reports any recoverable storage failure. */
export function BallSelectionScreen({ appearance, onSelect, onBack, saving, error }: {
  appearance: BallAppearance; onSelect: (id: BallId) => void; onBack: () => void; saving: boolean; error: boolean;
}) {
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => back.remove();
  }, [onBack]);
  return <View style={styles.root}>
    <View style={styles.top}><Button label="Back" icon={icons.home} secondary onPress={onBack} />
      <Text style={styles.equipped} numberOfLines={2}>{appearance.name} equipped</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>Your ball. Your color.</Text>
      <Text style={styles.description}>All six are yours. Tap a ball to equip it for every maze.</Text>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Ball appearance">
        {appearances.map(ball => {
          const selected = ball.id === appearance.id;
          return <Pressable key={ball.id} accessibilityRole="radio" accessibilityLabel={ball.name + ', ' + ball.description}
            accessibilityState={{ checked: selected }} onPress={() => onSelect(ball.id)}
            style={({ pressed }) => [styles.option, { borderColor: selected ? ball.paint[0] : theme.wall }, selected && styles.selected, pressed && { opacity: 0.8 }]}>
            <Image source={ballImages[ball.id]} accessible={false} style={styles.ball} />
            <Text style={styles.name}>{ball.name}</Text><Text style={styles.caption}>{ball.description}</Text>
            <View style={styles.swatch}>{ball.paint.map(color => <View key={color} style={{ flex: 1, backgroundColor: color }} />)}</View>
            <Text style={[styles.status, { color: selected ? ball.paint[0] : theme.muted }]}>{selected ? 'Equipped' : 'Tap to equip'}</Text>
          </Pressable>;
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.description}>{saving ? 'Saving your choice…' : error
        ? 'Your ball is equipped for this session, but saving failed. Try again.' : 'Your choice carries into every maze.'}</Text>
      {error && <Button label="Retry saving" secondary onPress={() => onSelect(appearance.id)} />}
      <Button label="Done" onPress={onBack} />
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24 },
  top: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 12 },
  equipped: { flex: 1, textAlign: 'right', color: theme.muted, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 },
  content: { paddingTop: 18, paddingBottom: 24, gap: 16 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', color: theme.text, fontSize: 30, letterSpacing: -0.8 },
  description: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 15, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  option: { width: '47%', flexGrow: 1, minWidth: 116, padding: 12, borderRadius: 16, borderWidth: 1,
    backgroundColor: theme.recess, alignItems: 'center', gap: 5 },
  selected: { backgroundColor: theme.floor }, ball: { width: 100, height: 100 },
  name: { fontFamily: 'SpaceGrotesk_600SemiBold', color: theme.text, fontSize: 17, textAlign: 'center' },
  caption: { fontFamily: 'SpaceGrotesk_400Regular', color: theme.muted, fontSize: 12, textAlign: 'center' },
  swatch: { flexDirection: 'row', height: 5, width: 50, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  status: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, marginTop: 4 },
});
