import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Search, Star, MessageCircle, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc,
  orderBy 
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
  yellow: '#ffc107',
};

interface Feedback {
  id: string;
  userName: string;
  department: string;
  comment: string;
  rating?: number;
  createdAt: any;
}

const AdminFeedback: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
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
        fetchFeedbacks();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(feedbackQuery);
      
      const feedbackList: Feedback[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedbackList.push({
          id: doc.id,
          userName: data.userName || 'Anonymous',
          department: data.department || 'Unknown Department',
          comment: data.comment || 'No comment provided',
          rating: data.rating,
          createdAt: data.createdAt,
        });
      });

      setFeedbacks(feedbackList);
      setFilteredFeedbacks(feedbackList);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeedbacks();
    setRefreshing(false);
  };

  const filterFeedbacks = () => {
    let filtered = feedbacks;

    if (searchQuery) {
      filtered = filtered.filter(feedback =>
        feedback.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.comment?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFeedbacks(filtered);
  };

  useEffect(() => {
    filterFeedbacks();
  }, [searchQuery, feedbacks]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const renderFeedbackCard = ({ item }: { item: Feedback }) => (
    <View style={styles.feedbackCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.userEmail}>{item.department}</Text>
        </View>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Star size={scale(16)} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}/5</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.message} numberOfLines={4}>{item.comment}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading feedbacks...</Text>
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
        <Text style={styles.headerTitle}>User Feedback</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search feedbacks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>



      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Showing {filteredFeedbacks.length} of {feedbacks.length} feedbacks
        </Text>
      </View>

      {/* Feedback List */}
      <FlatList
        data={filteredFeedbacks}
        renderItem={renderFeedbackCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageCircle size={scale(50)} color={palette.lightText} />
            <Text style={styles.emptyText}>No feedback found</Text>
            <Text style={styles.emptySubText}>
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Users haven\'t submitted any feedback yet'}
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
  feedbackCard: {
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
    marginBottom: scale(12),
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(16),
    fontWeight: 'bold',
    color: palette.darkText,
  },
  userEmail: {
    fontSize: scale(14),
    color: palette.lightText,
    marginTop: scale(2),
  },

  message: {
    fontSize: scale(14),
    color: palette.darkText,
    lineHeight: scale(20),
    marginBottom: scale(15),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: scale(12),
    color: palette.lightText,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: scale(12),
    color: palette.lightText,
    marginLeft: scale(4),
    fontWeight: '600',
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

export default AdminFeedback;