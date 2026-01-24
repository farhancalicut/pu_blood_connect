import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { notifyUsersAboutBloodRequest } from '../utils/notifications';

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
  critical: '#DC3545',
};

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgencyLevels = ['normal', 'critical'];

export default function HospitalAddRequestScreen() {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const params = useLocalSearchParams();
  const requestId = params.id as string | undefined;

  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [unitsNeeded, setUnitsNeeded] = useState('');
  const [urgency, setUrgency] = useState<'critical' | 'normal'>('normal');
  const [requiredBy, setRequiredBy] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    fetchHospitalName();
    if (requestId) {
      fetchRequestData();
    }
  }, [requestId]);

  const fetchRequestData = async () => {
    if (!requestId) return;
    setIsLoading(true);
    try {
      const requestRef = doc(db, 'requests', requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
        const data = requestSnap.data();
        setPatientName(data.patientName || '');
        setBloodGroup(data.bloodGroup || '');
        setUnitsNeeded(data.unitsNeeded?.toString() || '');
        setUrgency(data.urgency || 'normal');
        setRequiredBy(data.requiredBy?.toDate?.() || new Date(data.requiredBy));
        setContactNumber(data.contactNumber || '');
        setAdditionalNotes(data.additionalNotes || '');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      Alert.alert('Error', 'Failed to load request data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHospitalName = async () => {
    if (!currentUser) return;
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', currentUser.email)
      );
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        const hospitalData = usersSnapshot.docs[0].data();
        setHospitalName(hospitalData.hospitalName || '');
        if (!requestId) {
          setContactNumber(hospitalData.contactNumber || '');
        }
      }
    } catch (error) {
      console.error('Error fetching hospital name:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setRequiredBy(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(requiredBy);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setRequiredBy(newDate);
    }
  };

  const validateForm = () => {
    if (!patientName.trim()) {
      Alert.alert('Error', 'Please enter patient name');
      return false;
    }
    if (!bloodGroup) {
      Alert.alert('Error', 'Please select blood group');
      return false;
    }
    if (!unitsNeeded || parseInt(unitsNeeded) < 1) {
      Alert.alert('Error', 'Please enter valid units needed (minimum 1)');
      return false;
    }
    if (!contactNumber.trim()) {
      Alert.alert('Error', 'Please enter contact number');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const requestData = {
        hospitalId: currentUser?.uid,
        hospitalName: hospitalName,
        patientName: patientName.trim(),
        bloodGroup: bloodGroup,
        unitsNeeded: parseInt(unitsNeeded),
        urgency: urgency,
        requiredBy: requiredBy,
        contactNumber: contactNumber.trim(),
        additionalNotes: additionalNotes.trim(),
        status: 'active',
      };

      if (requestId) {
        // Update existing request
        const requestRef = doc(db, 'requests', requestId);
        await updateDoc(requestRef, {
          ...requestData,
          updatedAt: serverTimestamp(),
        });

        Alert.alert(
          'Success',
          'Blood request updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        // Create new request
        const newRequestData = {
          ...requestData,
          acceptedDonors: [],
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'requests'), newRequestData);

        // Send notifications to matching blood group users
        try {
          await notifyUsersAboutBloodRequest(
            bloodGroup,
            patientName,
            hospitalName,
            urgency === 'critical'
          );
        } catch (notifError) {
          console.error('Error sending notifications:', notifError);
          // Don't fail the request creation if notification fails
        }

        Alert.alert(
          'Success',
          'Blood request created successfully! Donors will be notified.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving blood request:', error);
      Alert.alert('Error', 'Failed to save blood request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={palette.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{requestId ? 'Edit Blood Request' : 'New Blood Request'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={palette.primaryRed} />
            <Text style={{ marginTop: 12, color: palette.lightText }}>Loading request...</Text>
          </View>
        ) : (
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Patient Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Patient Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={patientName}
                onChangeText={setPatientName}
                placeholder="Enter patient name"
                placeholderTextColor={palette.lightText}
              />
            </View>

            {/* Blood Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Blood Group <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.bloodGroupGrid}>
                {bloodGroups.map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[
                      styles.bloodGroupButton,
                      bloodGroup === group && styles.bloodGroupButtonActive,
                    ]}
                    onPress={() => setBloodGroup(group)}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        bloodGroup === group && styles.bloodGroupTextActive,
                      ]}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Units Needed */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Units Needed <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={unitsNeeded}
                onChangeText={setUnitsNeeded}
                placeholder="Enter number of units"
                placeholderTextColor={palette.lightText}
                keyboardType="number-pad"
              />
            </View>

            {/* Urgency Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Urgency Level <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.urgencyContainer}>
                {urgencyLevels.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.urgencyButton,
                      urgency === level && styles.urgencyButtonActive,
                      urgency === level && level === 'critical' && { borderColor: palette.critical, backgroundColor: palette.critical + '15' },
                      urgency === level && level === 'normal' && { borderColor: palette.success, backgroundColor: palette.success + '15' },
                    ]}
                    onPress={() => setUrgency(level as 'critical' | 'normal')}
                  >
                    <Ionicons
                      name={level === 'critical' ? 'alert-circle' : 'information-circle'}
                      size={20}
                      color={
                        urgency === level
                          ? level === 'critical' ? palette.critical : palette.success
                          : palette.lightText
                      }
                    />
                    <Text
                      style={[
                        styles.urgencyText,
                        urgency === level && level === 'critical' && { color: palette.critical },
                        urgency === level && level === 'normal' && { color: palette.success },
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Required By */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Required By <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={palette.primaryRed} />
                  <Text style={styles.dateTimeText}>
                    {requiredBy.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={palette.primaryRed} />
                  <Text style={styles.dateTimeText}>
                    {requiredBy.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={requiredBy}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={requiredBy}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </View>

            {/* Contact Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="+91 9876543210"
                placeholderTextColor={palette.lightText}
                keyboardType="phone-pad"
              />
            </View>

            {/* Additional Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                placeholder="Any additional information for donors..."
                placeholderTextColor={palette.lightText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <>
                  <Ionicons name={requestId ? "checkmark-circle-outline" : "add-circle-outline"} size={20} color={palette.white} />
                  <Text style={styles.submitButtonText}>{requestId ? 'Update Blood Request' : 'Create Blood Request'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        )}
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
  headerSpacer: {
    width: scale(40),
  },
  container: {
    flex: 1,
    backgroundColor: palette.pageBg,
  },
  form: {
    padding: scale(20),
  },
  inputGroup: {
    marginBottom: scale(20),
  },
  label: {
    fontSize: scale(15),
    fontWeight: '600',
    color: palette.darkText,
    marginBottom: scale(8),
  },
  required: {
    color: palette.critical,
  },
  input: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(15),
    color: palette.darkText,
  },
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(4),
  },
  bloodGroupButton: {
    width: '23%',
    paddingVertical: scale(14),
    paddingHorizontal: scale(6),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: palette.borderLight,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodGroupButtonActive: {
    borderColor: palette.primaryRed,
    backgroundColor: palette.primaryRed + '15',
  },
  bloodGroupText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: palette.lightText,
  },
  bloodGroupTextActive: {
    color: palette.primaryRed,
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: scale(12),
    flexWrap: 'wrap',
  },
  urgencyButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: palette.borderLight,
    backgroundColor: palette.white,
  },
  urgencyButtonActive: {
    borderWidth: 2,
  },
  urgencyText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: palette.lightText,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: scale(10),
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: scale(12),
    padding: scale(14),
  },
  dateTimeText: {
    fontSize: scale(15),
    color: palette.darkText,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: palette.primaryRed,
    borderRadius: scale(12),
    padding: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    marginTop: scale(10),
    marginBottom: scale(20),
    shadowColor: palette.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.white,
  },
});
