import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../components/GradientBackground';
import { useAuth } from '../context/AuthContext';
import { colors, space, radius, shadow } from '../theme/colors';

const SLIDES = [
  { icon: 'musical-notes', tint: colors.amber, title: 'Discover OPM', body: 'Explore songs from the greatest Filipina voices — all in one place.' },
  { icon: 'cloud-done', tint: colors.online, title: 'Online or offline', body: 'Stream trending songs when you’re online, and keep your library ready offline.' },
  { icon: 'heart', tint: colors.teal, title: 'Your own library', body: 'Build and manage your collection of artists and favorites, your way.' },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { finishOnboarding } = useAuth();
  const ref = useRef(null);
  const [index, setIndex] = useState(0);

  const next = () => {
    if (index < SLIDES.length - 1) {
      const ni = index + 1;
      setIndex(ni);
      ref.current?.scrollToIndex({ index: ni });
    } else {
      finishOnboarding();
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.top}>
          <Text style={styles.brand}>Himig</Text>
          <Pressable onPress={finishOnboarding} hitSlop={10}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <FlatList
          ref={ref}
          data={SLIDES}
          keyExtractor={(s) => s.title}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={[styles.icon, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon} size={72} color={colors.ink} />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>

        <Pressable onPress={next} style={styles.btn}>
          <Text style={styles.btnText}>
            {index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  top: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.lg, paddingTop: space.sm,
  },
  brand: { color: colors.cream, fontSize: 20, fontWeight: '900' },
  skip: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  icon: {
    width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center',
    marginBottom: space.xl, ...shadow.card,
  },
  title: { color: colors.cream, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: space.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: space.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.inkSofter },
  dotOn: { width: 22, backgroundColor: colors.amber },
  btn: {
    backgroundColor: colors.amber, marginHorizontal: space.lg, borderRadius: radius.pill,
    paddingVertical: 16, alignItems: 'center', marginBottom: space.sm,
  },
  btnText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
});
