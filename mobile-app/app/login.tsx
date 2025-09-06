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
  Dimensions, 
  TextStyle,
} from 'react-native';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { getDoc, doc } from 'firebase/firestore';

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
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    if (user/*user.emailVerified*/) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        Alert.alert('Success', `Welcome ${firstName} ${lastName}`.trim());
        
        router.replace('/dashboard');
      } else {
        Alert.alert('Error', 'User profile not found in database.');
        await signOut(auth);
      }
    } 
    else {
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
});