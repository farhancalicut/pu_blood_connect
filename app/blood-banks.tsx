import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView, Linking, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect, useNavigation  } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type BloodBank = {
    id: string;
    name: string;
    address: string;
    phone: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
};
const bloodBanksData: BloodBank[] = [
    {
        id: '1',
        name: 'JIPMER Blood Bank',
        address: 'Dhanvantari Nagar, Gorimedu, Puducherry, 605006',
        phone: '0413 229 6000',
        coordinates: { latitude: 11.9562, longitude: 79.7951 },
    },
    {
        id: '2',
        name: 'Indira Gandhi Govt. General Hospital Blood Bank',
        address: 'Victor Simonel St, Puducherry, 605001',
        phone: '0413 233 3364',
        coordinates: { latitude: 11.9363, longitude: 79.8318 },
    },
    {
        id: '3',
        name: 'Aathma Blood Bank',
        address: 'No 26, Natesan Nagar East, Puducherry, 605005',
        phone: '0413 220 5600',
        coordinates: { latitude: 11.9429, longitude: 79.8037 },
    },
];

const BloodBankCard = ({ item }: { item: BloodBank }) => {
    const openMaps = () => {
        const { latitude, longitude } = item.coordinates;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${latitude},${longitude}`;
        const label = item.name;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        if (url) {
            Linking.openURL(url);
        } else {
            Alert.alert("Error", "Could not open maps for this device.");
        }
    };

    const callPhone = () => {
        Linking.openURL(`tel:${item.phone}`);
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardAddress}>{item.address}</Text>
            <View style={styles.cardFooter}>
                <TouchableOpacity onPress={callPhone}>
                    <Text style={styles.phoneText}><Ionicons name="call" size={14} /> {item.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.directionsButton} onPress={openMaps}>
                    <Text style={styles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

function HeaderAddButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/add-blood-bank')} style={{ marginRight: 15 }}>
      <Ionicons name="add-circle" size={28} color={palette.primaryRed} />
    </TouchableOpacity>
  );
}

export default function BloodBanksScreen() {
    const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigation = useNavigation();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        // Check user role
        const user = auth.currentUser;
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                setIsAdmin(true);
            }
        }
        try {
            const q = query(collection(db, 'bloodBanks'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BloodBank));
            setBloodBanks(data);
        } catch (error) {
            console.error("Error fetching blood banks:", error);
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
        } else {
            navigation.setOptions({
                headerRight: () => null, 
            });
        }
    }, [isAdmin, navigation]);

    return (
         <SafeAreaView style={styles.safeArea}>
           
            {isLoading ? (
                <ActivityIndicator style={{flex: 1}} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={bloodBanks}
                    renderItem={({ item }) => <BloodBankCard item={item} />}
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
    card: { backgroundColor: palette.white, padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: palette.borderLight },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: palette.darkText, marginBottom: 5 },
    cardAddress: { fontSize: 14, color: palette.lightText, lineHeight: 20 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: palette.borderLight, paddingTop: 10 },
    phoneText: { color: palette.darkText, fontSize: 14, fontWeight: '500' },
    directionsButton: { backgroundColor: palette.primaryRed, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
    directionsButtonText: { color: palette.white, fontWeight: 'bold', fontSize: 12 },
});