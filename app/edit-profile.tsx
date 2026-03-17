import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Dimensions, Animated, TextStyle
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, getAuth } from 'firebase/auth';
import FormSelect from './_components/FormSelect';
import { db } from '../firebase';
import { FirebaseError } from 'firebase/app';
import { showAlert } from '../utils/alert';

// --- RESPONSIVE SETUP ---
const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

// --- DATA LISTS ---
const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Commerce', 'History', 'French'];
const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const YEARS = ['First', 'Second', 'Third', 'Fourth', 'PhD'];
const NSS_UNITS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4'];

const toOptions = (values: string[], placeholder: string) => [
  { label: placeholder, value: '' },
  ...values.map((value) => ({ label: value, value })),
];

// --- HELPER COMPONENT (You can move this to a separate file if you wish) ---
type FloatingLabelInputProps = {
  label: string; value: string; onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
};
const FloatingLabelInput = ({ label, value, onChangeText, keyboardType = 'default' }: FloatingLabelInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

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
    top: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [scale(22), scale(-1.5)] }),
    fontSize: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [scale(13), scale(12)] }),
    color: animatedValue.interpolate({ inputRange: [0, 1], outputRange: ["#888", "#575757ff"] }),
    backgroundColor: "#F8FAFC",
    paddingHorizontal: scale(4),
    zIndex: 1,
  };

  return (
    <View style={{ marginBottom: scale(20), paddingTop: scale(8) }}>
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        keyboardType={keyboardType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder=" "
        placeholderTextColor="transparent"
      />
    </View>
  );
};


export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = getAuth().currentUser;

  const [form, setForm] = useState({
    firstName: '', lastName: '', department: '', year: '', age: '', gender: '',
    bloodGroup: '', phone: '', isNssVolunteer: '', nssUnit: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: 'Edit Profile' });
    if (user) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setForm({
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              department: data.department || '',
              year: data.year || '',
              age: data.age ? String(data.age) : '',
              gender: data.gender || '',
              bloodGroup: data.bloodGroup || '',
              phone: data.phone || '',
              isNssVolunteer: data.isNssVolunteer || '',
              nssUnit: data.nssUnit || '',
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          showAlert("Error", "Could not load your profile data.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    } else {
        // If somehow a non-logged in user reaches here, send them away.
        router.replace('/login');
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.department || !form.year || !form.phone) {
      showAlert('Missing Information', 'Please fill all required profile fields.');
      return;
    }
    if (form.isNssVolunteer === 'Yes' && !form.nssUnit) {
      showAlert('Missing Information', 'Please select your NSS Unit.');
      return;
    }
    setIsLoading(true);
    try {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const updateData: any = {
          firstName: form.firstName,
          lastName: form.lastName,
          name: `${form.firstName} ${form.lastName}`,
          department: form.department,
          year: form.year,
          age: form.age,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          phone: form.phone,
          isNssVolunteer: form.isNssVolunteer,
        };
        
        if (form.isNssVolunteer === 'Yes') {
          updateData.nssUnit = form.nssUnit;
          updateData.nssStatus = updateData.nssStatus || 'pending'; // Keep existing status or set to pending
        } else {
          updateData.nssUnit = '';
          updateData.nssStatus = '';
        }
        
        await updateDoc(userDocRef, updateData);
        showAlert('Profile Updated!', 'Your details have been saved successfully.');
        router.back();
      }
    } catch (error) {
      const err = error as FirebaseError;
      showAlert('Operation Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
          <FloatingLabelInput label="First Name" value={form.firstName} onChangeText={text => handleChange('firstName', text)} />
          <FloatingLabelInput label="Last Name" value={form.lastName} onChangeText={text => handleChange('lastName', text)} />
          
          <Text style={styles.label}>Department</Text>
          <View style={styles.pickerContainer}>
            <FormSelect value={form.department} onValueChange={value => handleChange('department', value)} options={toOptions(DEPARTMENTS, 'Select Department...')} />
          </View>
          
          <Text style={styles.label}>Year</Text>
          <View style={styles.pickerContainer}>
            <FormSelect value={form.year} onValueChange={value => handleChange('year', value)} options={toOptions(YEARS, 'Select Year...')} />
          </View>
          
          <FloatingLabelInput label="Age" value={form.age} onChangeText={text => handleChange('age', text)} keyboardType="numeric" />
          <FloatingLabelInput label="Phone Number" value={form.phone} onChangeText={text => handleChange('phone', text)} keyboardType="phone-pad" />
          
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <FormSelect value={form.gender} onValueChange={value => handleChange('gender', value)} options={toOptions(GENDERS, 'Select Gender')} />
          </View>
          
          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.pickerContainer}>
            <FormSelect value={form.bloodGroup} onValueChange={value => handleChange('bloodGroup', value)} options={toOptions(BLOOD_GROUPS, 'Select Blood Group')} />
          </View>
          
          <Text style={styles.label}>Are you an NSS Volunteer?</Text>
          <View style={styles.pickerContainer}>
            <FormSelect
              value={form.isNssVolunteer}
              onValueChange={value => {
                handleChange('isNssVolunteer', value);
                if (value !== 'Yes') {
                  handleChange('nssUnit', ''); // Clear unit selection if not NSS volunteer
                }
              }}
              options={[
                { label: 'Please select...', value: '' },
                { label: 'Yes', value: 'Yes' },
                { label: 'No', value: 'No' },
              ]}
            />
          </View>
          
          {form.isNssVolunteer === 'Yes' && (
            <>
              <Text style={styles.label}>NSS Unit</Text>
              <View style={styles.pickerContainer}>
                <FormSelect
                  value={form.nssUnit}
                  onValueChange={value => handleChange('nssUnit', value)}
                  options={toOptions(NSS_UNITS, 'Select your NSS Unit...')}
                />
              </View>
            </>
          )}
          
          <TouchableOpacity style={styles.updateButton} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update Profile</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- RESPONSIVE STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF0F3' },
  card: {
    backgroundColor: '#F8FAFC',
    padding: scale(25),
    borderRadius: scale(20),
    margin: scale(20),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: scale(3) },
    shadowRadius: scale(10),
    elevation: 6,
  },
  label: {
    fontSize: scale(14),
    color: '#666',
    marginBottom: scale(4),
    marginLeft: scale(4),
    fontWeight: '500',
  },
  pickerContainer: {
    height: scale(50),
    backgroundColor: '#ffffff',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: scale(15),
    justifyContent: 'center',
    overflow: 'hidden',
    minWidth: 0,
  },
  picker: {
    width: '100%',
    borderWidth: 0,
    minWidth: 0,
  },
  input: {
    backgroundColor: '#fff',
    padding: scale(12),
    height: scale(50),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: scale(14),
  },
  updateButton: {
    backgroundColor: '#007AFF', // A nice blue for update actions
    paddingVertical: scale(15),
    borderRadius: scale(10),
    alignItems: 'center',
    marginTop: scale(10),
  },
  updateButtonText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: scale(16),
  },
});