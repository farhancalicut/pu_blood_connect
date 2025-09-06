import React,  { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type UserRequest = {
    id: string;
    patientName: string;
    hospital: string;
    bloodGroup: string;
    status: 'pending' | 'completed';
    createdAt: { toDate: () => Date };
};

const MyRequestCard = ({ item, onDelete }: { item: UserRequest, onDelete: () => void }) => {
    const router = useRouter(); 
    return (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.patientName}</Text>
                <Text style={styles.cardDetail}>Hospital: {item.hospital}</Text>
                <Text style={styles.cardDetail}>Blood Group: {item.bloodGroup}</Text>
                <Text style={styles.cardDetail}>Status: <Text style={item.status === 'pending' ? styles.statusPending : styles.statusCompleted}>{item.status}</Text></Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push({ pathname: '/request', params: { requestId: item.id } })}>
                    <Ionicons name="pencil" size={scale(20)} color={palette.darkText} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
                    <Ionicons name="trash" size={scale(20)} color={palette.primaryRed} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function MyRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<UserRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();
    const user = auth.currentUser;

    const fetchUserRequests = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'requests'),
                where('requesterId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRequest));
            setRequests(data);
        } catch (error) {
            console.error("Error fetching user requests:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchUserRequests();
        }, [fetchUserRequests])
    );

    const handleDelete = (requestId: string) => {
        Alert.alert(
            "Delete Request",
            "Are you sure you want to permanently delete this request?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "requests", requestId));
                            Alert.alert("Success", "Your request has been deleted.");
                            fetchUserRequests(); // Refresh the list
                        } catch (error) {
                            console.error("Error deleting request: ", error);
                            Alert.alert("Error", "Could not delete the request.");
                        }
                    },
                },
            ]
        );
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={requests}
                    renderItem={({ item }) => <MyRequestCard item={item} onDelete={() => handleDelete(item.id)} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>You have not made any requests yet.</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    listContainer: { padding: scale(15), backgroundColor: palette.pageBg },
    card: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: palette.white, 
        padding: scale(15), 
        borderRadius: scale(10), 
        marginBottom: scale(10), 
        borderWidth: 1, 
        borderColor: palette.borderLight 
    },
    cardTitle: { 
        fontSize: scale(16), 
        fontWeight: 'bold', 
        color: palette.darkText, 
        marginBottom: scale(5) 
    },
    cardDetail: { 
        fontSize: scale(14), 
        color: palette.lightText, 
        marginTop: scale(2) 
    },
    statusPending: { color: '#ffa000', fontWeight: 'bold' },
    statusCompleted: { color: '#388e3c', fontWeight: 'bold' },
    buttonContainer: { flexDirection: 'row' },
    actionButton: { 
        padding: scale(8), 
        marginLeft: scale(10) 
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: scale(50), 
        color: palette.lightText, 
        fontSize: scale(16) 
    },
});