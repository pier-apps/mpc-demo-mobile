import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';

import { useSoftKeyboardEffect } from '@/core/keyboard';
import { FocusAwareStatusBar, View } from '@/ui';

import { supabase } from '../mpc/trpc';

export const Login = () => {
  useSoftKeyboardEffect();

  return (
    <>
      <FocusAwareStatusBar />
      {/* <LoginForm onSubmit={onSubmit} /> */}
      <View className="flex-1 justify-center p-4">
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={5}
          style={{ width: 200, height: 44, alignSelf: 'center' }}
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
