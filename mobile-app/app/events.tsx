import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Modal, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db, /*storage*/ } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', blue: '#3478f6' };

type Event = { 
    id: string; 
    title: string; 
    location: string; 
    eventDate: { toDate: () => Date }; 
    posterImageUrl?: string;
    description?: string;
    organizer?: string;
    contactNumber?: string;
    time?: string;
    maxParticipants?: number;
    currentParticipants?: number;
    status?: string;
};

const EventCard = ({ item, isAdmin, onEdit, onDelete, onPress, onJoin, joinedEvents, joiningEvent }: { 
    item: Event, 
    isAdmin: boolean, 
    onEdit: () => void, 
    onDelete: () => void,
    onPress: () => void,
    onJoin: (eventId: string) => void,
    joinedEvents: Set<string>,
    joiningEvent: string | null
}) => {
    const eventDate = item.eventDate.toDate();
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    const isUpcoming = eventDate >= now;
    
    return (
        <TouchableOpacity style={styles.modernEventCard} onPress={onPress} activeOpacity={0.9}>
            {/* Hero Background */}
            <View style={styles.heroContainer}>
                {item.posterImageUrl ? (
                    <Image source={{ uri: item.posterImageUrl }} style={styles.heroImage} />
                ) : (
                    <View style={styles.heroPlaceholder}>
                        <Ionicons name="image-outline" size={scale(30)} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.noPosterText}>No poster to show</Text>
                    </View>
                )}
                
                {/* Gradient Overlay */}
                <View style={styles.heroOverlay} />
                
                {/* Status Badge */}
                <View style={[styles.modernStatusBadge, { backgroundColor: isUpcoming ? '#4CAF50' : '#757575' }]}>
                    <Text style={styles.modernStatusText}>
                        {isUpcoming ? 'UPCOMING' : 'PAST'}
                    </Text>
                </View>
                
                {/* Content Over Hero */}
                <View style={styles.heroContent}>
                    <Text style={styles.modernCardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.modernCardDate}>
                        {eventDate.toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </Text>
                </View>
            </View>
            
            {/* Bottom Content */}
            <View style={styles.modernCardBottom}>
                {/* Location */}
                <View style={styles.modernLocationRow}>
                    <Ionicons name="location-outline" size={scale(16)} color={palette.primaryRed} />
                    <Text style={styles.modernLocationText} numberOfLines={1}>{item.location}</Text>
                </View>
                
                {/* Action Buttons */}
                <View style={styles.modernActionButtons}>
                    <TouchableOpacity 
                        style={[styles.modernDetailsButton, !isUpcoming && styles.modernDetailsButtonFull]} 
                        onPress={onPress}
                    >
                        <Ionicons name="information-circle-outline" size={scale(14)} color="#6B7280" />
                        <Text style={styles.modernDetailsText}>Details</Text>
                    </TouchableOpacity>
                    
                    {isUpcoming && !isAdmin && (
                        <TouchableOpacity 
                            style={[
                                styles.modernJoinButton,
                                joinedEvents.has(item.id) && styles.modernLeaveButton
                            ]}
                            onPress={() => onJoin(item.id)}
                            disabled={joiningEvent === item.id}
                        >
                            {joiningEvent === item.id ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Ionicons 
                                        name={joinedEvents.has(item.id) ? "remove" : "add"} 
                                        size={scale(14)} 
                                        color="white" 
                                    />
                                    <Text style={styles.modernJoinText}>
                                        {joinedEvents.has(item.id) ? 'Leave' : 'Join'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                    
                    {isAdmin && (
                        <View style={styles.modernAdminButtons}>
                            <TouchableOpacity style={styles.modernEditButton} onPress={onEdit}>
                                <Ionicons name="pencil" size={scale(16)} color={palette.blue} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modernDeleteButton} onPress={onDelete}>
                                <Ionicons name="trash" size={scale(16)} color={palette.primaryRed} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

function HeaderAddButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/add-event')} style={{ marginRight: scale(15) }}>
      <Ionicons name="add-circle" size={scale(28)} color="#FE465E" />
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [joinedEvents, setJoinedEvents] = useState<Set<string>>(new Set());
    const [joiningEvent, setJoiningEvent] = useState<string | null>(null);
    const navigation = useNavigation();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const user = getAuth().currentUser;
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') setIsAdmin(true);
        }
        try {
            const q = query(collection(db, 'events'), orderBy('eventDate', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(data);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const checkUserJoinedEvents = useCallback(async () => {
        if (isAdmin) return;
        
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const joinedEventIds = new Set<string>();
            for (const event of events) {
                const eventRef = doc(db, 'events', event.id);
                const eventDoc = await getDoc(eventRef);
                if (eventDoc.exists()) {
                    const eventData = eventDoc.data();
                    const joinedStudents = eventData.joinedStudents || [];
                    if (joinedStudents.includes(user.uid)) {
                        joinedEventIds.add(event.id);
                    }
                }
            }
            setJoinedEvents(joinedEventIds);
        } catch (error) {
            console.error('Error checking joined events:', error);
        }
    }, [events, isAdmin]);

    const handleJoinEvent = async (eventId: string) => {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            Alert.alert('Error', 'Please log in to join events.');
            return;
        }

        setJoiningEvent(eventId);
        
        try {
            const eventRef = doc(db, 'events', eventId);
            const isJoined = joinedEvents.has(eventId);
            
            if (isJoined) {
                // Leave event
                await updateDoc(eventRef, {
                    joinedStudents: arrayRemove(user.uid)
                });
                
                const newJoinedEvents = new Set(joinedEvents);
                newJoinedEvents.delete(eventId);
                setJoinedEvents(newJoinedEvents);
                
                Alert.alert('Success', 'You have left the event.');
            } else {
                // Join event
                await updateDoc(eventRef, {
                    joinedStudents: arrayUnion(user.uid)
                });
                
                const newJoinedEvents = new Set(joinedEvents);
                newJoinedEvents.add(eventId);
                setJoinedEvents(newJoinedEvents);
                
                Alert.alert('Success', 'You have successfully joined the event!');
            }
        } catch (error) {
            console.error('Error joining/leaving event:', error);
            Alert.alert('Error', 'Failed to update event registration. Please try again.');
        } finally {
            setJoiningEvent(null);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    useEffect(() => {
        if (events.length > 0) {
            checkUserJoinedEvents();
        }
    }, [events, checkUserJoinedEvents]);

    useEffect(() => {
        if (isAdmin) {
            navigation.setOptions({
                headerRight: () => <HeaderAddButton />,
            });
        }
    }, [isAdmin, navigation]);

    const handleDelete = (event: Event) => {
        Alert.alert(
            "Delete Event",
            `Are you sure you want to delete the event "${event.title}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "events", event.id));
                            // const imageRef = ref(storage, event.posterImageUrl);
                            // await deleteObject(imageRef);
                            Alert.alert("Success", "The event has been deleted.");
                            fetchData();
                        } catch (error) {
                            console.error("Error deleting event:", error);
                            Alert.alert("Error", "Could not delete the event.");
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = (event: Event) => {
        router.push({ pathname: '/add-event', params: { eventId: event.id } });
    };

    const handleEventPress = (event: Event) => {
        setSelectedEvent(event);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedEvent(null);
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            {isLoading ? ( <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} /> ) : (
                <FlatList
                    data={events}
                    renderItem={({ item }) => (
                        <EventCard 
                            item={item} 
                            isAdmin={isAdmin} 
                            onEdit={() => handleEdit(item)} 
                            onDelete={() => handleDelete(item)} 
                            onPress={() => handleEventPress(item)}
                            onJoin={handleJoinEvent}
                            joinedEvents={joinedEvents}
                            joiningEvent={joiningEvent}
                        />
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>No events scheduled right now.</Text>}
                />
            )}
            
            {/* Event Detail Modal */}
            <Modal
                visible={showDetailModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeDetailModal}
            >
                {selectedEvent && (
                    <SafeAreaView style={styles.modalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeDetailModal} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color={palette.darkText} />
                            </TouchableOpacity>
                            <Text style={styles.modalHeaderTitle}>Event Details</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        {/* Modal Content */}
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Event Poster */}
                            {selectedEvent.posterImageUrl ? (
                                <Image source={{ uri: selectedEvent.posterImageUrl }} style={styles.modalPoster} />
                            ) : (
                                <View style={styles.modalPlaceholderPoster}>
                                    <Ionicons name="image-outline" size={60} color={palette.lightText} />
                                    <Text style={styles.placeholderText}>No poster available</Text>
                                </View>
                            )}

                            {/* Event Information */}
                            <View style={styles.eventInfoContainer}>
                                <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                                
                                <View style={styles.detailRow}>
                                    <View style={styles.detailIcon}>
                                        <Ionicons name="calendar" size={24} color={palette.primaryRed} />
                                    </View>
                                    <View style={styles.detailContent}>
                                        <Text style={styles.detailLabel}>Date & Time</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedEvent.eventDate.toDate().toLocaleDateString('en-GB', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </Text>
                                        {selectedEvent.time && (
                                            <Text style={styles.detailValue}>{selectedEvent.time}</Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <View style={styles.detailIcon}>
                                        <Ionicons name="location" size={24} color={palette.primaryRed} />
                                    </View>
                                    <View style={styles.detailContent}>
                                        <Text style={styles.detailLabel}>Location</Text>
                                        <Text style={styles.detailValue}>{selectedEvent.location}</Text>
                                    </View>
                                </View>

                                {selectedEvent.description && (
                                    <View style={styles.detailRow}>
                                        <View style={styles.detailIcon}>
                                            <Ionicons name="document-text" size={24} color={palette.primaryRed} />
                                        </View>
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>Description</Text>
                                            <Text style={styles.detailValue}>{selectedEvent.description}</Text>
                                        </View>
                                    </View>
                                )}

                                {selectedEvent.organizer && (
                                    <View style={styles.detailRow}>
                                        <View style={styles.detailIcon}>
                                            <Ionicons name="person" size={24} color={palette.primaryRed} />
                                        </View>
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>Organizer</Text>
                                            <Text style={styles.detailValue}>{selectedEvent.organizer}</Text>
                                        </View>
                                    </View>
                                )}

                                {selectedEvent.contactNumber && (
                                    <View style={styles.detailRow}>
                                        <View style={styles.detailIcon}>
                                            <Ionicons name="call" size={24} color={palette.primaryRed} />
                                        </View>
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>Contact</Text>
                                            <Text style={styles.detailValue}>{selectedEvent.contactNumber}</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Join/Leave Event Button - Only for non-admin users */}
                                {!isAdmin && (
                                    <View style={styles.joinButtonContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.joinButton,
                                                joinedEvents.has(selectedEvent.id) 
                                                    ? styles.leaveButton 
                                                    : styles.joinEventButton
                                            ]}
                                            onPress={() => handleJoinEvent(selectedEvent.id)}
                                            disabled={joiningEvent === selectedEvent.id}
                                        >
                                            {joiningEvent === selectedEvent.id ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <>
                                                    <Ionicons 
                                                        name={joinedEvents.has(selectedEvent.id) ? "remove-circle" : "add-circle"} 
                                                        size={24} 
                                                        color="white" 
                                                    />
                                                    <Text style={styles.joinButtonText}>
                                                        {joinedEvents.has(selectedEvent.id) ? 'Leave Event' : 'Join Event'}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}

                            </View>
                        </ScrollView>
                    </SafeAreaView>
                )}
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    listContainer: { padding: scale(15), backgroundColor: palette.pageBg },
    card: { 
        backgroundColor: palette.white, 
        borderRadius: scale(12), 
        marginBottom: scale(15), 
        padding: scale(15),
        elevation: 3, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.1, 
        shadowRadius: scale(4) 
    },
    poster: { 
        width: '100%', 
        height: '100%', 
        borderRadius: scale(8),
        resizeMode: 'cover',
    },
    cardContent: { 
        flex: 1, 
        paddingVertical: scale(5),
    },
    statusBadge: { 
        backgroundColor: palette.primaryRed, 
        paddingHorizontal: scale(10), 
        paddingVertical: scale(4), 
        borderRadius: scale(20), 
        alignSelf: 'flex-start', 
        marginBottom: scale(10) 
    },
    statusText: { 
        color: palette.white, 
        fontSize: scale(10), 
        fontWeight: 'bold' 
    },
    cardTitle: { 
        fontSize: scale(20), 
        fontWeight: 'bold', 
        color: palette.darkText, 
        marginBottom: scale(5) 
    },
    cardLocation: { 
        fontSize: scale(14), 
        color: palette.lightText 
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: scale(50), 
        color: palette.lightText, 
        fontSize: scale(16) 
    },
    adminActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: scale(15),
        paddingTop: scale(10),
        borderTopWidth: 1,
        borderTopColor: palette.borderLight,
    },
    adminButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: scale(20),
    },
    adminButtonText: {
        marginLeft: scale(5),
        fontSize: scale(14),
        fontWeight: '500',
    },
    cardLayout: {
        flexDirection: 'row',
    },
    posterContainer: {
        width: scale(120),
        height: scale(90),
        marginRight: scale(15),
    },
    placeholderPoster: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F0F0F0',
        borderRadius: scale(8),
        justifyContent: 'center',
        alignItems: 'center',
        gap: scale(4),
    },
    dateLocationContainer: {
        marginTop: scale(8),
        gap: scale(4),
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(4),
    },
    infoText: {
        fontSize: scale(14),
        color: palette.darkText,
        marginLeft: scale(6),
        flex: 1,
    },
    // Modal styles
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
        borderBottomColor: palette.borderLight,
        backgroundColor: palette.white,
    },
    closeButton: {
        padding: scale(10),
        backgroundColor: '#f0f0f0',
        borderRadius: scale(20),
        width: scale(40),
        height: scale(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalHeaderTitle: {
        fontSize: scale(20),
        fontWeight: 'bold',
        color: palette.primaryRed,
        flex: 1,
        textAlign: 'center',
        marginRight: scale(40), // Balance the close button
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: scale(20),
        paddingTop: scale(20),
    },
    modalPoster: {
        width: '100%',
        height: scale(200),
        borderRadius: scale(12),
        marginBottom: scale(20),
        backgroundColor: '#f0f0f0',
    },
    modalPlaceholderPoster: {
        width: '100%',
        height: scale(200),
        borderRadius: scale(12),
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(20),
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    placeholderText: {
        color: palette.lightText,
        fontSize: scale(12),
        fontStyle: 'italic',
        textAlign: 'center',
    },
    eventInfoContainer: {
        marginBottom: scale(20),
    },
    eventTitle: {
        fontSize: scale(24),
        fontWeight: 'bold',
        color: palette.primaryRed,
        marginBottom: scale(20),
        textAlign: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: scale(15),
        paddingVertical: scale(10),
        paddingHorizontal: scale(15),
        backgroundColor: '#f9f9f9',
        borderRadius: scale(10),
        borderLeftWidth: 4,
        borderLeftColor: palette.primaryRed,
    },
    detailIcon: {
        width: scale(40),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(15),
    },
    detailContent: {
        flex: 1,
        justifyContent: 'center',
    },
    detailLabel: {
        fontSize: scale(14),
        fontWeight: '600',
        color: palette.primaryRed,
        marginBottom: scale(2),
    },
    detailValue: {
        fontSize: scale(16),
        color: palette.darkText,
        lineHeight: scale(22),
    },
    
    // Card Actions Styles
    cardActions: {
        marginTop: scale(10),
        marginBottom: scale(5),
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: scale(8),
        paddingHorizontal: scale(12),
        borderRadius: scale(8),
        borderWidth: 1,
        borderColor: palette.primaryRed,
        alignSelf: 'flex-start',
    },
    viewDetailsText: {
        fontSize: scale(12),
        fontWeight: '600',
        color: palette.primaryRed,
        marginLeft: scale(6),
    },
    
    // Join Button Styles
    joinButtonContainer: {
        marginTop: scale(25),
        paddingTop: scale(20),
        borderTopWidth: 1,
        borderTopColor: palette.borderLight,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(15),
        paddingHorizontal: scale(25),
        borderRadius: scale(25),
        minHeight: scale(50),
    },
    joinEventButton: {
        backgroundColor: palette.primaryRed,
    },
    leaveButton: {
        backgroundColor: '#FF6B6B',
    },
    joinButtonText: {
        color: 'white',
        fontSize: scale(16),
        fontWeight: '600',
        marginLeft: scale(10),
    },

    // Modern Event Card Styles
    modernEventCard: {
        backgroundColor: palette.white,
        borderRadius: scale(16),
        marginBottom: scale(20),
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },

    heroContainer: {
        height: scale(200),
        position: 'relative',
        overflow: 'hidden',
    },

    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },

    heroPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#6B7280',
        justifyContent: 'center',
        alignItems: 'center',
    },

    noPosterText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: scale(14),
        fontWeight: '500',
        marginTop: scale(8),
        textAlign: 'center',
    },

    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(151, 151, 151, 0.61)',
    },

    modernStatusBadge: {
        position: 'absolute',
        top: scale(16),
        right: scale(16),
        paddingHorizontal: scale(12),
        paddingVertical: scale(6),
        borderRadius: scale(20),
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },

    modernStatusText: {
        color: palette.white,
        fontSize: scale(10),
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    heroContent: {
        position: 'absolute',
        bottom: scale(16),
        left: scale(16),
        right: scale(16),
    },

    modernCardTitle: {
        fontSize: scale(24),
        fontWeight: '700',
        color: palette.white,
        lineHeight: scale(30),
        marginBottom: scale(4),
        textShadowColor: 'rgba(0, 0, 0, 0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    modernCardDate: {
        fontSize: scale(14),
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.9)',
        textShadowColor: 'rgba(0, 0, 0, 0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    modernCardBottom: {
        padding: scale(16),
    },

    modernLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(16),
    },

    modernLocationText: {
        fontSize: scale(14),
        color: palette.darkText,
        marginLeft: scale(8),
        flex: 1,
        fontWeight: '500',
    },

    modernActionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    modernDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: scale(16),
        paddingVertical: scale(8),
        borderRadius: scale(20),
        flex: 1,
        marginRight: scale(8),
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    modernDetailsButtonFull: {
        marginRight: 0,
    },

    modernDetailsText: {
        fontSize: scale(12),
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: scale(4),
    },

    modernJoinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E53E3E',
        paddingHorizontal: scale(16),
        paddingVertical: scale(8),
        borderRadius: scale(20),
        flex: 1,
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#E53E3E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },

    modernJoinText: {
        fontSize: scale(12),
        fontWeight: '600',
        color: 'white',
        marginLeft: scale(4),
    },

    modernLeaveButton: {
        backgroundColor: '#FF6B6B',
        shadowColor: '#FF6B6B',
    },

    modernAdminButtons: {
        flexDirection: 'row',
        gap: scale(8),
    },

    modernEditButton: {
        backgroundColor: 'rgba(52, 120, 246, 0.1)',
        padding: scale(10),
        borderRadius: scale(20),
        borderWidth: 1,
        borderColor: palette.blue,
    },

    modernDeleteButton: {
        backgroundColor: 'rgba(155, 0, 0, 0.1)',
        padding: scale(10),
        borderRadius: scale(20),
        borderWidth: 1,
        borderColor: palette.primaryRed,
    },
});