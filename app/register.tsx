import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useNavigation, useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import FormSelect from './_components/FormSelect';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const DEPARTMENTS = [ 'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Commerce', 'History', 'French' ];
const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const YEARS = ['First', 'Second', 'Third', 'Fourth', 'PhD'];
const NSS_UNITS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5(Karaikal)'];

const toOptions = (values: string[], placeholder: string) => [
  { label: placeholder, value: '' },
  ...values.map((value) => ({ label: value, value })),
];

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
    const inputRef = useRef<TextInput>(null);

    React.useEffect(() => {
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
        outputRange: [scale(22), scale(-1.5)],
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

    const handleFocus = () => {
      setIsFocused(true);
      // Auto-scroll to focused input only on native platforms
      if (Platform.OS !== 'web') {
        setTimeout(() => {
          inputRef.current?.measureInWindow((x, y, width, height) => {
            const screenHeight = Dimensions.get('window').height;
            const keyboardApproximateHeight = screenHeight * 0.4; // Approximate keyboard height
            const targetY = y - scale(80); // Position input above keyboard with padding
            
            if ((global as any).scrollViewRef?.current) {
              (global as any).scrollViewRef.current.scrollTo({ 
                y: Math.max(0, targetY), 
                animated: true 
              });
            }
          });
        }, 150);
      }
    };

    return (
      <View style={{ marginBottom: scale(20), paddingTop: scale(8) }}>
        <Animated.Text style={labelStyle}>{label}</Animated.Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
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
  const user = getAuth().currentUser;
  const isEditMode = !!user;
  const scrollViewRef = useRef<ScrollView>(null);

  // Make scrollViewRef globally accessible for FloatingLabelInput components
  React.useEffect(() => {
    (global as any).scrollViewRef = scrollViewRef;
    return () => {
      delete (global as any).scrollViewRef;
    };
  }, []);

  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', department: '', year: '', age: '',gender: '',
    bloodGroup: '', phone: '', password: '', confirmPassword: '',isNssVolunteer: '', nssUnit: '',
  });
  const [isLoading, setIsLoading] = useState(isEditMode);

  const waitForAuthSync = async (uid: string) => {
    const auth = getAuth();
    if (auth.currentUser?.uid === uid) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 2000);
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser?.uid === uid) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });
  };

  const validateEmail = (email: string) => {
    const normalized = email.trim().toLowerCase();
    const parts = normalized.split('@');
    if (parts.length !== 2) return false;
    const [localPart, domain] = parts;
    return localPart.length > 0 && domain === 'pondiuni.ac.in';
  };
  const validateGender = (gender: string) => GENDERS.includes(gender);
  const validateAge = (age: string) => { const num = Number(age); return !isNaN(num) && num > 15; };
  const validateBloodGroup = (bg: string) => BLOOD_GROUPS.includes(bg);
  const validatePassword = (password: string) => password.length >= 6;
  const validateMobile = (phone: string) => /^[6-9]\d{9}$/.test(phone);


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
              year: data.year || '',
              age: data.age ? String(data.age) : '',
              gender: data.gender || '',
              bloodGroup: data.bloodGroup || '',
              phone: data.phone || '',
              isNssVolunteer: data.isNssVolunteer || '',
              nssUnit: data.nssUnit || '',
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
    const { email, password, confirmPassword, age, gender, phone, bloodGroup, ...profileData } = form;

    if (!profileData.firstName || !profileData.lastName || !profileData.department || !profileData.year) {
      showAlert('Missing Information', 'Please fill all required fields including name, department, and year.');
      return;
    }
    if (form.isNssVolunteer === 'Yes' && !form.nssUnit) {
      showAlert('Missing Information', 'Please select your NSS Unit.');
      return;
    }
    if (!isEditMode && !validateEmail(email.trim())) {
      showAlert('Validation Error', 'Please enter a valid Pondicherry University email address.');
      return;
    }
    if (!validateGender(gender)) {
      showAlert('Validation Error', 'Please select a valid gender.');
      return;
    }
    if (!validateAge(age)) {
      showAlert('Validation Error', 'Please enter a valid age (must be greater than 15).');
      return;
    }
    if (!validateBloodGroup(bloodGroup)) {
      showAlert('Validation Error', 'Please select a valid blood group.');
      return;
    }
    if (!validateMobile(phone)){
        showAlert('Mobile Number is not Valid','Please Enter Correct Valid Mobile No.');
        return;
    }
    if (!isEditMode) {
      if (!email || !password) {
        showAlert('Missing Information', 'Please provide an email and password.');
        return;
      }
      if (!validatePassword(password)) {
        showAlert('Validation Error', 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        showAlert('Passwords do not match');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isEditMode && user) {
        const userDocRef = doc(db, 'users', user.uid);
        const updateData: any = {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          name: `${form.firstName} ${form.lastName}`,
          department: profileData.department,
          year: profileData.year,
          age: age,
          gender: gender,
          bloodGroup: bloodGroup,
          phone: phone,
          isNssVolunteer: form.isNssVolunteer,
        };
        
        if (form.isNssVolunteer === 'Yes') {
          updateData.nssUnit = form.nssUnit;
          updateData.nssStatus = 'pending';
        } else {
          updateData.nssUnit = '';
          updateData.nssStatus = '';
        }
        
        await updateDoc(userDocRef, updateData);
        showAlert('Profile Updated!', 'Your details have been saved successfully.');
        router.back();
      } else {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
        const newUser = userCredential.user;

        // Ensure auth token/session is fully available before Firestore write.
        await newUser.getIdToken(true);
        await waitForAuthSync(newUser.uid);
        
        // Send email verification
        await sendEmailVerification(newUser);

        // Get push notification token
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

        // Create user profile in Firestore
        const newUserProfile: any = {
          firstName: form.firstName,
          lastName: form.lastName,
          department: form.department,
          year: form.year,
          age: form.age,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          phone: form.phone,
          isNssVolunteer: form.isNssVolunteer,
          email: email.trim(),
          uid: newUser.uid,
          createdAt: new Date(),
          emailVerified: false, // Add this flag to track verification status
          pushToken: pushToken, // Save push token
        };
        if (form.isNssVolunteer === 'Yes') {
          newUserProfile.nssStatus = 'pending';
          newUserProfile.nssUnit = form.nssUnit;
        }
        try {
          await setDoc(doc(db, 'users', newUser.uid), newUserProfile);
        } catch (profileWriteError: unknown) {
          if (profileWriteError instanceof FirebaseError && profileWriteError.code === 'permission-denied') {
            await new Promise(resolve => setTimeout(resolve, 800));
            await newUser.getIdToken(true);
            await setDoc(doc(db, 'users', newUser.uid), newUserProfile);
          } else {
            throw profileWriteError;
          }
        }
        
        // Sign out the user immediately after registration
        await signOut(getAuth());
        
        // Clear loading state before showing alert
        setIsLoading(false);
        
        // Show success message and redirect to login
        showAlert(
          'Registration Successful!', 
          'A verification link has been sent to your email. Please check your inbox and verify your email before logging in.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Use setTimeout to ensure Alert is dismissed before navigation
                setTimeout(() => {
                  router.replace('/login');
                }, 100);
              }
            }
          ]
        );
        return; // Exit early to prevent further execution
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      let message = 'An unknown error occurred. Please try again.';

      if (error instanceof FirebaseError) {
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
              case 'auth/network-request-failed':
                  message = 'Network error. Please check your internet connection and try again.';
                  break;
              case 'auth/operation-not-allowed':
                  message = 'Email/password accounts are not enabled. Please contact support.';
                  break;
              case 'auth/too-many-requests':
                  message = 'Too many failed attempts. Please try again later.';
                  break;
                case 'permission-denied':
                  message = 'Unable to create your profile due to permissions. Please try again once.';
                  break;
              default:
                  message = `Registration failed: ${error.message}`;
          }
      }
      
      showAlert('Registration Failed', message);
    } finally {
      // Ensure loading state is always cleared
      setIsLoading(false);
    }
  };

  
  const ContentWrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
  const wrapperProps = Platform.OS === 'web' 
    ? { style: { flex: 1 } }
    : {
        style: { flex: 1 },
        behavior: (Platform.OS === 'ios' ? 'padding' : 'height') as 'padding' | 'height',
        keyboardVerticalOffset: Platform.OS === 'ios' ? 90 : 0,
      };
  
     return (
    <SafeAreaView style={styles.container}>
      <ContentWrapper {...wrapperProps}>
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: scale(200) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'interactive'}
          scrollEnabled={true}
          bounces={Platform.OS !== 'web'}
          alwaysBounceVertical={Platform.OS !== 'web'}
          automaticallyAdjustsScrollIndicatorInsets={Platform.OS !== 'web'}
          automaticallyAdjustContentInsets={Platform.OS !== 'web'}
          scrollEventThrottle={Platform.OS === 'web' ? undefined : 16}
        >
        <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
          <View style={styles.card}>
          
            {!isEditMode && (
            <View style={styles.tabContainer}>
              <Text style={styles.tab} onPress={() => router.push('/login')}>Login</Text>
              <Text style={[styles.tab, styles.activeTab]}>Register</Text>
            </View>
          )}

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
          <Text style={styles.label}>Department</Text>
          <View style={styles.pickerContainer}>
            <FormSelect
              value={form.department}
              onValueChange={(itemValue) => handleChange('department', itemValue)}
              options={toOptions(DEPARTMENTS, 'Select Department...')}
            />
          </View>

          <Text style={styles.label}>Year</Text>
          <View style={styles.pickerContainer}>
            <FormSelect
              value={form.year}
              onValueChange={(itemValue) => handleChange('year', itemValue)}
              options={toOptions(YEARS, 'Select Year...')}
            />
          </View>
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
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <FormSelect
              value={form.gender}
              onValueChange={value => handleChange('gender', value)}
              options={toOptions(GENDERS, 'Select Gender')}
            />
          </View>
          
          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.pickerContainer}>
            <FormSelect
              value={form.bloodGroup}
              onValueChange={value => handleChange('bloodGroup', value)}
              options={toOptions(BLOOD_GROUPS, 'Select Blood Group')}
            />
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
          </View>
        </TouchableWithoutFeedback>
        </ScrollView>
      </ContentWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF0F3',
  },
  card: {
    backgroundColor: '#F8FAFC',
    padding: scale(25),
    borderRadius: scale(20),
    margin: scale(20),
    marginBottom: scale(40),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: scale(3) },
    shadowRadius: scale(10),
    elevation: 6,
  },
  disabledInput: { backgroundColor: '#f5f5f5', color: '#999' },
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
  registerButton: {
    backgroundColor: '#E0E5EC',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
    marginTop: scale(10),
  },
  registerButtonText: {
    fontWeight: 'bold',
    fontSize: scale(16),
  },
  signInText: {
    textAlign: 'center',
    marginTop: scale(15),
    color: '#666',
    fontSize: scale(14),
  },
  signInLink: {
    color: '#0066cc',
  },
});

