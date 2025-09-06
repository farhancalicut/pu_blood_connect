import React, { useState, useCallback, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView, Linking, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

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

const BloodBankCard = memo(({ item }: { item: BloodBank }) => {
    const openMaps = useCallback(() => {
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
    }, [item]);

    const callPhone = useCallback(() => {
        Linking.openURL(`tel:${item.phone}`);
    }, [item.phone]);

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardAddress}>{item.address}</Text>
            <View style={styles.cardFooter}>
                <TouchableOpacity onPress={callPhone} accessibilityLabel="Call Blood Bank">
                    <Text style={styles.phoneText}><Ionicons name="call" size={scale(14)} /> {item.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.directionsButton} onPress={openMaps} accessibilityLabel="Get Directions">
                    <Text style={styles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

function HeaderAddButton() {
    const router = useRouter();
    return (
        <TouchableOpacity onPress={() => router.push('/add-blood-bank')} style={{ marginRight: scale(15) }} accessibilityLabel="Add Blood Bank">
            <Ionicons name="add-circle" size={scale(28)} color={palette.primaryRed} />
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
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
            } else {
                setIsAdmin(false);
            }
            const q = query(collection(db, 'bloodBanks'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BloodBank));
            setBloodBanks(data);
        } catch (error) {
            Alert.alert("Error", "Could not fetch blood banks.");
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
        navigation.setOptions?.({
            headerRight: isAdmin ? () => <HeaderAddButton /> : undefined,
        });
    }, [isAdmin, navigation]);

    return (
        <SafeAreaView style={styles.safeArea}>
            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={bloodBanks}
                    renderItem={({ item }) => <BloodBankCard item={item} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: palette.lightText, marginTop: 40 }}>No blood banks found.</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    listContainer: { padding: scale(15), backgroundColor: palette.pageBg },
    card: { 
        backgroundColor: palette.white, 
        padding: scale(15), 
        borderRadius: scale(10), 
        marginBottom: scale(15), 
        borderWidth: 1, 
        borderColor: palette.borderLight 
    },
    cardTitle: { 
        fontSize: scale(18), 
        fontWeight: 'bold', 
        color: palette.darkText, 
        marginBottom: scale(5) 
    },
    cardAddress: { 
        fontSize: scale(14), 
        color: palette.lightText, 
        lineHeight: scale(20) 
    },
    cardFooter: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: scale(15), 
        borderTopWidth: 1, 
        borderTopColor: palette.borderLight, 
        paddingTop: scale(10) 
    },
    phoneText: { 
        color: palette.darkText, 
        fontSize: scale(14), 
        fontWeight: '500' 
    },
    directionsButton: { 
        backgroundColor: palette.primaryRed, 
        paddingVertical: scale(8), 
        paddingHorizontal: scale(15), 
        borderRadius: scale(20) 
    },
    directionsButtonText: { 
        color: palette.white, 
        fontWeight: 'bold', 
        fontSize: scale(12) 
    },
    emptyText: {
        textAlign: 'center', 
        color: palette.lightText, 
        marginTop: scale(40),
        fontSize: scale(16)
    }
});