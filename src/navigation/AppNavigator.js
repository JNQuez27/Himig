import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainScreen from '../screens/MainScreen';
import DetailScreen from '../screens/DetailScreen';
import ArtistScreen from '../screens/ArtistScreen';
import ArtistFormScreen from '../screens/ArtistFormScreen';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import BottomNav from '../components/BottomNav';
import MiniPlayer from '../components/MiniPlayer';
import { useAuth } from '../context/AuthContext';
import { TabProvider, useTab } from '../context/TabContext';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.ink },
};

// The modal screens own their bottom area, so the persistent nav hides there.
const NO_NAV = ['NowPlaying', 'ArtistForm'];

// Persistent chrome: the bottom nav + mini-player, drawn above every screen in
// the authenticated stack (so Detail/Artist show them too), hidden on modals.
function Chrome() {
  const navigation = useNavigation();
  const { setTab } = useTab();
  const routeName = useNavigationState(
    (s) => (s ? s.routes[s.index]?.name : undefined)
  );
  if (NO_NAV.includes(routeName)) return null;

  return (
    <>
      <MiniPlayer navigation={navigation} />
      <BottomNav
        onTabChange={(key) => {
          setTab(key);
          navigation.navigate('Main');
        }}
      />
    </>
  );
}

export default function AppNavigator() {
  const { ready, onboarded, user } = useAuth();

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
      ) : !user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      ) : (
        <TabProvider>
          <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen name="Artist" component={ArtistScreen} />
              <Stack.Screen name="Detail" component={DetailScreen} />
              <Stack.Screen
                name="ArtistForm"
                component={ArtistFormScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="NowPlaying"
                component={NowPlayingScreen}
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
