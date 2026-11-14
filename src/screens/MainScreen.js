import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../components/GradientBackground';
import HomeScreen from './HomeScreen';
import CatalogScreen from './CatalogScreen';
import LibraryScreen from './LibraryScreen';
import ProfileScreen from './ProfileScreen';
import { useTab } from '../context/TabContext';
import { colors } from '../theme/colors';

// The bottom nav is a persistent overlay in AppNavigator's Chrome,
// so this screen only renders the active tab's body.
export default function MainScreen({ navigation }) {
  const { tab } = useTab();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <View style={styles.body}>
          {/* Home stays mounted so its scroll + search survive tab switches. */}
          <View style={[styles.fill, tab !== 'home' && styles.hidden]}>
            <HomeScreen navigation={navigation} />
          </View>
          {tab === 'catalog' && <CatalogScreen navigation={navigation} />}
          {tab === 'music' && <LibraryScreen navigation={navigation} />}
          {tab === 'profile' && <ProfileScreen navigation={navigation} />}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1 },
  fill: { ...StyleSheet.absoluteFillObject },
  hidden: { display: 'none' },
});
