import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// --- RESPONSIVE SETUP ---
const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; // Standard screen width to scale from

// This function scales sizes based on the screen width
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type Notification = {
    id: string;
    donorName: string;
    bloodGroup: string;
    hospital: string;
    createdAt: { toDate: () => Date };
};

const NotificationItem = ({ item }: { item: Notification }) => (
    <View style={styles.itemContainer}>
        <Ionicons name="water" size={scale(24)} color={palette.primaryRed} style={styles.icon} />
        <View style={styles.textContainer}>
            <Text style={styles.itemText}>
                <Text style={{fontWeight: 'bold'}}>{item.donorName}</Text> has offered to donate {item.bloodGroup} blood for your request at {item.hospital}.
            </Text>
            <Text style={styles.timestamp}>{item.createdAt.toDate().toLocaleDateString()}</Text>
        </View>
    </View>
);

export default function NotificationsScreen() {
    // --- YOUR LOGIC (UNCHANGED) ---
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();
    const user = auth.currentUser;

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'notifications'),
                where('recipientId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

    // --- YOUR JSX (UNCHANGED) ---
    return (
        <SafeAreaView style={styles.safeArea}>
            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={({ item }) => <NotificationItem item={item} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>You have no new notifications.</Text>}
                />
            )}
        </SafeAreaView>
    );
};

// --- RESPONSIVE STYLESHEET ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: palette.white,
    },
    listContainer: {
        padding: scale(15),
        backgroundColor: palette.pageBg,
    },
    itemContainer: {
        flexDirection: 'row',
        backgroundColor: palette.white,
        padding: scale(15),
        borderRadius: scale(10),
        marginBottom: scale(10),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.borderLight,
    },
    icon: {
        marginRight: scale(15),
    },
    textContainer: {
        flex: 1,
    },
    itemText: {
        fontSize: scale(15),
        color: palette.darkText,
        lineHeight: scale(22),
    },
    timestamp: {
        fontSize: scale(12),
        color: palette.lightText,
        marginTop: scale(4),
    },
    emptyText: {
        textAlign: 'center',
        marginTop: scale(50),
        color: palette.lightText,
        fontSize: scale(16),
    },
});