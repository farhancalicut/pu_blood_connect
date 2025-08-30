import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, storage } from '../firebase';

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', blue: '#3478f6' };

type Event = { id: string; title: string; location: string; eventDate: { toDate: () => Date }; posterImageUrl: string; };
const EventCard = ({ item, isAdmin, onEdit, onDelete }: { item: Event, isAdmin: boolean, onEdit: () => void, onDelete: () => void }) => {
    const eventDate = item.eventDate.toDate();
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    const isUpcoming = eventDate >= now;
    
    return (
        <View style={styles.card}>
            <Image source={{ uri: item.posterImageUrl }} style={styles.poster} />
            <View style={styles.cardContent}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{isUpcoming ? 'UPCOMING' : eventDate.toLocaleDateString()}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardLocation}><Ionicons name="location-sharp" size={14} /> {item.location}</Text>
                
                {isAdmin && (
                    <View style={styles.adminActions}>
                        <TouchableOpacity style={styles.adminButton} onPress={onEdit}>
                            <Ionicons name="pencil" size={16} color={palette.blue} />
                            <Text style={[styles.adminButtonText, { color: palette.blue }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.adminButton} onPress={onDelete}>
                            <Ionicons name="trash" size={16} color={palette.primaryRed} />
                            <Text style={[styles.adminButtonText, { color: palette.primaryRed }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

function HeaderAddButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/add-event')} style={{ marginRight: 15 }}>
      <Ionicons name="add-circle" size={28} color="#FE465E" />
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigation = useNavigation();
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        
        const user = auth.currentUser;
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
    
        useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

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

                            const imageRef = ref(storage, event.posterImageUrl);
                            await deleteObject(imageRef);

                            Alert.alert("Success", "The event has been deleted.");
                            fetchData(); // Refresh the list
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
    return (
        <SafeAreaView style={styles.safeArea}>
            
            {isLoading ? ( <ActivityIndicator /> ) : (
                <FlatList
                    data={events}
                    renderItem={({ item }) => <EventCard item={item} isAdmin={isAdmin} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>No events scheduled right now.</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    listContainer: { padding: 15, backgroundColor: palette.pageBg },
    card: { backgroundColor: palette.white, borderRadius: 12, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
    poster: { width: '100%', height: 180, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    cardContent: { padding: 15 },
    statusBadge: { backgroundColor: palette.primaryRed, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 },
    statusText: { color: palette.white, fontSize: 10, fontWeight: 'bold' },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: palette.darkText, marginBottom: 5 },
    cardLocation: { fontSize: 14, color: palette.lightText },
    emptyText: { textAlign: 'center', marginTop: 50, color: palette.lightText, fontSize: 16 },
    adminActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: palette.borderLight,
    },
    adminButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 20,
    },
    adminButtonText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: '500',
    },
});