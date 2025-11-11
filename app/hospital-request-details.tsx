import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { AcceptedDonor, BloodRequest } from '../types/env';

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

export default function HospitalRequestDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [donors, setDonors] = useState<AcceptedDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequestDetails = useCallback(async () => {
    if (!requestId) {
      Alert.alert('Error', 'Request ID not found');
      router.back();
      return;
    }

    setIsLoading(true);
    try {
      // Fetch request details
      const requestRef = doc(db, 'requests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        Alert.alert('Error', 'Request not found');
        router.back();
        return;
      }

      const requestData = {
        id: requestSnap.id,
        ...requestSnap.data(),
      } as BloodRequest;
      setRequest(requestData);

      // Fetch accepted donors details
      if (requestData.acceptedDonors && requestData.acceptedDonors.length > 0) {
        const donorsData: AcceptedDonor[] = [];
        
        for (const donorId of requestData.acceptedDonors) {
          try {
            const userQuery = query(
              collection(db, 'users'),
              where('uid', '==', donorId)
            );
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              donorsData.push({
                userId: donorId,
                userName: userData.name || `${userData.firstName} ${userData.lastName}`.trim() || 'Unknown',
                bloodGroup: userData.bloodGroup || 'N/A',
                contactNumber: userData.phone || 'N/A',
                department: userData.department || 'N/A',
                acceptedAt: new Date(),
              });
            }
          } catch (error) {
            console.error(`Error fetching donor ${donorId}:`, error);
          }
        }
        
        setDonors(donorsData);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, router]);

  useFocusEffect(useCallback(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]));

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to make phone call');
        }
      })
      .catch((error) => {
        console.error('Error opening phone dialer:', error);
        Alert.alert('Error', 'Failed to open phone dialer');
      });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return palette.critical;
      case 'urgent': return palette.warning;
      default: return palette.success;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return palette.success;
      case 'fulfilled': return '#2196F3';
      case 'closed': return palette.lightText;
      default: return palette.lightText;
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primaryRed} />
            <Text style={styles.loadingText}>Loading request details...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!request) {
    return null;
  }

  const requiredByDate = request.requiredBy?.toDate?.() || new Date(request.requiredBy);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={palette.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Request Info Card */}
          <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={[styles.bloodGroupBadge, { backgroundColor: getUrgencyColor(request.urgency) + '15' }]}>
                <Ionicons name="water" size={20} color={getUrgencyColor(request.urgency)} />
                <Text style={[styles.bloodGroupText, { color: getUrgencyColor(request.urgency) }]}>
                  {request.bloodGroup}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                  {request.status}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Patient Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={palette.lightText} />
              <Text style={styles.infoLabel}>Patient Name:</Text>
              <Text style={styles.infoValue}>{request.patientName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="water-outline" size={20} color={palette.lightText} />
              <Text style={styles.infoLabel}>Units Needed:</Text>
              <Text style={styles.infoValue}>
                {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="alert-circle-outline" size={20} color={getUrgencyColor(request.urgency)} />
              <Text style={styles.infoLabel}>Urgency:</Text>
              <Text style={[styles.infoValue, { color: getUrgencyColor(request.urgency), fontWeight: '600' }]}>
                {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={palette.lightText} />
              <Text style={styles.infoLabel}>Required By:</Text>
              <Text style={styles.infoValue}>
                {requiredByDate.toLocaleDateString()} at {requiredByDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={palette.lightText} />
              <Text style={styles.infoLabel}>Contact:</Text>
              <TouchableOpacity onPress={() => handleCall(request.contactNumber)}>
                <Text style={[styles.infoValue, styles.linkText]}>{request.contactNumber}</Text>
              </TouchableOpacity>
            </View>

            {request.additionalNotes && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: scale(16) }]}>Additional Notes</Text>
                <Text style={styles.notesText}>{request.additionalNotes}</Text>
              </>
            )}
          </View>

          {/* Accepted Donors */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={24} color={palette.primaryRed} />
              <Text style={styles.sectionTitle}>
                Accepted Donors ({donors.length})
              </Text>
            </View>

            {donors.length === 0 ? (
              <View style={styles.emptyDonors}>
                <Ionicons name="people-outline" size={48} color={palette.lightText} />
                <Text style={styles.emptyText}>No donors yet</Text>
                <Text style={styles.emptySubtext}>Waiting for donors to accept this request</Text>
              </View>
            ) : (
              donors.map((donor, index) => (
                <View key={donor.userId} style={styles.donorCard}>
                  <View style={styles.donorHeader}>
                    <View style={styles.donorAvatar}>
                      <Ionicons name="person" size={24} color={palette.white} />
                    </View>
                    <View style={styles.donorInfo}>
                      <Text style={styles.donorName}>{donor.userName}</Text>
                      <Text style={styles.donorDepartment}>{donor.department}</Text>
                    </View>
                    <View style={[styles.donorBloodBadge, { backgroundColor: palette.primaryRed + '15' }]}>
                      <Text style={[styles.donorBloodText, { color: palette.primaryRed }]}>
                        {donor.bloodGroup}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.donorActions}>
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCall(donor.contactNumber)}
                    >
                      <Ionicons name="call" size={18} color={palette.white} />
                      <Text style={styles.callButtonText}>Call {donor.contactNumber}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.pageBg,
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
  container: {
    flex: 1,
  },
  requestCard: {
    backgroundColor: palette.white,
    margin: scale(20),
    borderRadius: scale(12),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(20),
  },
  bloodGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(12),
  },
  bloodGroupText: {
    fontSize: scale(16),
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(12),
  },
  statusText: {
    fontSize: scale(13),
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: palette.darkText,
    marginBottom: scale(12),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
  },
  infoLabel: {
    fontSize: scale(14),
    color: palette.lightText,
    width: scale(100),
  },
  infoValue: {
    flex: 1,
    fontSize: scale(14),
    color: palette.darkText,
    fontWeight: '500',
  },
  linkText: {
    color: palette.primaryRed,
    textDecorationLine: 'underline',
  },
  notesText: {
    fontSize: scale(14),
    color: palette.darkText,
    lineHeight: scale(20),
    backgroundColor: palette.pageBg,
    padding: scale(12),
    borderRadius: scale(8),
  },
  section: {
    marginHorizontal: scale(20),
    marginBottom: scale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(16),
  },
  emptyDonors: {
    backgroundColor: palette.white,
    borderRadius: scale(12),
    padding: scale(40),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.darkText,
    marginTop: scale(12),
  },
  emptySubtext: {
    fontSize: scale(14),
    color: palette.lightText,
    marginTop: scale(4),
    textAlign: 'center',
  },
  donorCard: {
    backgroundColor: palette.white,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  donorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  donorAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: palette.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.darkText,
    marginBottom: scale(2),
  },
  donorDepartment: {
    fontSize: scale(13),
    color: palette.lightText,
  },
  donorBloodBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(10),
  },
  donorBloodText: {
    fontSize: scale(14),
    fontWeight: 'bold',
  },
  donorActions: {
    gap: scale(8),
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: palette.success,
    paddingVertical: scale(12),
    borderRadius: scale(10),
  },
  callButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: palette.white,
  },
});
