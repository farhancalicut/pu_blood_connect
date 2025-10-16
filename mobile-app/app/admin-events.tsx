import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  Image,
  Share,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
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
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // Keep for form input
  eventDate?: Date | { toDate: () => Date }; // Add for Firebase storage
  time: string;
  location: string;
  organizer: string;
  contactNumber: string;
  maxParticipants: number;
  currentParticipants: number;
  posterImageUrl?: string; // Add poster image URL
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: any;
  createdBy: string;
}

const AdminEvents: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    organizer: '',
    contactNumber: '',
    maxParticipants: '50',
  });

  // Date and Time Picker States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Image Picker States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // QR Code States
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState<Event | null>(null);
  const [attendanceData, setAttendanceData] = useState<{
    joinedStudents: any[];
    attendedStudents: any[];
  }>({ joinedStudents: [], attendedStudents: [] });
  const qrRef = useRef<ViewShot>(null);

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
        Alert.alert('Access Denied', 'You do not have admin privileges.');
        router.replace('/dashboard');
        return;
      }
      
      setIsAdmin(true);
      fetchEvents();
    } catch (error) {
      console.error('Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify admin status.');
    }
  };

  const fetchEvents = async () => {
    try {
      const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];

      setEvents(eventsData);
      setFilteredEvents(eventsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to fetch events.');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const filterEvents = () => {
    let filtered = events;

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    setFilteredEvents(filtered);
  };

  useEffect(() => {
    filterEvents();
  }, [searchQuery, statusFilter, events]);

  const resetEventForm = () => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    const formattedTime = today.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });

    setEventForm({
      title: '',
      description: '',
      date: formattedDate, // Set today's date as default
      time: formattedTime, // Set current time as default
      location: '',
      organizer: '',
      contactNumber: '',
      maxParticipants: '50',
    });
    setEditingEvent(null);
    setSelectedDate(today);
    setSelectedTime(today);
    setSelectedImage(null);
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
      setEventForm({...eventForm, date: formattedDate});
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      const formattedTime = time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      setEventForm({...eventForm, time: formattedTime});
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to select a poster image.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9], // Poster aspect ratio
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      setSelectedImage(pickerResult.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.location) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      // Convert date string to proper Date object for consistency with dashboard
      let eventDate;
      
      if (eventForm.date && eventForm.date.includes('/')) {
        // Handle DD/MM/YYYY format
        const [day, month, year] = eventForm.date.split('/');
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        
        console.log('Date components:', { day: dayNum, month: monthNum, year: yearNum });
        
        // Validate date components
        if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) || 
            dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 2024) {
          Alert.alert('Error', 'Invalid date format. Please select a valid date.');
          return;
        }
        
        eventDate = new Date(yearNum, monthNum - 1, dayNum);
        console.log('Created eventDate:', eventDate);
        
        // Check if the created date is valid
        if (isNaN(eventDate.getTime())) {
          Alert.alert('Error', 'Invalid date. Please select a valid date.');
          return;
        }
      } else {
        // Use selectedDate if no formatted date string
        eventDate = selectedDate;
        console.log('Using selectedDate:', eventDate);
      }
      
      const eventData = {
        ...eventForm,
        eventDate: eventDate, // Add eventDate field for dashboard compatibility
        posterImageUrl: selectedImage, // Add poster image URL
        maxParticipants: parseInt(eventForm.maxParticipants) || 50,
        currentParticipants: editingEvent?.currentParticipants || 0,
        status: editingEvent?.status || 'upcoming',
        createdBy: user?.email,
        ...(editingEvent ? {} : { createdAt: serverTimestamp() })
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        Alert.alert('Success', 'Event updated successfully!');
      } else {
        await addDoc(collection(db, 'events'), eventData);
        Alert.alert('Success', 'Event created successfully!');
      }

      setShowEventModal(false);
      resetEventForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event.');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      organizer: event.organizer || '',
      contactNumber: event.contactNumber || '',
      maxParticipants: (event.maxParticipants || 50).toString(),
    });

    // Set date and time pickers if editing
    if (event.date) {
      const [day, month, year] = event.date.split('/');
      setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
    }
    if (event.time) {
      const timeDate = new Date();
      const [time, period] = event.time.split(' ');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;
      timeDate.setHours(hour24, parseInt(minutes));
      setSelectedTime(timeDate);
    }

    setEditingEvent(event);
    setSelectedImage(event.posterImageUrl || null);
    setShowEventModal(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'events', eventId));
              Alert.alert('Success', 'Event deleted successfully!');
              fetchEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event.');
            }
          }
        }
      ]
    );
  };

  const updateEventStatus = async (eventId: string, newStatus: Event['status']) => {
    try {
      await updateDoc(doc(db, 'events', eventId), { status: newStatus });
      Alert.alert('Success', 'Event status updated successfully!');
      fetchEvents();
    } catch (error) {
      console.error('Error updating event status:', error);
      Alert.alert('Error', 'Failed to update event status.');
    }
  };

  // QR Code and Attendance Functions
  const handleShowQRCode = async (event: Event) => {
    try {
      // Fetch joined and attended students data
      const eventRef = doc(db, 'events', event.id);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        
        // Fetch joined students details
        const joinedStudentIds = eventData.joinedStudents || [];
        const attendedStudentIds = eventData.attendedStudents || [];
        
        // Fetch user details for joined students
        const joinedStudentsDetails = [];
        const attendedStudentsDetails = [];
        
        for (const studentId of joinedStudentIds) {
          try {
            const userDoc = await getDoc(doc(db, 'users', studentId));
            if (userDoc.exists()) {
              joinedStudentsDetails.push({ id: studentId, ...userDoc.data() });
            }
          } catch (error) {
            console.error('Error fetching student details:', error);
          }
        }
        
        for (const studentId of attendedStudentIds) {
          try {
            const userDoc = await getDoc(doc(db, 'users', studentId));
            if (userDoc.exists()) {
              attendedStudentsDetails.push({ id: studentId, ...userDoc.data() });
            }
          } catch (error) {
            console.error('Error fetching attended student details:', error);
          }
        }
        
        setAttendanceData({
          joinedStudents: joinedStudentsDetails,
          attendedStudents: attendedStudentsDetails,
        });
      }
      
      setSelectedEventForQR(event);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      Alert.alert('Error', 'Failed to load attendance data.');
    }
  };

  const generateQRData = (event: Event) => {
    // Generate QR code data with event info and timestamp
    const qrData = {
      eventId: event.id,
      eventTitle: event.title,
      timestamp: new Date().toISOString(),
      adminId: user?.uid,
    };
    return JSON.stringify(qrData);
  };

  const shareQRCode = async () => {
    try {
      if (selectedEventForQR && qrRef.current && qrRef.current.capture) {
        // Capture the QR code as an image
        const uri = await qrRef.current.capture();
        
        if (Platform.OS === 'ios') {
          await Share.share({
            url: uri,
            message: `Attendance QR Code for Event: ${selectedEventForQR.title}\n\nScan this QR code to mark your attendance.`,
          });
        } else {
          await Share.share({
            title: 'Event Attendance QR Code',
            message: `Attendance QR Code for Event: ${selectedEventForQR.title}\n\nScan this QR code to mark your attendance.`,
            url: `file://${uri}`,
          });
        }
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code.');
    }
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return '#007AFF';
      case 'ongoing': return '#34C759';
      case 'completed': return '#8E8E93';
      case 'cancelled': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return 'time-outline';
      case 'ongoing': return 'play-circle-outline';
      case 'completed': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading events...</Text>
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
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Events</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetEventForm();
            setShowEventModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'ongoing', label: 'Ongoing' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                statusFilter === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === filter.key && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      <ScrollView 
        style={styles.eventsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No events found</Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View style={styles.eventTitleContainer}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                    <Ionicons 
                      name={getStatusIcon(event.status) as any} 
                      size={12} 
                      color="white" 
                      style={styles.statusIcon} 
                    />
                    <Text style={styles.statusText}>{event.status?.toUpperCase() || 'UNKNOWN'}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.eventDescription}>{event.description}</Text>
              
              <View style={styles.eventDetails}>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
                  <Text style={styles.eventDetailText}>{event.date} at {event.time}</Text>
                </View>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="location-outline" size={16} color="#8E8E93" />
                  <Text style={styles.eventDetailText}>{event.location}</Text>
                </View>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="person-outline" size={16} color="#8E8E93" />
                  <Text style={styles.eventDetailText}>{event.organizer}</Text>
                </View>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="people-outline" size={16} color="#8E8E93" />
                  <Text style={styles.eventDetailText}>
                    {event.currentParticipants || 0}/{event.maxParticipants || 50} participants
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditEvent(event)}
                >
                  <Ionicons name="create-outline" size={16} color="#007AFF" />
                  <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteEvent(event.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
                </TouchableOpacity>

                {(event.status === 'upcoming' || event.status === 'ongoing') && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.qrButton]}
                    onPress={() => handleShowQRCode(event)}
                  >
                    <Ionicons name="qr-code-outline" size={16} color="#FF9500" />
                    <Text style={[styles.actionButtonText, { color: '#FF9500' }]}>QR Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Event Form Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEventModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </Text>
            <TouchableOpacity onPress={handleSaveEvent}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter event title"
                value={eventForm.title}
                onChangeText={(text) => setEventForm({...eventForm, title: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Enter event description"
                value={eventForm.description}
                onChangeText={(text) => setEventForm({...eventForm, description: text})}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Image Picker Section */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Event Poster</Text>
              {selectedImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.imagePickerButton}
                  onPress={handleImagePicker}
                >
                  <Ionicons name="image-outline" size={32} color="#666" />
                  <Text style={styles.imagePickerText}>Select Poster Image</Text>
                  <Text style={styles.imagePickerSubtext}>Recommended: 16:9 aspect ratio</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Date *</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {eventForm.date || 'Select Date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.formLabel}>Time</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {eventForm.time || 'Select Time'}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter event location"
                value={eventForm.location}
                onChangeText={(text) => setEventForm({...eventForm, location: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Organizer</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter organizer name"
                value={eventForm.organizer}
                onChangeText={(text) => setEventForm({...eventForm, organizer: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contact Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter contact number"
                value={eventForm.contactNumber}
                onChangeText={(text) => setEventForm({...eventForm, contactNumber: text})}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Max Participants</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter maximum participants"
                value={eventForm.maxParticipants}
                onChangeText={(text) => setEventForm({...eventForm, maxParticipants: text})}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <Text style={styles.modalCancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Event Attendance</Text>
            <TouchableOpacity onPress={shareQRCode}>
              <Text style={styles.modalSaveButton}>Share QR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedEventForQR && (
              <>
                <View style={styles.qrSection}>
                  <Text style={styles.qrTitle}>{selectedEventForQR.title}</Text>
                  <Text style={styles.qrSubtitle}>Scan this QR code to mark attendance</Text>
                  
                  {/* QR Code Display */}
                  <ViewShot 
                    ref={qrRef} 
                    options={{ fileName: `event-qr-${selectedEventForQR.id}`, format: "png", quality: 0.9 }}
                    style={styles.qrCodeContainer}
                  >
                    <View style={styles.qrCodeWrapper}>
                      <QRCode
                        value={generateQRData(selectedEventForQR)}
                        size={200}
                        color="black"
                        backgroundColor="white"
                        logo={require('../assets/images/logo.png')}
                        logoSize={30}
                        logoBackgroundColor="white"
                        logoMargin={2}
                      />
                      <Text style={styles.qrDataText}>
                        Event: {selectedEventForQR.title}
                      </Text>
                    </View>
                  </ViewShot>
                </View>

                <View style={styles.attendanceSection}>
                  <View style={styles.attendanceStats}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>
                        {attendanceData.joinedStudents.length}
                      </Text>
                      <Text style={styles.statLabel}>Joined</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>
                        {attendanceData.attendedStudents.length}
                      </Text>
                      <Text style={styles.statLabel}>Attended</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>
                        {attendanceData.joinedStudents.length > 0 
                          ? Math.round((attendanceData.attendedStudents.length / attendanceData.joinedStudents.length) * 100)
                          : 0
                        }%
                      </Text>
                      <Text style={styles.statLabel}>Attendance Rate</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Joined Students ({attendanceData.joinedStudents.length})</Text>
                  {attendanceData.joinedStudents.map((student: any) => (
                    <View key={student.id} style={styles.studentCard}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>
                          {student.firstName} {student.lastName}
                        </Text>
                        <Text style={styles.studentDetails}>
                          {student.department} • {student.bloodGroup}
                        </Text>
                      </View>
                      <View style={[
                        styles.attendanceStatus,
                        attendanceData.attendedStudents.some((a: any) => a.id === student.id)
                          ? styles.attendedStatus
                          : styles.notAttendedStatus
                      ]}>
                        <Ionicons 
                          name={attendanceData.attendedStudents.some((a: any) => a.id === student.id)
                            ? "checkmark-circle" : "time-outline"
                          } 
                          size={16} 
                          color={attendanceData.attendedStudents.some((a: any) => a.id === student.id)
                            ? "#34C759" : "#FF9500"
                          } 
                        />
                        <Text style={[
                          styles.attendanceStatusText,
                          attendanceData.attendedStudents.some((a: any) => a.id === student.id)
                            ? { color: "#34C759" }
                            : { color: "#FF9500" }
                        ]}>
                          {attendanceData.attendedStudents.some((a: any) => a.id === student.id)
                            ? "Attended" : "Not Attended"
                          }
                        </Text>
                      </View>
                    </View>
                  ))}

                  {attendanceData.joinedStudents.length === 0 && (
                    <Text style={styles.emptyText}>No students have joined this event yet.</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 5,
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  eventsList: {
    flex: 1,
    paddingHorizontal: 20,
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
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  eventHeader: {
    marginBottom: 12,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  eventDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  statusButton: {
    backgroundColor: '#E8F5E8',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
    color: '#007AFF',
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
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#000',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
  },
  imagePickerText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  imagePickerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  // QR Code Button Style
  qrButton: {
    backgroundColor: '#FFF8E7',
    borderColor: '#FF9500',
  },

  // QR Code Modal Styles
  qrSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 20,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 5,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  qrCodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  qrCodePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 10,
  },
  qrDataText: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  // Attendance Section Styles
  attendanceSection: {
    flex: 1,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 5,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 15,
  },

  // Student Card Styles
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  studentDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  attendedStatus: {
    backgroundColor: '#E8F5E8',
  },
  notAttendedStatus: {
    backgroundColor: '#FFF3E0',
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
});

export default AdminEvents;