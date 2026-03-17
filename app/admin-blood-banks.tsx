import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
  Linking,
} from 'react-native';
import { ArrowLeft, Plus, Search, Building2, MapPin, Phone, Mail, Globe, Clock, User as UserIcon, Edit2, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  orderBy, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';

interface BloodBank {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phoneNumber: string;
  email?: string;
  website?: string;
  operatingHours: string;
  bloodTypes: string[];
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt: any;
  updatedAt?: any;
  createdBy: string;
}

const AdminBloodBanks: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [filteredBloodBanks, setFilteredBloodBanks] = useState<BloodBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [showBloodBankModal, setShowBloodBankModal] = useState(false);
  const [editingBloodBank, setEditingBloodBank] = useState<BloodBank | null>(null);
  
  const [bloodBankForm, setBloodBankForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phoneNumber: '',
    email: '',
    website: '',
    operatingHours: '',
    latitude: '',
    longitude: '',
    contactPerson: '',
    emergencyContact: '',
    notes: '',
  });

  const [selectedBloodTypes, setSelectedBloodTypes] = useState<string[]>([]);
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        setUser(user);
        checkAdminStatus(user);
      } else {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAdminStatus = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists() || userDoc.data()?.role !== 'admin') {
        showAlert('Access Denied', 'You do not have admin privileges.');
        router.replace('/dashboard');
        return;
      }
      
      setIsAdmin(true);
      fetchBloodBanks();
    } catch (error) {
      console.error('Error checking admin status:', error);
      showAlert('Error', 'Failed to verify admin status.');
    }
  };

  const fetchBloodBanks = async () => {
    try {
      const bloodBanksQuery = query(collection(db, 'bloodBanks'), orderBy('name', 'asc'));
      const bloodBanksSnapshot = await getDocs(bloodBanksQuery);
      
      const bloodBanksData = bloodBanksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BloodBank[];

      setBloodBanks(bloodBanksData);
      setFilteredBloodBanks(bloodBanksData);
      
      // Extract unique cities for filter
      const uniqueCities = [...new Set(bloodBanksData.map(bb => bb.city))].filter(Boolean);
      setCities(uniqueCities);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching blood banks:', error);
      showAlert('Error', 'Failed to fetch blood banks.');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBloodBanks();
    setRefreshing(false);
  };

  const filterBloodBanks = () => {
    let filtered = bloodBanks;

    if (searchQuery) {
      filtered = filtered.filter(bloodBank =>
        bloodBank.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bloodBank.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bloodBank.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bloodBank.phoneNumber?.includes(searchQuery)
      );
    }



    if (cityFilter !== 'all') {
      filtered = filtered.filter(bb => bb.city === cityFilter);
    }

    setFilteredBloodBanks(filtered);
  };

  useEffect(() => {
    filterBloodBanks();
  }, [searchQuery, cityFilter, bloodBanks]);

  const resetBloodBankForm = () => {
    setBloodBankForm({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phoneNumber: '',
      email: '',
      website: '',
      operatingHours: '',
      latitude: '',
      longitude: '',
      contactPerson: '',
      emergencyContact: '',
      notes: '',
    });
    setSelectedBloodTypes([]);
    setEditingBloodBank(null);
  };

  const handleSaveBloodBank = async () => {
    if (!bloodBankForm.name || !bloodBankForm.address || !bloodBankForm.phoneNumber) {
      showAlert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const bloodBankData = {
        ...bloodBankForm,
        latitude: bloodBankForm.latitude ? parseFloat(bloodBankForm.latitude) : undefined,
        longitude: bloodBankForm.longitude ? parseFloat(bloodBankForm.longitude) : undefined,
        bloodTypes: selectedBloodTypes,
        createdBy: user?.email,
        ...(editingBloodBank ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() })
      };

      if (editingBloodBank) {
        await updateDoc(doc(db, 'bloodBanks', editingBloodBank.id), bloodBankData);
        showAlert('Success', 'Blood bank updated successfully!');
      } else {
        await addDoc(collection(db, 'bloodBanks'), bloodBankData);
        showAlert('Success', 'Blood bank added successfully!');
      }

      setShowBloodBankModal(false);
      resetBloodBankForm();
      fetchBloodBanks();
    } catch (error) {
      console.error('Error saving blood bank:', error);
      showAlert('Error', 'Failed to save blood bank.');
    }
  };

  const handleEditBloodBank = (bloodBank: BloodBank) => {
    setBloodBankForm({
      name: bloodBank.name,
      address: bloodBank.address,
      city: bloodBank.city,
      state: bloodBank.state,
      pincode: bloodBank.pincode,
      phoneNumber: bloodBank.phoneNumber,
      email: bloodBank.email || '',
      website: bloodBank.website || '',
      operatingHours: bloodBank.operatingHours,
      latitude: bloodBank.latitude?.toString() || '',
      longitude: bloodBank.longitude?.toString() || '',
      contactPerson: bloodBank.contactPerson || '',
      emergencyContact: bloodBank.emergencyContact || '',
      notes: bloodBank.notes || '',
    });
    setSelectedBloodTypes(bloodBank.bloodTypes || []);
    setEditingBloodBank(bloodBank);
    setShowBloodBankModal(true);
  };

  const handleDeleteBloodBank = (bloodBankId: string) => {
    showAlert(
      'Delete Blood Bank',
      'Are you sure you want to delete this blood bank? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'bloodBanks', bloodBankId));
              showAlert('Success', 'Blood bank deleted successfully!');
              fetchBloodBanks();
            } catch (error) {
              console.error('Error deleting blood bank:', error);
              showAlert('Error', 'Failed to delete blood bank.');
            }
          }
        }
      ]
    );
  };



  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleWebsite = (website: string) => {
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    Linking.openURL(url);
  };

  const toggleBloodType = (bloodType: string) => {
    if (selectedBloodTypes.includes(bloodType)) {
      setSelectedBloodTypes(selectedBloodTypes.filter(bt => bt !== bloodType));
    } else {
      setSelectedBloodTypes([...selectedBloodTypes, bloodType]);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading blood banks...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/admin-dashboard')}
        >
          <ArrowLeft size={22} color="#9B0000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blood Banks</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetBloodBankForm();
            setShowBloodBankModal(true);
          }}
        >
          <Plus size={22} color="#9B0000" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search blood banks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              cityFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setCityFilter('all')}
          >
            <Text style={[
              styles.filterButtonText,
              cityFilter === 'all' && styles.filterButtonTextActive
            ]}>
              All Cities
            </Text>
          </TouchableOpacity>
          
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.filterButton,
                cityFilter === city && styles.filterButtonActive
              ]}
              onPress={() => setCityFilter(city)}
            >
              <Text style={[
                styles.filterButtonText,
                cityFilter === city && styles.filterButtonTextActive
              ]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Blood Banks List */}
      <ScrollView 
        style={styles.bloodBanksList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBloodBanks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building2 size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No blood banks found</Text>
          </View>
        ) : (
          filteredBloodBanks.map((bloodBank) => (
            <View key={bloodBank.id} style={styles.bloodBankCard}>
              <View style={styles.bloodBankHeader}>
                <Text style={styles.bloodBankName}>{bloodBank.name}</Text>
              </View>
              
              <View style={styles.bloodBankDetails}>
                <View style={styles.detailRow}>
                  <MapPin size={16} color="#8E8E93" />
                  <Text style={styles.detailText}>{bloodBank.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Building2 size={16} color="#8E8E93" />
                  <Text style={styles.detailText}>{bloodBank.city}, {bloodBank.state} - {bloodBank.pincode}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Phone size={16} color="#8E8E93" />
                  <TouchableOpacity onPress={() => handleCall(bloodBank.phoneNumber)}>
                    <Text style={[styles.detailText, { color: '#9B0000' }]}>{bloodBank.phoneNumber}</Text>
                  </TouchableOpacity>
                </View>
                {bloodBank.email && (
                  <View style={styles.detailRow}>
                    <Mail size={16} color="#8E8E93" />
                    <TouchableOpacity onPress={() => handleEmail(bloodBank.email!)}>
                      <Text style={[styles.detailText, { color: '#9B0000' }]}>{bloodBank.email}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {bloodBank.website && (
                  <View style={styles.detailRow}>
                    <Globe size={16} color="#8E8E93" />
                    <TouchableOpacity onPress={() => handleWebsite(bloodBank.website!)}>
                      <Text style={[styles.detailText, { color: '#9B0000' }]}>{bloodBank.website}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Clock size={16} color="#8E8E93" />
                  <Text style={styles.detailText}>{bloodBank.operatingHours}</Text>
                </View>
                {bloodBank.contactPerson && (
                  <View style={styles.detailRow}>
                    <UserIcon size={16} color="#8E8E93" />
                    <Text style={styles.detailText}>Contact: {bloodBank.contactPerson}</Text>
                  </View>
                )}
              </View>

              {/* Blood Types */}
              {bloodBank.bloodTypes && bloodBank.bloodTypes.length > 0 && (
                <View style={styles.bloodTypesContainer}>
                  <Text style={styles.bloodTypesLabel}>Available Blood Types:</Text>
                  <View style={styles.bloodTypesGrid}>
                    {bloodBank.bloodTypes.map((type) => (
                      <View 
                        key={type}
                        style={[
                          styles.bloodTypeChip,
                          { backgroundColor: getBloodTypeColor(type) }
                        ]}
                      >
                        <Text style={styles.bloodTypeText}>{type}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditBloodBank(bloodBank)}
                >
                  <Edit2 size={16} color="#9B0000" />
                  <Text style={[styles.actionButtonText, { color: '#9B0000' }]}>Edit</Text>
                </TouchableOpacity>
                

                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteBloodBank(bloodBank.id)}
                >
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Blood Bank Form Modal */}
      <Modal
        visible={showBloodBankModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBloodBankModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingBloodBank ? 'Edit Blood Bank' : 'Add Blood Bank'}
            </Text>
            <TouchableOpacity onPress={handleSaveBloodBank}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter blood bank name"
                value={bloodBankForm.name}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, name: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Address *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Enter complete address"
                value={bloodBankForm.address}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, address: text})}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>City</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="City"
                  value={bloodBankForm.city}
                  onChangeText={(text) => setBloodBankForm({...bloodBankForm, city: text})}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.formLabel}>State</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="State"
                  value={bloodBankForm.state}
                  onChangeText={(text) => setBloodBankForm({...bloodBankForm, state: text})}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Pincode</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Pincode"
                  value={bloodBankForm.pincode}
                  onChangeText={(text) => setBloodBankForm({...bloodBankForm, pincode: text})}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.formLabel}>Phone *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Phone number"
                  value={bloodBankForm.phoneNumber}
                  onChangeText={(text) => setBloodBankForm({...bloodBankForm, phoneNumber: text})}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Email address"
                value={bloodBankForm.email}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, email: text})}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Website</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Website URL"
                value={bloodBankForm.website}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, website: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Operating Hours</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Mon-Fri 9AM-5PM"
                value={bloodBankForm.operatingHours}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, operatingHours: text})}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Latitude</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 11.9562"
                  value={bloodBankForm.latitude}
                  onChangeText={(text) => setBloodBankForm({...bloodBankForm, latitude: text})}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.formLabel}>Longitude</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 79.7951"
                  value={bloodBankForm.longitude}
                  onChangeText={(text) => setBloodBankForm({...bloodBankForm, longitude: text})}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contact Person</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contact person name"
                value={bloodBankForm.contactPerson}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, contactPerson: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Emergency Contact</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Emergency contact number"
                value={bloodBankForm.emergencyContact}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, emergencyContact: text})}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Available Blood Types</Text>
              <View style={styles.bloodTypeSelectionGrid}>
                {bloodTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.bloodTypeSelection,
                      selectedBloodTypes.includes(type) && {
                        backgroundColor: getBloodTypeColor(type),
                        borderColor: getBloodTypeColor(type)
                      }
                    ]}
                    onPress={() => toggleBloodType(type)}
                  >
                    <Text style={[
                      styles.bloodTypeSelectionText,
                      selectedBloodTypes.includes(type) && { color: 'white' }
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Additional notes"
                value={bloodBankForm.notes}
                onChangeText={(text) => setBloodBankForm({...bloodBankForm, notes: text})}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingTop: Platform.OS === 'ios' ? 45 : 15,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#9B0000',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  bloodBanksList: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  bloodBankCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bloodBankHeader: {
    marginBottom: 12,
  },
  bloodBankTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bloodBankName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 10,
  },
  statusBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    marginLeft: 2,
  },
  bloodBankDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  bloodTypesContainer: {
    marginBottom: 16,
  },
  bloodTypesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  bloodTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bloodTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  bloodTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  statusToggleButton: {
    backgroundColor: '#FFF3E0',
  },
  verifyButton: {
    backgroundColor: '#E8F5E8',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#9B0000',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  bloodTypeSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  bloodTypeSelection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  bloodTypeSelectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
});

export default AdminBloodBanks;
