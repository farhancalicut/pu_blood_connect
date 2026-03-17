import { Clock, Phone, Users, ChevronRight, Trash2, ChevronLeft, Plus, FileText, Droplet, CheckCheck, Edit2, AlertCircle, AlertTriangle, Info, LucideIcon } from 'lucide-react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';
import { BloodRequest } from '../types/env';

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

export default function HospitalMyRequestsScreen() {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'fulfilled'>('all');

  const fetchRequests = useCallback(async () => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setIsLoading(true);
    try {
      const requestsQuery = query(
        collection(db, 'requests'),
        where('hospitalId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(requestsQuery);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BloodRequest[];

      // Sort by creation date (newest first)
      requestsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      showAlert('Error', 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, router]);

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, [fetchRequests]));

  const handleStatusChange = async (request: BloodRequest, newStatus: 'active' | 'fulfilled') => {
    try {
      const requestRef = doc(db, 'requests', request.id!);
      await updateDoc(requestRef, { status: newStatus });
      showAlert('Success', `Request marked as ${newStatus}`);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      showAlert('Error', 'Failed to update request status');
    }
  };

  const handleDeleteRequest = async (request: BloodRequest) => {
    showAlert(
      'Delete Request',
      'Are you sure you want to delete this blood request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'requests', request.id!));
              showAlert('Success', 'Request deleted successfully');
              fetchRequests();
            } catch (error) {
              console.error('Error deleting request:', error);
              showAlert('Error', 'Failed to delete request');
            }
          },
        },
      ]
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return palette.critical;
      case 'urgent': return palette.warning;
      default: return palette.success;
    }
  };

  const getUrgencyIcon = (urgency: string): typeof AlertCircle => {
    switch (urgency) {
      case 'critical': return AlertCircle;
      case 'urgent': return AlertTriangle;
      default: return Info;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return palette.success;
      case 'fulfilled': return '#2196F3';
      default: return palette.lightText;
    }
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  const renderRequestItem = ({ item }: { item: BloodRequest }) => {
    const requiredByDate = item.requiredBy?.toDate?.() || new Date(item.requiredBy);
    
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => router.push(`/hospital-request-details?id=${item.id}` as any)}
      >
        {/* Header */}
        <View style={styles.requestHeader}>
          <View style={[styles.bloodGroupBadge, { backgroundColor: getUrgencyColor(item.urgency) + '15' }]}>
            <Text style={[styles.bloodGroupText, { color: getUrgencyColor(item.urgency) }]}>
              {item.bloodGroup}
            </Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) + '15' }]}>
            {React.createElement(getUrgencyIcon(item.urgency), {
              size: 14,
              color: getUrgencyColor(item.urgency)
            })}
            <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
              {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Patient Info */}
        <Text style={styles.patientName}>{item.patientName}</Text>
        <View style={styles.detailsRow}>
          <Droplet size={16} color={palette.lightText} />
          <Text style={styles.detailsText}>
            {item.unitsNeeded} {item.unitsNeeded === 1 ? 'unit' : 'units'} needed
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Clock size={16} color={palette.lightText} />
          <Text style={styles.detailsText}>
            Required by: {requiredByDate.toLocaleDateString()} at {requiredByDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Phone size={16} color={palette.lightText} />
          <Text style={styles.detailsText}>{item.contactNumber}</Text>
        </View>

        {/* Donors Info */}
        <View style={styles.donorsContainer}>
          <View style={styles.donorsInfo}>
            <Users size={18} color={palette.success} />
            <Text style={styles.donorsText}>
              {item.acceptedDonors?.length || 0} donor{(item.acceptedDonors?.length || 0) !== 1 ? 's' : ''} accepted
            </Text>
          </View>
          {(item.acceptedDonors?.length || 0) > 0 && (
            <TouchableOpacity
              style={styles.viewDonorsButton}
              onPress={() => router.push(`/hospital-request-details?id=${item.id}` as any)}
            >
              <Text style={styles.viewDonorsText}>View Donors</Text>
              <ChevronRight size={16} color={palette.primaryRed} />
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Delete Button - Left */}
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: palette.critical, backgroundColor: palette.critical + '15' }]}
            onPress={() => handleDeleteRequest(item)}
          >
            <Trash2 size={14} color={palette.critical} />
            <Text style={[styles.actionButtonText, { color: palette.critical }]}>Delete</Text>
          </TouchableOpacity>
          
          {/* Fulfilled Button - Middle */}
          {item.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: '#2196F3', backgroundColor: '#2196F315' }]}
              onPress={() => handleStatusChange(item, 'fulfilled')}
            >
              <CheckCheck size={14} color="#2196F3" />
              <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Mark Fulfilled</Text>
            </TouchableOpacity>
          )}
          
          {/* Edit Button - Right */}
          {item.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: '#FF9800', backgroundColor: '#FF980015' }]}
              onPress={() => router.push(`/hospital-add-request?id=${item.id}` as any)}
            >
              <Edit2 size={14} color="#FF9800" />
              <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={palette.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Requests</Text>
          <TouchableOpacity
            onPress={() => router.push('/hospital-add-request' as any)}
            style={styles.addButton}
          >
            <Plus size={24} color={palette.white} />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {(['all', 'active', 'fulfilled'] as const).map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[styles.filterTab, filter === filterOption && styles.filterTabActive]}
              onPress={() => setFilter(filterOption)}
            >
              <Text style={[styles.filterTabText, filter === filterOption && styles.filterTabTextActive]}>
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
              {filterOption !== 'all' && (
                <View style={[styles.filterBadge, filter === filterOption && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, filter === filterOption && styles.filterBadgeTextActive]}>
                    {requests.filter(r => r.status === filterOption).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Requests List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primaryRed} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRequests}
            renderItem={renderRequestItem}
            keyExtractor={item => item.id!}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FileText size={60} color={palette.lightText} />
                <Text style={styles.emptyText}>No {filter !== 'all' ? filter : ''} requests</Text>
                <Text style={styles.emptySubtext}>
                  {filter === 'all' 
                    ? 'Create your first blood request' 
                    : `You don't have any ${filter} requests`}
                </Text>
              </View>
            }
          />
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
  addButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: palette.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
    gap: scale(8),
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    backgroundColor: palette.pageBg,
  },
  filterTabActive: {
    backgroundColor: palette.primaryRed,
  },
  filterTabText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: palette.lightText,
  },
  filterTabTextActive: {
    color: palette.white,
  },
  filterBadge: {
    backgroundColor: palette.white,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    minWidth: scale(20),
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: scale(11),
    fontWeight: 'bold',
    color: palette.darkText,
  },
  filterBadgeTextActive: {
    color: palette.white,
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
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: palette.white,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: palette.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
    flexWrap: 'wrap',
  },
  bloodGroupBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  bloodGroupText: {
    fontSize: scale(14),
    fontWeight: 'bold',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  urgencyText: {
    fontSize: scale(12),
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  patientName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.darkText,
    marginBottom: scale(8),
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(6),
  },
  detailsText: {
    fontSize: scale(13),
    color: palette.lightText,
  },
  donorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  donorsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  donorsText: {
    fontSize: scale(14),
    color: palette.success,
    fontWeight: '600',
  },
  viewDonorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  viewDonorsText: {
    fontSize: scale(13),
    color: palette.primaryRed,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(6),
    marginTop: scale(12),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    paddingVertical: scale(7),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    borderWidth: 1.5,
    flex: 1,
  },
  actionButtonText: {
    fontSize: scale(11),
    fontWeight: '700',
  },
});

