import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Search, Droplet, Activity, Heart, Calendar, ArrowLeft, Clock, MapPin, User as UserIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc,
  orderBy, 
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';

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
  green: '#28a745',
};

interface Donation {
  id: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  bloodType: string;
  department?: string;
  unitsdonated?: number;
  age?: number;
  weight?: number;
  eventName?: string;
  donationDate: string;
  location?: string;
  notes?: string;
  createdAt: any;
}

const AdminDonations: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        setUser(user);
        checkAdminStatus(user);
      } else {
        router.replace('/login');
      }
    });
    return unsubscribe;
  }, []);

  const checkAdminStatus = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data()?.role === 'admin') {
        setIsAdmin(true);
        fetchDonations();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      setLoading(true);
      // Fetch all donations since status field doesn't exist in database
      const donationsQuery = query(collection(db, 'donations'));
      const donationsSnapshot = await getDocs(donationsQuery);
      
      const donationsData: Donation[] = [];
      donationsSnapshot.forEach((doc) => {
        const data = doc.data();
        donationsData.push({
          id: doc.id,
          donorName: data.donorName || data.name || 'Anonymous',
          donorEmail: data.donorEmail || data.email || '',
          donorPhone: data.donorPhone || data.phone || data.phoneNumber || '',
          bloodType: data.bloodType || data.bloodGroup || data.blood_type || 'Unknown',
          department: data.department || data.dept || '',
          unitsdonated: data.unitsdonated || data.units_donated || data.unitsdonated || data.units || 0,
          age: data.age,
          weight: data.weight,
          eventName: data.eventName || data.event || '',
          donationDate: data.donationDate || data.date || '',
          location: data.location || '',
          notes: data.notes || '',
          createdAt: data.createdAt,
        });
      });

      // Sort donations by createdAt in descending order (client-side sorting)
      const sortedDonations = donationsData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });

      setDonations(sortedDonations);
      setFilteredDonations(sortedDonations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDonations();
    setRefreshing(false);
  };

  const filterDonations = () => {
    let filtered = donations;

    if (searchQuery) {
      filtered = filtered.filter(donation =>
        donation.donorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donation.donorEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donation.bloodType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (donation.eventName && donation.eventName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredDonations(filtered);
  };

  useEffect(() => {
    filterDonations();
  }, [searchQuery, donations]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      // Handle Firebase Timestamp
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Handle Firebase Timestamp with toDate method
      if (timestamp && timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Handle regular Date or timestamp string/number
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  const getBloodTypeColor = (bloodType: string) => {
    const colors: { [key: string]: string } = {
      'A+': '#FF6B6B', 'A-': '#FF8787',
      'B+': '#4ECDC4', 'B-': '#45B7AA',
      'AB+': '#45B7D1', 'AB-': '#6C7CE0',
      'O+': '#FFA726', 'O-': '#FF7043'
    };
    return colors[bloodType] || '#8E8E93';
  };

  const renderDonationCard = ({ item }: { item: Donation }) => (
    <View style={styles.donationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.donorInfo}>
          <Text style={styles.donorName}>{item.donorName}</Text>
          {item.department && <Text style={styles.donorDepartment}>Department: {item.department}</Text>}
          <Text style={styles.donorContact}>{item.donorEmail}</Text>
          {item.donorPhone && <Text style={styles.donorContact}>{item.donorPhone}</Text>}
        </View>
        <View style={[styles.bloodTypeBadge, { backgroundColor: getBloodTypeColor(item.bloodType) + '20' }]}>
          <Droplet size={scale(14)} color={getBloodTypeColor(item.bloodType)} />
          <Text style={[styles.bloodTypeText, { color: getBloodTypeColor(item.bloodType) }]}>
            {item.bloodType}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        {item.age && (
          <View style={styles.infoRow}>
            <UserIcon size={scale(16)} color={palette.lightText} />
            <Text style={styles.infoText}>Age: {item.age}</Text>
          </View>
        )}
        
        {item.weight && (
          <View style={styles.infoRow}>
            <Activity size={scale(16)} color={palette.lightText} />
            <Text style={styles.infoText}>Weight: {item.weight} kg</Text>
          </View>
        )}

        {item.unitsdonated && item.unitsdonated > 0 && (
          <View style={styles.infoRow}>
            <Heart size={scale(16)} color={palette.lightText} />
            <Text style={styles.infoText}>Units Donated: {item.unitsdonated}</Text>
          </View>
        )}

        {item.eventName && (
          <View style={styles.infoRow}>
            <Calendar size={scale(16)} color={palette.lightText} />
            <Text style={styles.infoText}>Event: {item.eventName}</Text>
          </View>
        )}

        {item.location && (
          <View style={styles.infoRow}>
            <MapPin size={scale(16)} color={palette.lightText} />
            <Text style={styles.infoText}>Location: {item.location}</Text>
          </View>
        )}

        {item.donationDate && (
          <View style={styles.infoRow}>
            <Clock size={scale(16)} color={palette.lightText} />
            <Text style={styles.infoText}>Donation Date: {formatDate(item.donationDate)}</Text>
          </View>
        )}

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>Submitted: {formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading approved donations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/admin-dashboard')}
        >
          <ArrowLeft size={22} color={palette.primaryRed} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approved Donations</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search donations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Showing {filteredDonations.length} approved donations
        </Text>
      </View>

      {/* Donations List */}
      <FlatList
        data={filteredDonations}
        renderItem={renderDonationCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Heart size={scale(50)} color={palette.lightText} />
            <Text style={styles.emptyText}>No approved donations found</Text>
            <Text style={styles.emptySubText}>
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'No donations have been approved yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.pageBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(15),
    paddingVertical: scale(12),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: palette.darkText,
  },
  headerSpacer: {
    width: scale(34),
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: scale(15),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(10),
    fontSize: scale(14),
  },
  statsContainer: {
    paddingHorizontal: scale(15),
    paddingVertical: scale(8),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  statsText: {
    fontSize: scale(12),
    color: palette.lightText,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(15),
  },
  donationCard: {
    backgroundColor: palette.white,
    borderRadius: scale(15),
    padding: scale(20),
    marginBottom: scale(15),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(15),
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: palette.darkText,
  },
  donorContact: {
    fontSize: scale(14),
    color: palette.lightText,
    marginTop: scale(2),
  },
  donorDepartment: {
    fontSize: scale(13),
    color: palette.lightText,
    marginTop: scale(1),
    fontWeight: '500',
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(15),
    marginLeft: scale(10),
  },
  bloodTypeText: {
    fontSize: scale(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  cardContent: {
    marginBottom: scale(15),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  infoText: {
    fontSize: scale(14),
    color: palette.darkText,
    marginLeft: scale(8),
  },
  notesContainer: {
    marginTop: scale(10),
    padding: scale(12),
    backgroundColor: palette.pageBg,
    borderRadius: scale(8),
  },
  notesLabel: {
    fontSize: scale(12),
    fontWeight: '600',
    color: palette.lightText,
    marginBottom: scale(4),
  },
  notesText: {
    fontSize: scale(14),
    color: palette.darkText,
    lineHeight: scale(18),
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
    paddingTop: scale(12),
  },
  dateText: {
    fontSize: scale(12),
    color: palette.lightText,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(50),
  },
  emptyText: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: palette.lightText,
    marginTop: scale(20),
    marginBottom: scale(8),
  },
  emptySubText: {
    fontSize: scale(14),
    color: palette.lightText,
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
});

export default AdminDonations;