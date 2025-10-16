import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';

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
  background: '#F7F7F7'
};

type DashboardStats = {
  totalUsers: number;
  totalDonations: number;
  totalEvents: number;
  pendingApprovals: number;
  recentDonors: number;
  pendingNSS: number;
  approvedNSS: number;
};

type QuickActionItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  route: string;
  color: string;
};

const quickActions: QuickActionItem[] = [
  { icon: 'people-outline', title: 'Manage Users', route: '/admin-users', color: '#4A90E2' },
  { icon: 'checkmark-circle-outline', title: 'Pending Approvals', route: '/admin', color: '#F5A623' },
  { icon: 'shield-outline', title: 'NSS Management', route: '/admin-nss', color: '#8E44AD' },
  { icon: 'calendar-outline', title: 'Manage Events', route: '/admin-events', color: '#7ED321' },
  { icon: 'location-outline', title: 'Blood Banks', route: '/admin-blood-banks', color: '#D0021B' },
  { icon: 'document-text-outline', title: 'Donations', route: '/admin-donations', color: '#9013FE' },
  { icon: 'chatbox-ellipses-outline', title: 'Feedback', route: '/admin-feedback', color: '#50E3C2' }
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDonations: 0,
    totalEvents: 0,
    pendingApprovals: 0,
    recentDonors: 0,
    pendingNSS: 0,
    approvedNSS: 0
  });
  const [adminName, setAdminName] = useState('');

  const checkAdminAndFetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        router.replace('/login');
        return;
      }

      // Check if user is admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists() || userDoc.data()?.role !== 'admin') {
        Alert.alert("Access Denied", "You do not have admin privileges.");
        router.replace('/dashboard');
        return;
      }

      setIsAdmin(true);
      const userData = userDoc.data();
      setAdminName(`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Admin');

      // Fetch dashboard statistics
      const [usersSnap, donationsSnap, eventsSnap, pendingSnap, nssUsersSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'donations')),
        getDocs(collection(db, 'events')),
        getDocs(query(collection(db, 'donationOffers'), where('status', '==', 'credentials_submitted'))),
        getDocs(query(collection(db, 'users'), where('isNssVolunteer', '==', 'Yes')))
      ]);

      const totalDonationsCount = donationsSnap.docs.reduce((sum, doc) => {
        return sum + (doc.data().units || 0);
      }, 0);

      // Count NSS students by status
      const nssStudents = nssUsersSnap.docs.map(doc => doc.data());
      const pendingNSSCount = nssStudents.filter(student => 
        student.nssStatus === 'pending' || !student.nssStatus
      ).length;
      const approvedNSSCount = nssStudents.filter(student => 
        student.nssStatus === 'approved'
      ).length;

      setStats({
        totalUsers: usersSnap.size,
        totalDonations: totalDonationsCount,
        totalEvents: eventsSnap.size,
        pendingApprovals: pendingSnap.size,
        recentDonors: donationsSnap.size,
        pendingNSS: pendingNSSCount,
        approvedNSS: approvedNSSCount
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      Alert.alert('Error', 'Failed to load admin dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      checkAdminAndFetchStats();
    }, [checkAdminAndFetchStats])
  );

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut(getAuth());
            router.replace('/login');
          }
        }
      ]
    );
  };

  const handleQuickAction = (route: string) => {
    router.push(route as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor={palette.white} 
          translucent={false}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={palette.white} 
        translucent={false}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.adminName}>{adminName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={scale(24)} color={palette.primary} />
          </TouchableOpacity>
        </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={scale(24)} color={palette.primary} />
              <Text style={styles.statNumber}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="water" size={scale(24)} color={palette.success} />
              <Text style={styles.statNumber}>{stats.totalDonations}</Text>
              <Text style={styles.statLabel}>Total Donations</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={scale(24)} color={palette.warning} />
              <Text style={styles.statNumber}>{stats.totalEvents}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="time" size={scale(24)} color="#FF6B6B" />
              <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
              <Text style={styles.statLabel}>Pending Approvals</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="shield" size={scale(24)} color="#8E44AD" />
              <Text style={styles.statNumber}>{stats.pendingNSS}</Text>
              <Text style={styles.statLabel}>Pending NSS</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="shield-checkmark" size={scale(24)} color="#27AE60" />
              <Text style={styles.statNumber}>{stats.approvedNSS}</Text>
              <Text style={styles.statLabel}>Approved NSS</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionCard, { borderLeftColor: action.color }]}
                onPress={() => handleQuickAction(action.route)}
              >
                <Ionicons name={action.icon} size={scale(24)} color={action.color} />
                <Text style={styles.quickActionText}>{action.title}</Text>
                <Ionicons name="chevron-forward" size={scale(16)} color={palette.lightText} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, { backgroundColor: palette.success }]} />
              <Text style={styles.statusText}>Database Connected</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, { backgroundColor: palette.success }]} />
              <Text style={styles.statusText}>Authentication Service</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, { backgroundColor: palette.success }]} />
              <Text style={styles.statusText}>Push Notifications</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewText}>
              • {stats.recentDonors} total donations recorded
            </Text>
            <Text style={styles.overviewText}>
              • {stats.pendingApprovals} donations awaiting approval
            </Text>
            <Text style={styles.overviewText}>
              • {stats.totalEvents} events scheduled
            </Text>
            <Text style={styles.overviewText}>
              • {stats.totalUsers} registered users
            </Text>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  safeArea: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  welcomeText: {
    fontSize: scale(14),
    color: palette.lightText,
  },
  adminName: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: palette.text,
  },
  logoutButton: {
    padding: scale(8),
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: palette.white,
    padding: scale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: scale(24),
    fontWeight: 'bold',
    color: palette.text,
    marginTop: scale(8),
  },
  statLabel: {
    fontSize: scale(12),
    color: palette.lightText,
    marginTop: scale(4),
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: scale(16),
  },
  quickActionsGrid: {
    gap: scale(12),
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    padding: scale(16),
    borderRadius: scale(12),
    borderLeftWidth: scale(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    flex: 1,
    fontSize: scale(16),
    color: palette.text,
    marginLeft: scale(12),
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: palette.white,
    padding: scale(16),
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  statusIndicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(12),
  },
  statusText: {
    fontSize: scale(14),
    color: palette.text,
  },
  overviewCard: {
    backgroundColor: palette.white,
    padding: scale(16),
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: scale(20),
  },
  overviewText: {
    fontSize: scale(14),
    color: palette.text,
    marginBottom: scale(8),
    lineHeight: scale(20),
  },
});