import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/colors';

const TABS = [
  { key: 'home', icon: 'home-outline', active: 'home' },
  { key: 'trending', icon: 'flame-outline', active: 'flame' },
  { key: 'music', icon: 'musical-notes-outline', active: 'musical-notes' },
  { key: 'profile', icon: 'person-outline', active: 'person' },
];

const BUBBLE = 48;
const BAR_H = 64;
const R = BAR_H / 2; // pill corner radius
const PAD = 30; // room above the bar for the bump
const BH = 22; // bump height above the flat top
const BS = 26; // half-width of the bump base (hugs the raised tab)
const C1 = 12; // shoulder control (near the flat top)
const C2 = 18; // crest control (near the top of the bump)

// One continuous outline with a smooth bezier hump centered at `cx`.
// `cx` moves with the active tab, so the notch travels. The center is clamped
// so the hump always stays on the flat top and never crosses a pill corner
// (crossing a corner is what kinked the notch at the end tabs).
function barPath(w, cx) {
  const top = PAD;
  const crest = top - BH;
  const c = Math.max(R + BS, Math.min(w - R - BS, cx));
  return [
    `M ${R} ${top}`,
    `H ${c - BS}`,
    `C ${c - BS + C1} ${top} ${c - C2} ${crest} ${c} ${crest}`,
    `C ${c + C2} ${crest} ${c + BS - C1} ${top} ${c + BS} ${top}`,
    `H ${w - R}`,
    `A ${R} ${R} 0 0 1 ${w} ${top + R}`,
    `A ${R} ${R} 0 0 1 ${w - R} ${top + BAR_H}`,
    `H ${R}`,
    `A ${R} ${R} 0 0 1 0 ${top + BAR_H - R}`,
    `A ${R} ${R} 0 0 1 ${R} ${top}`,
    'Z',
  ].join(' ');
}

export default function BottomNav({ onTabChange }) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [barW, setBarW] = useState(0);

  const pos = useRef(new Animated.Value(0)).current; // travelling notch/bubble center
  const pop = useRef(new Animated.Value(1)).current; // little bounce on switch
  const fills = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const centers = useRef([]).current;
  const pathRef = useRef(null);
  const barWRef = useRef(0);

  // Redraw the path each frame as the notch center animates (JS-driven value).
  useEffect(() => {
    const id = pos.addListener(({ value }) => {
      if (barWRef.current > 0) {
        pathRef.current?.setNativeProps({ d: barPath(barWRef.current, value) });
      }
    });
    return () => pos.removeListener(id);
  }, [pos]);

  const onTabLayout = (i, e) => {
    const { x, width } = e.nativeEvent.layout;
    centers[i] = x + width / 2;
    if (i === active && !ready) {
      pos.setValue(centers[i]);
      setReady(true);
    }
  };

  const select = (i) => {
    // always notify (so tapping the active tab from another screen still routes
    // back to Main); only the animation is skipped when it's already active.
    onTabChange && onTabChange(TABS[i].key);
    if (i === active) return;
    const prev = active;
    setActive(i);
    // smooth glide: accelerate then gently settle, no bounce/overshoot
    Animated.timing(pos, {
      toValue: centers[i],
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false, // drives the SVG path via the listener
    }).start();
    // subtle, non-bouncy dip so the pill feels alive without a jolt
    Animated.sequence([
      Animated.timing(pop, { toValue: 0.94, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start();
    Animated.timing(fills[prev], { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    Animated.timing(fills[i], { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View
        style={styles.bar}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          barWRef.current = w;
          setBarW(w);
        }}
      >
        {barW > 0 && (
          <Svg width={barW} height={BAR_H + PAD} style={styles.svg} pointerEvents="none">
            <Path
              ref={pathRef}
              d={barPath(barW, centers[active] ?? barW / 2)}
              fill={colors.inkSofter}
              stroke={colors.hairline}
              strokeWidth={1}
            />
          </Svg>
        )}

        {/* raised active pill that travels with the notch */}
        <Animated.View
          style={[
            styles.bubble,
            {
              opacity: ready ? 1 : 0,
              transform: [
                { translateX: Animated.subtract(pos, BUBBLE / 2) },
                { scale: pop },
              ],
            },
          ]}
        >
          <Ionicons name={TABS[active].active} size={24} color={colors.ink} />
        </Animated.View>

        {TABS.map((tab, i) => (
          <Tab key={tab.key} tab={tab} fill={fills[i]} onPress={() => select(i)} onLayout={(e) => onTabLayout(i, e)} />
        ))}
      </View>
    </View>
  );
}

function Tab({ tab, fill, onPress, onLayout }) {
  // outline icon shown when inactive; hidden when active (it rides up on the bubble).
  const opacity = fill.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Pressable style={styles.tab} onPress={onPress} onLayout={onLayout} hitSlop={8}>
      <Animated.View style={{ opacity }}>
        <Ionicons name={tab.icon} size={24} color={colors.mutedSoft} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: BAR_H,
    paddingHorizontal: 24,
  },
  svg: {
    position: 'absolute',
    left: 0,
    top: -PAD,
  },
  bubble: {
    position: 'absolute',
    left: 0,
    top: -20, // pokes above the bar, cradled by the bump
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
