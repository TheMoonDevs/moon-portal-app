'use client';
import { useState } from 'react';

import { LoginScreen } from './LoginScreen';
import WelcomeScreen from './WelcomeScreen';

const LoginPage = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  return showWelcome ? (
    <WelcomeScreen onComplete={() => setShowWelcome(false)} />
  ) : (
    <LoginScreen />
  );
};

export default LoginPage;
