import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect } from 'react';

import { useSoftKeyboardEffect } from '@/core/keyboard';
import { Button, FocusAwareStatusBar, View } from '@/ui';

import { supabase } from '../mpc/trpc';

export const Login = () => {
  useSoftKeyboardEffect();

  useEffect(() => {
    (async () => {
      supabase.auth.signOut();
    })();
  }, []);

  const buttonStyle = { width: 220, height: 50, alignSelf: 'center' };
  return (
    <>
      <FocusAwareStatusBar />
      {/* <LoginForm onSubmit={onSubmit} /> */}
      <View className="flex-1 justify-center p-4">
        <Button
          label="Sign in as Test"
          style={buttonStyle}
          onPress={async () => {
            const { error } = await supabase.auth.signInWithPassword({
              email: 'mpc-lib-test@example.com',
              password: '123456',
            });
            if (error) {
              throw error;
            }
          }}
        />
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={5}
          style={buttonStyle}
          onPress={async () => {
            try {
              const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                  AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                  AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
              });

              // signed in - also sign in with supabase
              if (!credential.identityToken)
                throw new Error('No identity token');
              await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: credential.identityToken,
              });
            } catch (e: any) {
              console.error('some error', e);
              if (e.code === 'ERR_REQUEST_CANCELED') {
                // handle that the user canceled the sign-in flow
              } else {
                // handle other errors
              }
            }
          }}
        />
      </View>
    </>
  );
};
