import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebase';


export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    gender: '',
    age: '',
    bloodGroup: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleRegister = async () => {
    const { fullName, email, password, confirmPassword, gender, age, bloodGroup, phone } = form;

    // ✅ Updated Validation
    if (!email || !fullName || !phone || !bloodGroup || !gender || !age) {
      alert('Please fill all fields');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user details in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        fullName,
        gender: form.gender,
        age: form.age,
        bloodGroup: form.bloodGroup,
        phone: form.phone,
        uid: user.uid,
        createdAt: new Date(),
      });

      Alert.alert('Registration successful!');
      router.push('/login');
    } catch (error) {
      const err = error as FirebaseError;
      Alert.alert('Registration Failed', err.message);
    }
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🩸 PU HEART CONNECT</Text>
        <Text style={styles.icon}>🔔</Text>
      </View>

      {/* Form Card */}
      <ScrollView contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
        <View style={styles.tabContainer}>
          <Text style={styles.tab} onPress={() => router.push('/login')}>
            Login
          </Text>
          <Text style={[styles.tab, styles.activeTab]}>Register</Text>
        </View>

        {[
          ['email', 'email'],
          ['fullName', 'Full Name'],
          ['gender', 'Gender'],
          ['age', 'Age'],
          ['bloodGroup', 'Blood Group'],
          ['phone', 'Phone Number'],
          ['password', 'Password'],
          ['confirmPassword', 'Confirm Password'],
        ].map(([key, label]) => (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={label}
            secureTextEntry={key.includes('password')}
            value={(form as any)[key]}
            onChangeText={(text) => handleChange(key, text)}
          />
        ))}

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        <Text style={styles.signInText}>
          Or{' '}
          <Text style={styles.signInLink} onPress={() => router.push('/login')}>
            sign in
          </Text>
        </Text>
      </ScrollView>
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
    marginTop: 30,
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
  registerButton: {
    backgroundColor: '#E0E5EC',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    fontWeight: 'bold',
  },
  signInText: {
    textAlign: 'center',
    marginTop: 15,
    color: '#666',
  },
  signInLink: {
    color: '#0066cc',
  },
});
