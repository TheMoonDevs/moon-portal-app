'use client';
import { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';

const LoginPage = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  return showWelcome ? (
    <WelcomeScreen onComplete={() => setShowWelcome(false)} />
  ) : (
    <LoginScreen />
  );
};

export default LoginPage;
