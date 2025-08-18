import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { db } from '../firebase';

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type Donation = { id: string; donorName?: string; department?: string; bloodGroup?: string; };

const ListItem = ({ name, detail, action }: { name: string; detail?: string; action: React.ReactNode; }) => (
    <View style={styles.listItem}>
        <View style={styles.itemIcon}>
            <Ionicons name="person" size={18} color={palette.primaryRed} />
        </View>
        <View style={styles.itemDetails}>
            <Text style={styles.itemTitle}>{String(name)}</Text>
            {detail ? <Text style={styles.itemSubtitle}>{String(detail)}</Text> : null}
        </View>
        <Text style={styles.itemAction}>{String(action)}</Text>
    </View>
);

export default function RecentDonorsScreen() {
    const [recentDonors, setRecentDonors] = useState<Donation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecentDonors = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'donations'), orderBy('date', 'desc'), limit(20));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Donation));
            setRecentDonors(data);
        } catch (error) {
            console.error("Error fetching recent donors:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
      useCallback(() => {
        fetchRecentDonors();
      }, [fetchRecentDonors])
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            
            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={recentDonors}
                    renderItem={({ item }) => <ListItem name={item.donorName || 'Anonymous'} detail={item.department || 'N/A'} action={item.bloodGroup} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    listContainer: { padding: 15, backgroundColor: palette.pageBg },
    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, padding: 12, borderRadius: 10, marginBottom: 10, elevation: 1 },
    itemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    itemDetails: { flex: 1 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: palette.darkText },
    itemSubtitle: { fontSize: 12, color: palette.lightText },
    itemAction: { fontWeight: '600', fontSize: 16, color: palette.primaryRed },
});