import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword,signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { getDoc, doc } from 'firebase/firestore';
import { TextStyle } from "react-native";

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
  left: 16,
  top: animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, -10], // goes above border
  }),
  fontSize: animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [13, 12],
  }),
  color: animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#888", "#575757ff"],
  }),
  backgroundColor: "#ffffffb6",
  paddingHorizontal: 1,
  paddingBottom: -2,
  paddingTop: -2,
  zIndex: 1,
  alignSelf: "flex-start", 
};

  return (
    <View style={{ marginBottom: 20 }}>
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
  const router = useRouter();

  // const validateEmail = (email: string) =>
  //   /^[a-zA-Z0-9]{13}@pondiuni\.ac\.in$/.test(email);

  const handleLogin = async () => {
  if (!email.trim() || !password) {
    Alert.alert('Validation Error', 'Please enter both email and password.');
    return;
  }
  setLoading(true);
  try {
    // 1. Sign in the user
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // 2. CHECK FOR VERIFICATION FIRST!
    if (user.emailVerified) {
      // 3. If verified, fetch their profile and welcome them
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        Alert.alert('Success', `Welcome ${firstName} ${lastName}`.trim());
        
        // 4. NOW it's safe to navigate to the dashboard
        router.replace('/dashboard');
      } else {
        // This is a failsafe in case the user's database entry is missing
        Alert.alert('Error', 'User profile not found in database.');
        await signOut(auth);
      }
    } else {
      // 5. If NOT verified, show the alert and sign them out
      Alert.alert(
        'Verification Required',
        'Please check your email and click the verification link before logging in.'
      );
      await signOut(auth);
    }
  } catch (error: unknown) {
      let message = 'Unknown error occurred';
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No user found with this email.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        default:
          message = error.message;
      }
    }
    Alert.alert('Login Failed', message);
  } finally {
    setLoading(false);
  }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

        <FloatingLabelInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

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
          Don’t have an account?{' '}
          <Text style={styles.registerLink} onPress={() => router.push('/register')}>
            Register
          </Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF0F3',
    padding: 20,
  },
  card: {
    backgroundColor: '#F8FAFC',
    padding: 25,
    borderRadius: 20,
    marginTop: 100,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    padding: 10,
    fontWeight: '600',
    color: '#888',
  },
  activeTab: {
    backgroundColor: '#fff',
    borderRadius: 10,
    color: '#000',
  },
  input: {
    backgroundColor: '#ffffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#E0E5EC',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    fontWeight: 'bold',
  },
  registerText: {
    textAlign: 'center',
    marginTop: 15,
    color: '#666',
  },
  registerLink: {
    color: '#0066cc',
  },
});
