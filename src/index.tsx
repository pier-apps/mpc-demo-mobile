import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PierMpcSdkReactNativeProvider } from '@pier-wallet/mpc-lib/dist/package/react-native';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { APIProvider } from '@/api';
import { hydrateAuth, loadSelectedTheme } from '@/core';
import { RootNavigator } from '@/navigation';

import { PierServerVaultProvider } from './screens/mpc/pier-mpc-provider';

hydrateAuth();
loadSelectedTheme();
SplashScreen.preventAutoHideAsync();

const App = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheetModalProvider>
        <APIProvider>
          <PierMpcSdkReactNativeProvider>
            <PierServerVaultProvider>
              <RootNavigator />
              <FlashMessage position="top" />
            </PierServerVaultProvider>
          </PierMpcSdkReactNativeProvider>
        </APIProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
