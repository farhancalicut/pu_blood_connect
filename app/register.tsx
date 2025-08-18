import { useRouter ,useNavigation} from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase';

export default function RegisterScreen() {
  const router = useRouter();
    const navigation = useNavigation(); 
  const user = auth.currentUser; // Get the currently logged-in user
  const isEditMode = !!user; // If user exists, we are in Edit Mode

  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', department: '', gender: '',
    age: '', bloodGroup: '', phone: '', password: '', confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(isEditMode); 

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Profile' : 'Register',
      headerBackVisible: isEditMode, // This shows the back button only in edit mode
    });
  }, [isEditMode, navigation]);
  useEffect(() => {
    if (isEditMode && user) {
      const fetchUserData = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm({
            ...form,
            email: user.email || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            department: data.department || '',
            gender: data.gender || '',
            age: data.age || '',
            bloodGroup: data.bloodGroup || '',
            phone: data.phone || '',
          });
        }
        setIsLoading(false);
      };
      fetchUserData();
    }
  }, [isEditMode, user]);


  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  // Renamed to handleSubmit, handles both Register and Update
  const handleSubmit = async () => {
    const { email, password, confirmPassword, ...profileData } = form;

    if (!profileData.firstName || !profileData.lastName || !profileData.department || !profileData.phone) {
        Alert.alert('Missing Information', 'Please fill all required profile fields.');
        return;
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
            gender: profileData.gender,
            age: profileData.age,
            bloodGroup: profileData.bloodGroup,
            phone: profileData.phone,
        });
        Alert.alert('Profile Updated!', 'Your details have been saved successfully.');
        router.back(); // Go back to the profile screen

      } else {
        // --- REGISTER LOGIC ---
        if (!email || !password) {
            Alert.alert('Missing Information', 'Please provide an email and password.');
            setIsLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Passwords do not match');
            setIsLoading(false);
            return;
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        await setDoc(doc(db, 'users', newUser.uid), {
          ...profileData,
          email,
          uid: newUser.uid,
          createdAt: new Date(),
        });

        Alert.alert('Registration successful!');
        router.push('/login');
      }
    } catch (error) {
      const err = error as FirebaseError;
      Alert.alert('Operation Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formFields = [
    { key: 'firstName', label: 'First Name' }, { key: 'lastName', label: 'Last Name' },
    { key: 'department', label: 'Department' }, { key: 'gender', label: 'Gender' },
    { key: 'age', label: 'Age' }, { key: 'bloodGroup', label: 'Blood Group' },
    { key: 'phone', label: 'Phone Number' }
  ];

  if (isLoading && isEditMode) {
      return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" color="#9B0000" />;
  }

  return (
    <SafeAreaView style={styles.container}>
    

      <ScrollView contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
        {!isEditMode && (
          <View style={styles.tabContainer}>
            <Text style={styles.tab} onPress={() => router.push('/login')}>Login</Text>
            <Text style={[styles.tab, styles.activeTab]}>Register</Text>
          </View>
        )}
        
        <TextInput style={[styles.input, isEditMode && styles.disabledInput]} placeholder="Email" value={form.email} onChangeText={(text) => handleChange('email', text)} editable={!isEditMode} />
        {formFields.map(({ key, label }) => (
          <TextInput key={key} style={styles.input} placeholder={label} value={(form as any)[key]} onChangeText={(text) => handleChange(key, text)} />
        ))}
        {!isEditMode && (
          <>
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={form.password} onChangeText={(text) => handleChange('password', text)} />
            <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={form.confirmPassword} onChangeText={(text) => handleChange('confirmPassword', text)} />
          </>
        )}

        <TouchableOpacity style={styles.registerButton} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>{isEditMode ? 'Update Profile' : 'Register'}</Text>}
        </TouchableOpacity>

        {!isEditMode && (
          <Text style={styles.signInText}>Or <Text style={styles.signInLink} onPress={() => router.push('/login')}>sign in</Text></Text>
        )}
      </ScrollView>
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
