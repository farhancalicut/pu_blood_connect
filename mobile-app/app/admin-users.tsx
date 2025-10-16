import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc,
  where,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = {
  primary: '#9B0000',
  white: '#FFFFFF',
  text: '#333333',
  lightText: '#8A8A8A',
  border: '#EAEAEA',
  success: '#28a745',
  warning: '#ffc107',
  background: '#F7F7F7'
};

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  department?: string;
  bloodGroup?: string;
  role?: string;
  totalDonates?: number;
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: ''
  });

  const checkAdminAndFetchUsers = useCallback(async () => {
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

      // Fetch all users
      const usersQuery = query(collection(db, 'users'), orderBy('firstName', 'asc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      setUsers(usersList);
      setFilteredUsers(usersList);

    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      checkAdminAndFetchUsers();
    }, [checkAdminAndFetchUsers])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(text.toLowerCase()) ||
        user.email.toLowerCase().includes(text.toLowerCase()) ||
        user.department?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const resetAdminForm = () => {
    setAdminForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      department: ''
    });
  };

  const handleCreateAdmin = async () => {
    // Validation
    if (!adminForm.firstName.trim() || !adminForm.lastName.trim() || !adminForm.email.trim() || !adminForm.password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (adminForm.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    // Check if email already exists
    const existingUser = users.find(user => user.email === adminForm.email.trim());
    if (existingUser) {
      Alert.alert('Error', 'A user with this email already exists.');
      return;
    }

    setIsCreatingAdmin(true);

    try {
      // Create Firebase Auth user
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        adminForm.email.trim(), 
        adminForm.password
      );

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        firstName: adminForm.firstName.trim(),
        lastName: adminForm.lastName.trim(),
        email: adminForm.email.trim(),
        department: adminForm.department.trim() || 'Administration',
        role: 'admin',
        totalDonates: 0,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'system'
      });

      Alert.alert('Success', 'Admin account created successfully!');
      setShowAddAdminModal(false);
      resetAdminForm();
      
      // Refresh the users list
      checkAdminAndFetchUsers();

    } catch (error: any) {
      console.error('Error creating admin:', error);
      let errorMessage = 'Failed to create admin account.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const userName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'No Name';
    const isCurrentAdmin = item.role === 'admin';

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userDetails}>
            <Text style={styles.userDetail}>
              {item.department || 'No Department'} • {item.bloodGroup || 'Unknown Blood Group'}
            </Text>
            <Text style={styles.userDetail}>
              Donations: {item.totalDonates || 0}
            </Text>
          </View>
        </View>
        
        <View style={styles.userActions}>
          {isCurrentAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Loading Users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin-dashboard')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={scale(24)} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Users</Text>
        <TouchableOpacity 
          onPress={() => setShowAddAdminModal(true)} 
          style={styles.addButton}
        >
          <Ionicons name="person-add" size={scale(24)} color={palette.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name, email, or department..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>Total Users: {users.length}</Text>
        <Text style={styles.statsText}>Admins: {users.filter(u => u.role === 'admin').length}</Text>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No users found.</Text>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Admin Modal */}
      <Modal
        visible={showAddAdminModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddAdminModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddAdminModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Admin</Text>
            <TouchableOpacity onPress={handleCreateAdmin} disabled={isCreatingAdmin}>
              <Text style={[styles.modalSaveButton, isCreatingAdmin && styles.modalSaveButtonDisabled]}>
                {isCreatingAdmin ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>First Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter first name"
                value={adminForm.firstName}
                onChangeText={(text) => setAdminForm({...adminForm, firstName: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Last Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter last name"
                value={adminForm.lastName}
                onChangeText={(text) => setAdminForm({...adminForm, lastName: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email Address *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter email address"
                value={adminForm.email}
                onChangeText={(text) => setAdminForm({...adminForm, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Department</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter department (optional)"
                value={adminForm.department}
                onChangeText={(text) => setAdminForm({...adminForm, department: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Password *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter password (min 6 characters)"
                value={adminForm.password}
                onChangeText={(text) => setAdminForm({...adminForm, password: text})}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Confirm Password *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Confirm password"
                value={adminForm.confirmPassword}
                onChangeText={(text) => setAdminForm({...adminForm, confirmPassword: text})}
                secureTextEntry
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={palette.primary} />
              <Text style={styles.infoText}>
                This will create a new admin account that can access all admin features.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backButton: {
    padding: scale(4),
  },
  title: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: palette.text,
  },
  placeholder: {
    width: scale(32),
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: scale(20),
    paddingVertical: scale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(10),
    paddingHorizontal: scale(15),
  },
  searchIcon: {
    marginRight: scale(10),
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(12),
    fontSize: scale(16),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    marginBottom: scale(15),
    marginTop: scale(10),
  },
  statsText: {
    fontSize: scale(14),
    color: palette.lightText,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(20),
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    padding: scale(16),
    borderRadius: scale(12),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: palette.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: scale(4),
  },
  userEmail: {
    fontSize: scale(14),
    color: palette.lightText,
    marginBottom: scale(8),
  },
  userDetails: {
    gap: scale(4),
  },
  userDetail: {
    fontSize: scale(12),
    color: palette.lightText,
  },
  userActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  makeAdminButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(6),
  },
  makeAdminButtonText: {
    color: palette.white,
    fontSize: scale(12),
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: palette.success,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(4),
  },
  adminBadgeText: {
    color: palette.white,
    fontSize: scale(10),
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: scale(50),
    color: palette.lightText,
    fontSize: scale(16),
  },
  addButton: {
    padding: scale(8),
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: palette.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(15),
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  modalCancelButton: {
    fontSize: scale(16),
    color: palette.lightText,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: palette.text,
  },
  modalSaveButton: {
    fontSize: scale(16),
    color: palette.primary,
    fontWeight: '600',
  },
  modalSaveButtonDisabled: {
    color: palette.lightText,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
  },
  formGroup: {
    marginBottom: scale(20),
  },
  formLabel: {
    fontSize: scale(16),
    fontWeight: '500',
    color: palette.text,
    marginBottom: scale(8),
  },
  formInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: scale(8),
    paddingHorizontal: scale(15),
    paddingVertical: scale(12),
    fontSize: scale(16),
    backgroundColor: palette.white,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: scale(15),
    borderRadius: scale(8),
    marginTop: scale(10),
    borderWidth: 1,
    borderColor: '#E6F3FF',
  },
  infoText: {
    flex: 1,
    fontSize: scale(14),
    color: palette.text,
    marginLeft: scale(10),
    lineHeight: scale(20),
  },
});