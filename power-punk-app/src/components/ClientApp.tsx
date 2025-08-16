'use client';

import { useIsInitialized, useIsSignedIn } from '@coinbase/cdp-hooks';
import SignInScreen from './auth/SignInScreen';
import SignedInApp from './SignedInApp';

export default function ClientApp() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-32 h-32 bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  return <SignedInApp />;
}