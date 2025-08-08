import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { auth } from '../firebase';
// adjust if path is different
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { db } from '../firebase'; // Firestore instance
import { getDoc, doc } from 'firebase/firestore';


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);

      const userId = userCredential.user.uid;
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User Data:", userData);

        Alert.alert('Success', `Welcome ${userData.fullName}`);
        router.replace('/dashboard');
      } else {
        Alert.alert('Error', 'User profile not found in database.');
      }
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        Alert.alert('Login Failed', error.message);
      } else {
        Alert.alert('Login Failed', 'Unknown error occurred');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.logo}>🩸 PU BLOOD CONNECT</Text>
        <Text style={styles.icon}>🔔</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.tabContainer}>
          <Text style={[styles.tab, styles.activeTab]}>Login</Text>
          <Text style={styles.tab} onPress={() => router.push('/register')}>
            Register
          </Text>
        </View>

        <TextInput
  style={styles.input}
  placeholder="Email Address"
  keyboardType="email-address"
  autoCapitalize="none"
  value={email}
  onChangeText={setEmail}
/>
 
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
  <Text style={styles.loginButtonText}>Login</Text>
</TouchableOpacity>


        <Text style={styles.registerText}>
          Don’t have an account?{' '}
          <Text style={styles.registerLink} onPress={() => router.push('/register')}>
            Register
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF0F3',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    marginTop: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontWeight: 'bold',
    color: '#C00000',
    fontSize: 18,
  },
  icon: {
    fontSize: 18,
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
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
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
