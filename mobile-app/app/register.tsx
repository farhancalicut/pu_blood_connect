import { useRouter, useNavigation } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useState, useEffect, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, ActivityIndicator, Animated, TextStyle, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from '../firebase';
import { signOut,sendEmailVerification  } from 'firebase/auth';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

type FloatingLabelInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

const FloatingLabelInput = ({
    label,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType = 'default',
    editable = true,
    autoCapitalize = 'sentences',
  }: FloatingLabelInputProps) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    React.useEffect(() => {
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
    outputRange: [22, -1.5], // goes above border
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
      <View style={{ marginBottom: 20, paddingTop: 8 }}>
        <Animated.Text style={labelStyle}>{label}</Animated.Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder=" "
          placeholderTextColor="transparent"
        />
      </View>
    );
  };


export default function RegisterScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = auth.currentUser;
  const isEditMode = !!user;

  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', department: '', age: '',gender: '',
     bloodGroup: '', phone: '', password: '', confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(isEditMode);

  // Validation functions
  const validateEmail = (email: string) =>
    /^[a-zA-Z0-9]{13}@pondiuni\.ac\.in$/.test(email);

  const validateGender = (gender: string) =>
    GENDERS.includes(gender);

  const validateAge = (age: string) => {
    const num = Number(age);
    return !isNaN(num) && num > 15;
  };

  const validateBloodGroup = (bg: string) =>
    BLOOD_GROUPS.includes(bg);

  const validatePassword = (password: string) =>
    password.length >= 6;

  useEffect(() => {
    navigation.setOptions?.({
      title: isEditMode ? 'Edit Profile' : 'Register',
      headerBackVisible: isEditMode,
    });
  }, [isEditMode, navigation]);

  useEffect(() => {
    if (isEditMode && user) {
      const fetchUserData = async () => {
        setIsLoading(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setForm(f => ({
              ...f,
              email: user.email || '',
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              department: data.department || '',
              age: data.age ? String(data.age) : '',
              gender: data.gender || '',
              bloodGroup: data.bloodGroup || '',
              phone: data.phone || '',
            }));
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    }
  }, [isEditMode, user]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const { email, password, confirmPassword, age, gender,  bloodGroup, ...profileData } = form;

    if (!profileData.firstName || !profileData.lastName || !profileData.department || !profileData.phone) {
      Alert.alert('Missing Information', 'Please fill all required profile fields.');
      return;
    }
    if (!isEditMode && !validateEmail(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid Pondicherry University email address.');
      return;
    }
    if (!validateGender(gender)) {
      Alert.alert('Validation Error', 'Please select a valid gender.');
      return;
    }
    if (!validateAge(age)) {
      Alert.alert('Validation Error', 'Please enter a valid age (must be greater than 15).');
      return;
    }
    if (!validateBloodGroup(bloodGroup)) {
      Alert.alert('Validation Error', 'Please select a valid blood group.');
      return;
    }
    if (!isEditMode) {
      if (!email || !password) {
        Alert.alert('Missing Information', 'Please provide an email and password.');
        return;
      }
      if (!validatePassword(password)) {
        Alert.alert('Validation Error', 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Passwords do not match');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isEditMode && user) {
        // --- UPDATE LOGIC ---
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          name: `${form.firstName} ${form.lastName}`,
          department: profileData.department,
          age: age,
          gender: gender,
          bloodGroup: bloodGroup,
          phone: profileData.phone,
        });
        Alert.alert('Profile Updated!', 'Your details have been saved successfully.');
        router.back();
      } else {
        // --- REGISTER LOGIC ---
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const newUser = userCredential.user;
        await sendEmailVerification(newUser);
        await setDoc(doc(db, 'users', newUser.uid), {
          ...profileData,
          age,
          gender,
          bloodGroup,
          email: email.trim(),
          uid: newUser.uid,
          createdAt: new Date(),
        });
        await signOut(auth);
        Alert.alert('Registration Successful!','A verification link has been sent to your email. Please check your inbox to activate your account.');
        router.push('/login');
      }
    } catch (error: unknown) {
    let message = 'An unknown error occurred. Please try again.';

    // This checks if the error is from Firebase
    if (error instanceof FirebaseError) {
        // Use a switch to handle specific error codes
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'This email address is already registered. Please try logging in.';
                break;
            case 'auth/invalid-email':
                message = 'The email address you entered is not valid.';
                break;
            case 'auth/weak-password':
                message = 'Your password is too weak. It must be at least 6 characters long.';
                break;
            default:
                // For any other Firebase error, show the original message
                message = error.message;
        }
    }
    Alert.alert('Registration Failed', message);

} finally {
    setIsLoading(false);
}
  };

  

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.card}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {!isEditMode && (
            <View style={styles.tabContainer}>
              <Text style={styles.tab} onPress={() => router.push('/login')}>Login</Text>
              <Text style={[styles.tab, styles.activeTab]}>Register</Text>
            </View>
          )}

          {/* All FloatingLabelInput fields first */}
