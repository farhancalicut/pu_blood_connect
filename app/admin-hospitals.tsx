import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { HospitalUser } from '../types/env';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = {
  primaryRed: '#9B0000',
  darkText: '#333333',
  lightText: '#8A8A8A',
  white: '#ffffff',
  borderLight: '#EAEAEA',
  pageBg: '#F7F7F7',
  success: '#34C759',
  warning: '#FF9500',
};

export default function AdminHospitalsScreen() {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [hospitals, setHospitals] = useState<HospitalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalUser | null>(null);

  // Form states
  const [hospitalName, setHospitalName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHospitals = useCallback(async () => {
    setIsLoading(true);
    try {
      const hospitalsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'hospital')
      );
      const querySnapshot = await getDocs(hospitalsQuery);
      const hospitalsData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      } as HospitalUser));
      
      setHospitals(hospitalsData);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      Alert.alert('Error', 'Failed to fetch hospitals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchHospitals();
  }, [fetchHospitals]));

  const resetForm = () => {
    setHospitalName('');
    setEmail('');
    setContactNumber('');
    setAddress('');
    setLicenseNumber('');
    setPassword('');
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleCreateHospital = async () => {
    if (!hospitalName || !email || !contactNumber || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create authentication account
      const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + process.env.EXPO_PUBLIC_FIREBASE_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create account');
      }

      // Create hospital user document with uid as document ID
      const hospitalDocRef = doc(db, 'users', data.localId);
      await setDoc(hospitalDocRef, {
        uid: data.localId,
        role: 'hospital',
        hospitalName,
        email,
        contactNumber,
        address,
        licenseNumber,
        verified: true,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid,
      });

      Alert.alert(
        'Success',
        `Hospital account created!\n\nEmail: ${email}\nPassword: ${password}\n\nPlease share these credentials with the hospital.`,
        [
          {
            text: 'Copy Password',
            onPress: () => {
              // In a real app, you'd use Clipboard API
              console.log('Password:', password);
            },
          },
          { text: 'OK', onPress: () => {} },
        ]
      );

      resetForm();
      setShowAddModal(false);
      fetchHospitals();
    } catch (error: any) {
      console.error('Error creating hospital:', error);
      Alert.alert('Error', error.message || 'Failed to create hospital account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVerification = async (hospital: HospitalUser) => {
    try {
      const hospitalRef = doc(db, 'users', hospital.uid);
      await updateDoc(hospitalRef, {
        verified: !hospital.verified,
      });
      Alert.alert('Success', `Hospital ${hospital.verified ? 'deactivated' : 'activated'} successfully`);
      fetchHospitals();
    } catch (error) {
      console.error('Error updating hospital:', error);
      Alert.alert('Error', 'Failed to update hospital status');
    }
  };

  const handleDeleteHospital = async (hospital: HospitalUser) => {
    Alert.alert(
      'Delete Hospital',
      `Are you sure you want to delete ${hospital.hospitalName}? This will also delete all their blood requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete hospital user document
              await deleteDoc(doc(db, 'users', hospital.uid));
              
              // Delete all blood requests by this hospital
              const requestsQuery = query(
                collection(db, 'requests'),
                where('hospitalId', '==', hospital.uid)
              );
              const requestsSnapshot = await getDocs(requestsQuery);
              const deletePromises = requestsSnapshot.docs.map(docSnap => 
                deleteDoc(doc(db, 'requests', docSnap.id))
              );
              await Promise.all(deletePromises);

              Alert.alert('Success', 'Hospital deleted successfully');
              fetchHospitals();
            } catch (error) {
              console.error('Error deleting hospital:', error);
              Alert.alert('Error', 'Failed to delete hospital');
            }
          },
        },
      ]
    );
  };

  const renderHospitalItem = ({ item }: { item: HospitalUser }) => (
    <View style={styles.hospitalCard}>
      <View style={styles.hospitalHeader}>
        <View style={styles.hospitalIconContainer}>
          <Ionicons name="business" size={24} color={palette.primaryRed} />
        </View>
        <View style={styles.hospitalInfo}>
          <View style={styles.hospitalNameRow}>
            <Text style={styles.hospitalName}>{item.hospitalName}</Text>
            {item.verified && (
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
            )}
          </View>
          <Text style={styles.hospitalEmail}>{item.email}</Text>
        </View>
      </View>

      <View style={styles.hospitalDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={palette.lightText} />
          <Text style={styles.detailText}>{item.contactNumber}</Text>
        </View>
        {item.address && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={palette.lightText} />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
        )}
        {item.licenseNumber && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={16} color={palette.lightText} />
            <Text style={styles.detailText}>License: {item.licenseNumber}</Text>
          </View>
        )}
      </View>

      <View style={styles.hospitalActions}>
        <TouchableOpacity
          style={[styles.actionButton, item.verified ? styles.deactivateButton : styles.activateButton]}
          onPress={() => handleToggleVerification(item)}
        >
          <Ionicons
            name={item.verified ? 'close-circle-outline' : 'checkmark-circle-outline'}
            size={18}
            color={item.verified ? palette.warning : palette.success}
          />
          <Text style={[styles.actionButtonText, { color: item.verified ? palette.warning : palette.success }]}>
            {item.verified ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteHospital(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#DC3545" />
          <Text style={[styles.actionButtonText, { color: '#DC3545' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={palette.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Hospitals</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color={palette.white} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primaryRed} />
            <Text style={styles.loadingText}>Loading hospitals...</Text>
          </View>
        ) : (
          <FlatList
            data={hospitals}
            renderItem={renderHospitalItem}
            keyExtractor={item => item.uid}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={60} color={palette.lightText} />
                <Text style={styles.emptyText}>No hospitals registered</Text>
                <Text style={styles.emptySubtext}>Tap + to add a new hospital</Text>
              </View>
            }
          />
        )}

        {/* Add Hospital Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Hospital</Text>
                <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={palette.darkText} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <Text style={styles.inputLabel}>Hospital Name *</Text>
                <TextInput
                  style={styles.input}
                  value={hospitalName}
                  onChangeText={setHospitalName}
                  placeholder="e.g., City Medical Center"
                />

                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="hospital@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Contact Number *</Text>
                <TextInput
                  style={styles.input}
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="+91 9876543210"
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Full address of the hospital"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>License Number</Text>
                <TextInput
                  style={styles.input}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="Hospital registration number"
                />

                <Text style={styles.inputLabel}>Password *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    secureTextEntry={false}
                  />
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={generateRandomPassword}
                  >
                    <Ionicons name="refresh" size={20} color={palette.white} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Click the refresh button to generate a secure password
                </Text>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleCreateHospital}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Hospital Account</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(15),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: palette.pageBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: palette.darkText,
  },
  addButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: palette.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(10),
    fontSize: scale(16),
    color: palette.lightText,
  },
  listContainer: {
    padding: scale(15),
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: scale(100),
  },
  emptyText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: palette.darkText,
    marginTop: scale(20),
  },
  emptySubtext: {
    fontSize: scale(14),
    color: palette.lightText,
    marginTop: scale(8),
  },
  hospitalCard: {
    backgroundColor: palette.white,
    borderRadius: scale(12),
    padding: scale(15),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: palette.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  hospitalIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: `${palette.primaryRed}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  hospitalName: {
    fontSize: scale(16),
    fontWeight: '700',
    color: palette.darkText,
  },
  hospitalEmail: {
    fontSize: scale(13),
    color: palette.lightText,
    marginTop: scale(4),
  },
  hospitalDetails: {
    gap: scale(8),
    marginBottom: scale(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  detailText: {
    fontSize: scale(13),
    color: palette.lightText,
  },
  hospitalActions: {
    flexDirection: 'row',
    gap: scale(10),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    gap: scale(6),
  },
  activateButton: {
    borderColor: palette.success,
    backgroundColor: `${palette.success}10`,
  },
  deactivateButton: {
    borderColor: palette.warning,
    backgroundColor: `${palette.warning}10`,
  },
  deleteButton: {
    borderColor: '#DC3545',
    backgroundColor: '#DC354510',
  },
  actionButtonText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  modalTitle: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: palette.darkText,
  },
  modalForm: {
    padding: scale(20),
  },
  inputLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: palette.darkText,
    marginBottom: scale(8),
    marginTop: scale(12),
  },
  input: {
    backgroundColor: palette.pageBg,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: scale(10),
    padding: scale(12),
    fontSize: scale(15),
    color: palette.darkText,
  },
  textArea: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    gap: scale(10),
  },
  passwordInput: {
    flex: 1,
  },
  generateButton: {
    width: scale(50),
    backgroundColor: palette.primaryRed,
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: scale(12),
    color: palette.lightText,
    marginTop: scale(4),
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: palette.primaryRed,
    borderRadius: scale(12),
    padding: scale(16),
    alignItems: 'center',
    marginTop: scale(24),
    marginBottom: scale(20),
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.white,
  },
});
