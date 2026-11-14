import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  useNavigation,
  useNavigationState,
  StackActions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainScreen from '../screens/MainScreen';
import KaraokeScreen from '../screens/KaraokeScreen';
import AddSongScreen from '../screens/AddSongScreen';
import RoomScreen from '../screens/RoomScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { TabProvider, useTab } from '../context/TabContext';
import { useRoom } from '../context/RoomContext';
import { useLibrary } from '../context/LibraryContext';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.ink },
};

// The modal screens own their bottom area, so the persistent nav hides there.
const NO_NAV = ['Karaoke', 'AddSong', 'Room'];

// Persistent chrome: the bottom nav, drawn above the stack and hidden on modals.
function Chrome() {
  const navigation = useNavigation();
  const { setTab } = useTab();
  const routeName = useNavigationState(
    (s) => (s ? s.routes[s.index]?.name : undefined)
  );
  // In a room, the host's phone is the music player: whenever the room moves to
  // a new song, open (or swap) the karaoke player for it, wherever the host is.
  const { room, isPlayer } = useRoom();
  const library = useLibrary();
  const opened = useRef(null);
  const qid = isPlayer ? room?.current?.qid || null : null;
  useEffect(() => {
    if (qid === opened.current) return;
    const wasOpen = opened.current && routeName === 'Karaoke';
    opened.current = qid;
    if (qid) {
      const song = room.current.song;
      const params = { song: library.local(song.id) || song, roomQid: qid };
      navigation.dispatch(wasOpen ? StackActions.replace('Karaoke', params) : StackActions.push('Karaoke', params));
    } else if (wasOpen) {
      navigation.goBack(); // queue finished, or a big screen took over
    }
  }, [qid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hidden, not unmounted, on modals: unmounting would reset the nav's active tab.
  const hidden = NO_NAV.includes(routeName);

  return (
    <View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[StyleSheet.absoluteFill, hidden && { opacity: 0 }]}
    >
      <BottomNav
        onTabChange={(key) => {
          setTab(key);
          navigation.navigate('Main');
        }}
      />
    </View>
  );
}

export default function AppNavigator() {
  const { ready, onboarded, user, guest } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!onboarded ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Navigator>
      ) : !user && !guest ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      ) : (
        <TabProvider>
          <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen
                name="Room"
                component={RoomScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="AddSong"
                component={AddSongScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="Karaoke"
                component={KaraokeScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack.Navigator>
            <Chrome />
          </View>
        </TabProvider>
      )}
    </NavigationContainer>
  );
}
