import { usePierMpcSdk } from '@pier-wallet/mpc-lib/dist/package/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';

import { useAuth } from '@/core';
import { useIsFirstTime } from '@/core/hooks';
import { Onboarding } from '@/screens';

import { AuthNavigator } from './auth-navigator';
import { NavigationContainer } from './navigation-container';
import { TabNavigator } from './tab-navigator';
const Stack = createNativeStackNavigator();

export const Root = () => {
  const pierMpcSdk = usePierMpcSdk();
  const status = useAuth.use.status();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [isFirstTime] = useIsFirstTime();
  const hideSplash = React.useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);
  useEffect(() => {
    if (status !== 'idle') {
      hideSplash();
    }
  }, [hideSplash, status]);

  useEffect(() => {
    (async () => {
      const session = await pierMpcSdk.auth.getSession();
      if (!session) {
        return;
      }

      setIsLoggedIn(true);
    })();
  }, [pierMpcSdk]);

  useEffect(() => {
    const subscription = pierMpcSdk.auth.supabase.auth.onAuthStateChange(
      (authChangeEvent) => {
        if (authChangeEvent === 'SIGNED_IN') {
          setIsLoggedIn(true);
        }
        if (authChangeEvent === 'SIGNED_OUT') {
          setIsLoggedIn(false);
        }
      }
    );
    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, [pierMpcSdk]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'none',
      }}
    >
      {isFirstTime ? (
        <Stack.Screen name="Onboarding" component={Onboarding} />
      ) : (
        <Stack.Group>
          {isLoggedIn ? (
            <Stack.Screen name="App" component={TabNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Root />
    </NavigationContainer>
  );
};
