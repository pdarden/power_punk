'use client';

import { AuthButton } from '@coinbase/cdp-react/components/AuthButton';

export default function SignInScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <img 
            src="/powerpunk.png" 
            alt="Power Punk" 
            className="w-20 h-20 mx-auto mb-4 rounded-lg"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Power Punk</h1>
          <p className="text-lg text-gray-600">Grassroots Climate Solutions</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Fund community climate projects
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Create your own campaigns
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Earn rewards through referrals
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Sign in with your email to get started
          </p>
          <div className="flex justify-center">
            <AuthButton />
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}