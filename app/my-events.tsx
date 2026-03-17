import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, FlatList, Image, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { CheckCircle, Calendar, MapPin, ChevronLeft } from 'lucide-react-native';
import { getAuth } from 'firebase/auth';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const palette = { 
    primaryRed: '#9B0000', 
    darkText: '#333333', 
    lightText: '#8A8A8A', 
    white: '#ffffff', 
    borderLight: '#EAEAEA', 
    pageBg: '#F7F7F7' 
};

type Event = {
    id: string;
    title: string;
    location: string;
    eventDate: { toDate: () => Date };
    posterImageUrl?: string;
    description?: string;
    status?: string;
};

const scale = (size: number) => size;

export default function MyEventsScreen() {
    const router = useRouter();
    const [participatedEvents, setParticipatedEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();
    const user = auth.currentUser;

    const fetchParticipatedEvents = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Get all events where user is in attendedStudents array
            const eventsQuery = query(collection(db, 'events'));
            const querySnapshot = await getDocs(eventsQuery);
            
            const userEvents: Event[] = [];
            querySnapshot.docs.forEach((doc) => {
                const eventData = doc.data();
                const attendedStudents = eventData.attendedStudents || [];
                
                if (attendedStudents.includes(user.uid)) {
                    userEvents.push({
                        id: doc.id,
                        title: eventData.title,
                        location: eventData.location,
                        eventDate: eventData.eventDate,
                        posterImageUrl: eventData.posterImageUrl,
                        description: eventData.description,
                        status: eventData.status,
                    });
                }
            });
            
            // Sort by date (most recent first)
            userEvents.sort((a, b) => b.eventDate.toDate().getTime() - a.eventDate.toDate().getTime());
            setParticipatedEvents(userEvents);
        } catch (error) {
            console.error('Error fetching participated events:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useFocusEffect(useCallback(() => { 
        fetchParticipatedEvents();
    }, [fetchParticipatedEvents]));

    const renderEventCard = ({ item }: { item: Event }) => (
        <View style={styles.eventCard}>
            {item.posterImageUrl ? (
                <Image source={{ uri: item.posterImageUrl }} style={styles.eventPoster} />
            ) : (
                <View style={styles.eventPosterPlaceholder}>
                    <Calendar size={40} color={palette.lightText} />
                    <Text style={styles.placeholderText}>Image is not uploaded</Text>
                </View>
            )}
            <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.eventDetails}>
                    <MapPin size={16} color={palette.lightText} />
                    <Text style={styles.eventLocation} numberOfLines={1}>{item.location}</Text>
                </View>
                <View style={styles.eventDetails}>
                    <Calendar size={16} color={palette.lightText} />
                    <Text style={styles.eventDate}>
                        {item.eventDate.toDate().toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </Text>
                </View>
            </View>
            <View style={styles.attendedBadge}>
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.attendedText}>Attended</Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={palette.primaryRed} />
                    <Text style={styles.loadingText}>Loading your events...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen 
                options={{ 
                    headerShown: false 
                }} 
            />
            <SafeAreaView style={styles.safeArea}>
                {/* Custom Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color={palette.darkText} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Events</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.container}>
                    {participatedEvents.length > 0 ? (
                        <FlatList
                            data={participatedEvents}
                            renderItem={renderEventCard}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContainer}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Calendar size={80} color={palette.lightText} />
                            <Text style={styles.emptyStateTitle}>No Events Yet</Text>
                            <Text style={styles.emptyStateText}>
                                You haven't participated in any events yet. Join events and mark your attendance to see them here!
                            </Text>
                            <TouchableOpacity style={styles.exploreButton} onPress={() => router.push('/events')}>
                                <Text style={styles.exploreButtonText}>Explore Events</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: palette.white 
    },
    container: { 
        flex: 1, 
        backgroundColor: palette.pageBg 
    },
    
    // Header Styles
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
        height: scale(40),
    },
    
    // Loading Styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: palette.pageBg,
    },
    loadingText: {
        fontSize: scale(16),
        color: palette.lightText,
        marginTop: scale(15),
    },

    // List Styles
    listContainer: {
        padding: scale(20),
    },
    
    // Event Card Styles
    eventCard: {
        backgroundColor: 'white',
        borderRadius: scale(15),
        padding: scale(15),
        marginBottom: scale(15),
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventPoster: {
        width: scale(60),
        height: scale(60),
        borderRadius: scale(10),
        marginRight: scale(15),
    },
    eventPosterPlaceholder: {
        width: scale(60),
        height: scale(60),
        borderRadius: scale(10),
        backgroundColor: palette.pageBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(15),
    },
    placeholderText: {
        fontSize: scale(8),
        color: palette.lightText,
        textAlign: 'center',
        marginTop: scale(2),
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        fontSize: scale(16),
        fontWeight: '600',
        color: palette.darkText,
        marginBottom: scale(5),
    },
    eventDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(3),
    },
    eventLocation: {
        fontSize: scale(12),
        color: palette.lightText,
        marginLeft: scale(5),
        flex: 1,
    },
    eventDate: {
        fontSize: scale(12),
        color: palette.lightText,
        marginLeft: scale(5),
    },
    attendedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: scale(10),
        paddingVertical: scale(5),
        borderRadius: scale(15),
        gap: scale(5),
    },
    attendedText: {
        fontSize: scale(11),
        color: '#10B981',
        fontWeight: '600',
    },
    
    // Empty State
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(40),
    },
    emptyStateTitle: {
        fontSize: scale(20),
        fontWeight: 'bold',
        color: palette.darkText,
        marginTop: scale(15),
        marginBottom: scale(10),
    },
    emptyStateText: {
        fontSize: scale(14),
        color: palette.lightText,
        textAlign: 'center',
        lineHeight: scale(20),
        marginBottom: scale(25),
    },
    exploreButton: {
        backgroundColor: palette.primaryRed,
        paddingHorizontal: scale(25),
        paddingVertical: scale(12),
        borderRadius: scale(25),
    },
    exploreButtonText: {
        color: 'white',
        fontSize: scale(14),
        fontWeight: '600',
    },
});