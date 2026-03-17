import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle: Animated.WithAnimatedObject<TextStyle> = {
    position: "absolute",
    left: scale(16),
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [scale(15), scale(-10)],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [scale(13), scale(12)],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["#888", "#575757ff"],
    }),
    backgroundColor: "#F8FAFC", 
    paddingHorizontal: scale(4),
    zIndex: 1,
  };

  return (
    <View style={{ marginBottom: scale(20) }}>
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
};


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    console.log('[LOGIN] Starting login attempt...', { email: email.trim() });
    if (!email.trim() || !password) {
      console.log('[LOGIN] Validation failed - empty fields');
      showAlert('Validation Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
  try {
    console.log('[LOGIN] Calling Firebase signInWithEmailAndPassword...');
    const userCredential = await signInWithEmailAndPassword(getAuth(), email.trim(), password);
    console.log('[LOGIN] Sign in successful, user:', userCredential.user.uid);
    const user = userCredential.user;

    // Get/Update push notification token
    let pushToken = null;
    if (Device.isDevice) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          pushToken = (await Notifications.getExpoPushTokenAsync({
            projectId: 'aab4fc2c-6891-4e42-a8c3-6207ef8a7683',
          })).data;
        }
      } catch (error) {
        // Error getting push token
      }
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Update push token if available
      if (pushToken) {
        await updateDoc(userDocRef, { pushToken });
      }
      
      const userRole = userData.role;
      
      if (userRole === 'admin') {
        // Admin user - allow login without email verification
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        showAlert('Success', `Welcome ${firstName} ${lastName}`.trim(), [
          { text: 'OK', onPress: () => router.replace('/admin-dashboard') }
        ]);
      } else if (userRole === 'hospital') {
        // Hospital user - redirect to hospital dashboard
        const hospitalName = userData.hospitalName || 'Hospital';
        showAlert('Success', `Welcome ${hospitalName}`, [
          { text: 'OK', onPress: () => router.replace('/hospital-dashboard') }
        ]);
      } else {
        // Regular student user - check email verification
        if (user.emailVerified) {
          const firstName = userData.firstName || '';
          const lastName = userData.lastName || '';
          showAlert('Success', `Welcome back, ${firstName} ${lastName}`.trim(), [
            { text: 'OK', onPress: () => router.replace('/dashboard') }
          ]);
        } else {
          // Sign out unverified user
          await signOut(getAuth());
          showAlert(
            'Email Verification Required',
            'Please check your email and click the verification link before logging in. If you haven\'t received the email, please check your spam folder.',
            [
              {
                text: 'OK'
              }
            ]
          );
        }
      }
    } else {
      showAlert('Error', 'User profile not found in database.');
      await signOut(getAuth());
    }
  } catch (error: unknown) {
      console.log('[LOGIN] Error caught:', error);
      let message = 'An error occurred during login. Please try again.';
    if (error instanceof FirebaseError) {
      console.log('[LOGIN] Firebase error code:', error.code);
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/invalid-credential':
          message = 'Invalid email or password. Please check your credentials and try again.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          message = 'Login failed. Please check your credentials and try again.';
      }
    }
    console.log('[LOGIN] Showing alert with message:', message);
    showAlert('Login Failed', message);
  } finally {
    console.log('[LOGIN] Finally block - setting loading to false');
    setLoading(false);
  }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      showAlert('Error', 'Please enter your email address.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(), resetEmail.trim());
      showAlert(
        'Password Reset Email Sent',
        `A password reset email has been sent to ${resetEmail.trim()}. Please check your inbox and follow the instructions to reset your password.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotPassword(false);
              setResetEmail('');
            }
          }
        ]
      );
    } catch (error: unknown) {
      let message = 'Failed to send password reset email.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
            message = 'No account found with this email address.';
            break;
          case 'auth/invalid-email':
            message = 'Please enter a valid email address.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many requests. Please try again later.';
            break;
          case 'auth/network-request-failed':
            message = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            message = 'Unable to send password reset email. Please try again.';
        }
      }
      showAlert('Error', message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.tabContainer}>
          <Text style={[styles.tab, styles.activeTab]}>Login</Text>
          <Text style={styles.tab} onPress={() => router.push('/register')}>
            Register
          </Text>
        </View>

        <FloatingLabelInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <View style={styles.passwordSection}>
          <FloatingLabelInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity onPress={() => setShowForgotPassword(true)} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityLabel="Login"
        >
          {loading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.registerText}>
          Don't have an account?{' '}
          <Text style={styles.registerLink} onPress={() => router.push('/register')}>
            Register
          </Text>
        </Text>
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <View style={styles.modalSpacer} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <FloatingLabelInput
              label="Email Address"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={[styles.resetButton, resetLoading && { opacity: 0.7 }]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF0F3',
    justifyContent: 'center', // Center the card vertically
    paddingHorizontal: scale(20), // Responsive padding
  },
  card: {
    backgroundColor: '#F8FAFC',
    padding: scale(25),
    borderRadius: scale(20),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: scale(3) },
    shadowRadius: scale(10),
    elevation: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: scale(20),
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    padding: scale(10),
    fontWeight: '600',
    color: '#888',
    fontSize: scale(14), 
  },
  activeTab: {
    backgroundColor: '#fff',
    borderRadius: scale(10),
    color: '#000',
  },
  input: {
    backgroundColor: '#ffffffff',
    padding: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: scale(16), 
    color: '#000',
    height: scale(50), 
  },
  loginButton: {
    backgroundColor: '#E0E5EC',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
    marginTop: scale(10),
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: scale(16), 
  },
  registerText: {
    textAlign: 'center',
    marginTop: scale(15),
    color: '#666',
    fontSize: scale(14), 
  },
  registerLink: {
    color: '#0066cc',
  },
  passwordSection: {
    marginBottom: scale(20),
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: scale(-15),
    marginBottom: scale(0),
  },
  forgotPasswordText: {
    color: '#9a9a9aff',
    fontSize: scale(10),
    textDecorationLine: 'underline',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalCancelButton: {
    fontSize: scale(16),
    color: '#0066cc',
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: '#000',
  },
  modalSpacer: {
    width: scale(60),
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: scale(25),
    paddingTop: scale(30),
  },
  modalDescription: {
    fontSize: scale(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: scale(30),
    lineHeight: scale(22),
  },
  resetButton: {
    backgroundColor: '#0066cc',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
    marginTop: scale(20),
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: scale(16),
  },
});
