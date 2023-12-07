import { usePierMpc } from '@pier-wallet/mpc-lib/dist/package/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect } from 'react';

import { useSoftKeyboardEffect } from '@/core/keyboard';
import { Button, FocusAwareStatusBar, View } from '@/ui';

export const Login = () => {
  const pierMpcSdk = usePierMpc();
  useSoftKeyboardEffect();

  useEffect(() => {
    (async () => {
      pierMpcSdk.auth.signOut();
    })();
  }, [pierMpcSdk.auth]);

  return (
    <>
      <FocusAwareStatusBar />
      {/* <LoginForm onSubmit={onSubmit} /> */}
      <View className="flex-1 justify-center p-4">
        <Button
          label="Sign in as Test (fix)"
          onPress={async () => {
            await pierMpcSdk.auth.signInWithPassword({
              email: 'mpc-lib-test@example.com',
              password: '123456',
            });
          }}
        />
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={5}
          style={{ width: 220, height: 50, alignSelf: 'center' }}
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
              await pierMpcSdk.auth.signInWithIdToken({
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