<FloatingLabelInput
  label="Email"
  value={form.email}
  onChangeText={text => handleChange('email', text)}
  keyboardType="email-address"
  editable={!isEditMode}
  autoCapitalize="none"
/>
<FloatingLabelInput
  label="First Name"
  value={form.firstName}
  onChangeText={text => handleChange('firstName', text)}
/>
<FloatingLabelInput
  label="Last Name"
  value={form.lastName}
  onChangeText={text => handleChange('lastName', text)}
/>
<FloatingLabelInput
  label="Department"
  value={form.department}
  onChangeText={text => handleChange('department', text)}
/>
<FloatingLabelInput
  label="Age"
  value={form.age}
  onChangeText={text => handleChange('age', text)}
  keyboardType="numeric"
/>
<FloatingLabelInput
  label="Phone Number"
  value={form.phone}
  onChangeText={text => handleChange('phone', text)}
  keyboardType="phone-pad"
/>
{/* Now Picker fields */}
          <Text style={styles.label}>Gender</Text>
          <View style={{ height: 50, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center' }}>
            <Picker
              selectedValue={form.gender}
              onValueChange={value => handleChange('gender', value)}
              style={{ width: '100%' }}
              dropdownIconColor="#888"
            >
              <Picker.Item label="Select Gender" value="" />
              {GENDERS.map(g => <Picker.Item key={g} label={g} value={g} />)}
            </Picker>
          </View>
          
          <Text style={styles.label}>Blood Group</Text>
          <View style={{ height: 50, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center' }}>
            <Picker
              selectedValue={form.bloodGroup}
              onValueChange={value => handleChange('bloodGroup', value)}
              style={{ width: '100%' }}
              dropdownIconColor="#888"
            >
              <Picker.Item label="Select Blood Group" value="" />
              {BLOOD_GROUPS.map(bg => <Picker.Item key={bg} label={bg} value={bg} />)}
            </Picker>
          </View>

          {!isEditMode && (
            <>
              <FloatingLabelInput
                label="Password"
                value={form.password}
                onChangeText={text => handleChange('password', text)}
                secureTextEntry
              />
              <FloatingLabelInput
                label="Confirm Password"
                value={form.confirmPassword}
                onChangeText={text => handleChange('confirmPassword', text)}
                secureTextEntry
              />
            </>
          )}

          
          
          
          <TouchableOpacity style={styles.registerButton} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>{isEditMode ? 'Update Profile' : 'Register'}</Text>}
          </TouchableOpacity>

          {!isEditMode && (
            <Text style={styles.signInText}>Or <Text style={styles.signInLink} onPress={() => router.push('/login')}>sign in</Text></Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF0F3',
    padding: 20,
  },
  disabledInput: { backgroundColor: '#f5f5f5', color: '#999' },
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
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    fontWeight: '500',
    marginTop: 5,
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

