import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text, HelperText, Snackbar } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthMode = 'login' | 'signup';

const AuthScreen = () => {
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Handle error from store
  useEffect(() => {
    if (error) {
      setShowSnackbar(true);
    }
  }, [error]);

  const validateForm = () => {
    setFormError('');
    
    if (!username || !password) {
      setFormError('Please fill in all required fields');
      return false;
    }

    if (mode === 'signup') {
      if (!email) {
        setFormError('Please enter your email');
        return false;
      }
      if (!email.includes('@')) {
        setFormError('Invalid email format');
        return false;
      }
      if (username.length < 3) {
        setFormError('Username must be at least 3 characters');
        return false;
      }
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, email);
      }
    } catch (error) {
      // Error is handled in store
      console.error('Auth error:', error);
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setFormError('');
    clearError();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          {mode === 'login' ? 'Logging in...' : 'Signing up...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </Text>

            {formError ? (
              <HelperText type="error" visible={!!formError}>
                {formError}
              </HelperText>
            ) : null}

            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              disabled={isLoading}
            />

            {mode === 'signup' && (
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                disabled={isLoading}
              />
            )}

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              disabled={isLoading}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </Button>

            <Button
              mode="text"
              onPress={handleModeSwitch}
              disabled={isLoading}
              style={styles.switchButton}
            >
              {mode === 'login' 
                ? 'Don\'t have an account? Sign up now' 
                : 'Already have an account? Login'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        action={{
          label: 'Close',
          onPress: () => setShowSnackbar(false),
        }}
        duration={3000}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  switchButton: {
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default AuthScreen; 