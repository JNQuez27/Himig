import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { RoomProvider } from './src/context/RoomContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LibraryProvider>
          <RoomProvider>
            <AppNavigator />
          </RoomProvider>
        </LibraryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
