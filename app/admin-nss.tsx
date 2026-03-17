import { Check, X, CheckCircle, ArrowLeft, Users } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import FormSelect from './_components/FormSelect';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';
import { notifyNSSApproval } from '../utils/notifications';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = {
  primary: '#9B0000',
  secondary: '#F8FAFC',
  white: '#FFFFFF',
  text: '#333333',
  lightText: '#8A8A8A',
  border: '#EAEAEA',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  background: '#F7F7F7'
};

const NSS_UNITS = ['All Units', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5(Karaikal)'];

type NSSStudent = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  year: string;
  bloodGroup: string;
  phone: string;
  nssUnit: string;
  nssStatus: 'pending' | 'approved' | 'rejected';
  createdAt: any;
};

export default function AdminNSSScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [selectedUnit, setSelectedUnit] = useState('All Units');
  const [pendingStudents, setPendingStudents] = useState<NSSStudent[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<NSSStudent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const checkAdminAccess = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        router.replace('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        showAlert('Access Denied', 'You do not have permission to access this page.');
        router.back();
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      showAlert('Error', 'Failed to verify admin access.');
      router.back();
    }
  }, [router]);

  const fetchNSSStudents = useCallback(async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('isNssVolunteer', '==', 'Yes'),
        orderBy('createdAt', 'desc')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const allNSSStudents = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as NSSStudent[];

      const pending = allNSSStudents.filter(student => 
        student.nssStatus === 'pending' || !student.nssStatus
      );
      const approved = allNSSStudents.filter(student => 
        student.nssStatus === 'approved'
      );

      setPendingStudents(pending);
      setApprovedStudents(approved);
    } catch (error) {
      console.error('Error fetching NSS students:', error);
      showAlert('Error', 'Failed to load NSS students data.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        await checkAdminAccess();
        await fetchNSSStudents();
        setIsLoading(false);
      };
      loadData();
    }, [checkAdminAccess, fetchNSSStudents])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNSSStudents();
    setRefreshing(false);
  }, [fetchNSSStudents]);

  const handleApprove = async (studentId: string) => {
    setProcessingIds(prev => new Set(prev).add(studentId));
    try {
      // Get student data first
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      const studentData = studentDoc.data();
      
      await updateDoc(doc(db, 'users', studentId), {
        nssStatus: 'approved'
      });
      
      // Send notification to student
      if (studentData?.pushToken) {
        try {
          const studentName = studentData.firstName || 'Student';
          await notifyNSSApproval(studentData.pushToken, studentId, studentName, true);
        } catch (notifError) {
          console.error('Error sending NSS approval notification:', notifError);
        }
      }
      
      showAlert('Success', 'Student approved successfully!');
      await fetchNSSStudents();
    } catch (error) {
      console.error('Error approving student:', error);
      showAlert('Error', 'Failed to approve student.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const handleReject = async (studentId: string) => {
    showAlert(
      'Reject Student',
      'Are you sure you want to reject this NSS application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingIds(prev => new Set(prev).add(studentId));
            try {
              // Get student data first
              const studentDoc = await getDoc(doc(db, 'users', studentId));
              const studentData = studentDoc.data();
              
              await updateDoc(doc(db, 'users', studentId), {
                nssStatus: 'rejected'
              });
              
              // Send notification to student
              if (studentData?.pushToken) {
                try {
                  const studentName = studentData.firstName || 'Student';
                  await notifyNSSApproval(studentData.pushToken, studentId, studentName, false);
                } catch (notifError) {
                  console.error('Error sending NSS rejection notification:', notifError);
                }
              }
              
              showAlert('Success', 'Student application rejected.');
              await fetchNSSStudents();
            } catch (error) {
              console.error('Error rejecting student:', error);
              showAlert('Error', 'Failed to reject student.');
            } finally {
              setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(studentId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  const getFilteredStudents = (students: NSSStudent[]) => {
    if (selectedUnit === 'All Units') {
      return students;
    }
    return students.filter(student => student.nssUnit === selectedUnit);
  };

  const renderStudentCard = ({ item }: { item: NSSStudent }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.studentDetail}>{item.department} • {item.year} Year</Text>
          <Text style={styles.studentDetail}>{item.email}</Text>
          <Text style={styles.studentDetail}>📞 {item.phone}</Text>
        </View>
        <View style={styles.studentMeta}>
          <View style={[styles.unitBadge, { backgroundColor: getUnitColor(item.nssUnit) }]}>
            <Text style={styles.unitText}>{item.nssUnit}</Text>
          </View>
          <Text style={styles.bloodGroup}>{item.bloodGroup}</Text>
        </View>
      </View>

      {activeTab === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.uid)}
            disabled={processingIds.has(item.uid)}
          >
            {processingIds.has(item.uid) ? (
              <ActivityIndicator color={palette.white} size="small" />
            ) : (
              <>
                <Check size={scale(16)} color={palette.white} />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.uid)}
            disabled={processingIds.has(item.uid)}
          >
            <X size={scale(16)} color={palette.white} />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'approved' && (
        <View style={styles.approvedBadge}>
          <CheckCircle size={scale(16)} color={palette.success} />
          <Text style={styles.approvedText}>Approved NSS Volunteer</Text>
        </View>
      )}
    </View>
  );

  const getUnitColor = (unit: string) => {
    const colors = {
      'Unit 1': '#4A90E2',
      'Unit 2': '#7ED321',
      'Unit 3': '#F5A623',
      'Unit 4': '#D0021B',
      'Unit 5(Karaikal)': '#9B59B6'
    };
    return colors[unit as keyof typeof colors] || palette.lightText;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Loading NSS Management...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const currentStudents = activeTab === 'pending' ? 
    getFilteredStudents(pendingStudents) : 
    getFilteredStudents(approvedStudents);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/admin-dashboard')}
        >
          <ArrowLeft size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NSS Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingStudents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
            Approved ({approvedStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unit Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Unit:</Text>
        <View style={styles.pickerContainer}>
          <FormSelect
            value={selectedUnit}
            onValueChange={setSelectedUnit}
            options={NSS_UNITS.map((unit) => ({ label: unit, value: unit }))}
          />
        </View>
      </View>

      {/* Students List */}
      <FlatList
        data={currentStudents}
        renderItem={renderStudentCard}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users size={scale(64)} color={palette.lightText} />
            <Text style={styles.emptyText}>
              {activeTab === 'pending' 
                ? 'No pending NSS applications' 
                : 'No approved NSS volunteers'}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedUnit !== 'All Units' && `for ${selectedUnit}`}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(15),
    paddingVertical: scale(12),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.text,
  },
  headerSpacer: {
    width: scale(34), // Same width as back button to center title
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: scale(16),
    color: palette.text,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  tab: {
    flex: 1,
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: palette.primary,
  },
  tabText: {
    fontSize: scale(12),
    fontWeight: '500',
    color: palette.lightText,
  },
  activeTabText: {
    color: palette.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(15),
    paddingVertical: scale(8),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  filterLabel: {
    fontSize: scale(12),
    fontWeight: '500',
    color: palette.text,
    marginRight: scale(8),
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: scale(8),
    backgroundColor: palette.secondary,
    height: scale(40),
    justifyContent: 'center',
    minWidth: 0,
    overflow: 'hidden',
  },
  picker: {
    height: scale(50),
    width: '100%',
    minWidth: 0,
  },
  listContainer: {
    padding: scale(16),
  },
  studentCard: {
    backgroundColor: palette.white,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.text,
    marginBottom: scale(4),
  },
  studentDetail: {
    fontSize: scale(12),
    color: palette.lightText,
    marginBottom: scale(2),
  },
  studentMeta: {
    alignItems: 'flex-end',
  },
  unitBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    marginBottom: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: scale(10),
    fontWeight: '600',
    color: palette.white,
  },
  bloodGroup: {
    fontSize: scale(14),
    fontWeight: '600',
    color: palette.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(8),
    gap: scale(6),
  },
  approveButton: {
    backgroundColor: palette.success,
  },
  rejectButton: {
    backgroundColor: palette.danger,
  },
  actionButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: palette.white,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(8),
    backgroundColor: '#E8F5E8',
    borderRadius: scale(8),
    gap: scale(6),
  },
  approvedText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: palette.success,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyText: {
    fontSize: scale(16),
    fontWeight: '500',
    color: palette.lightText,
    marginTop: scale(16),
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: scale(14),
    color: palette.lightText,
    marginTop: scale(4),
    textAlign: 'center',
  },
});
