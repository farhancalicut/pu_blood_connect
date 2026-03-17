import React, { useState, useCallback, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Linking, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { MapPin, Phone, Clock, Plus, Navigation } from 'lucide-react-native';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type BloodBank = {
    id: string;
    name: string;
    address: string;
    phone?: string;
    phoneNumber?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    latitude?: number;
    longitude?: number;
    city?: string;
    operatingHours?: string;
    bloodTypes?: string[];
};

const BloodBankCard = memo(({ item }: { item: BloodBank }) => {
    const openMaps = useCallback(() => {
        // Handle both coordinate structures (nested coordinates object or flat latitude/longitude)
        const latitude = item.coordinates?.latitude || item.latitude;
        const longitude = item.coordinates?.longitude || item.longitude;
        
        if (!latitude || !longitude) {
            showAlert("Error", "Location coordinates not available for this blood bank.");
            return;
        }

        const latLng = `${latitude},${longitude}`;
        const label = encodeURIComponent(item.name);
        
        let url: string;
        
        if (Platform.OS === 'web') {
            // Use Google Maps for web
            url = `https://www.google.com/maps/search/?api=1&query=${latLng}&query_place_id=${label}`;
        } else if (Platform.OS === 'ios') {
            // Use Apple Maps for iOS
            url = `maps:0,0?q=${label}@${latLng}`;
        } else {
            // Use Google Maps for Android
            url = `geo:0,0?q=${latLng}(${label})`;
        }

        Linking.openURL(url).catch(() => {
            showAlert("Error", "Could not open maps.");
        });
    }, [item]);

    const callPhone = useCallback(() => {
        const phone = item.phone || item.phoneNumber;
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        } else {
            showAlert("Error", "Phone number not available for this blood bank.");
        }
    }, [item.phone, item.phoneNumber]);

    const getBloodTypeColor = (bloodType: string) => {
        const colors: { [key: string]: string } = {
            'A+': '#FF6B6B', 'A-': '#FF8787',
            'B+': '#4ECDC4', 'B-': '#45B7AA',
            'AB+': '#45B7D1', 'AB-': '#6C7CE0',
            'O+': '#FFA726', 'O-': '#FF7043'
        };
        return colors[bloodType] || '#8E8E93';
    };

    const phone = item.phone || item.phoneNumber;
    const hasLocation = (item.coordinates?.latitude && item.coordinates?.longitude) || (item.latitude && item.longitude);

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.city && (
                    <View style={styles.cityBadge}>
                        <Text style={styles.cityText}>{item.city}</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <MapPin size={scale(16)} color={palette.lightText} />
                    <Text style={styles.addressText}>{item.address}</Text>
                </View>

                {item.operatingHours && (
                    <View style={styles.detailRow}>
                        <Clock size={scale(16)} color={palette.lightText} />
                        <Text style={styles.detailText}>{item.operatingHours}</Text>
                    </View>
                )}
            </View>

            {item.bloodTypes && item.bloodTypes.length > 0 && (
                <View style={styles.bloodTypesSection}>
                    <Text style={styles.bloodTypesLabel}>Available Blood Types</Text>
                    <View style={styles.bloodTypesContainer}>
                        {item.bloodTypes.slice(0, 6).map((type) => (
                            <View 
                                key={type}
                                style={[styles.bloodTypeChip, { backgroundColor: getBloodTypeColor(type) }]}
                            >
                                <Text style={styles.bloodTypeText}>{type}</Text>
                            </View>
                        ))}
                        {item.bloodTypes.length > 6 && (
                            <View style={styles.moreTypesChip}>
                                <Text style={styles.moreTypesText}>+{item.bloodTypes.length - 6}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            <View style={styles.actionButtons}>
                {phone && (
                    <TouchableOpacity style={styles.callButton} onPress={callPhone} accessibilityLabel="Call Blood Bank">
                        <Phone size={scale(16)} color={palette.white} />
                        <Text style={styles.callButtonText}>Call</Text>
                    </TouchableOpacity>
                )}
                
                {hasLocation ? (
                    <TouchableOpacity style={styles.directionsButton} onPress={openMaps} accessibilityLabel="Get Directions">
                        <Navigation size={scale(16)} color={palette.white} />
                        <Text style={styles.directionsButtonText}>Get Directions</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.disabledButton}>
                        <Navigation size={scale(16)} color={palette.lightText} />
                        <Text style={styles.disabledButtonText}>Location Not Available</Text>
                    </View>
                )}
            </View>
        </View>
    );
});

function HeaderAddButton() {
    const router = useRouter();
    return (
        <TouchableOpacity onPress={() => router.push('/add-blood-bank')} style={{ marginRight: scale(15) }} accessibilityLabel="Add Blood Bank">
            <Plus size={scale(28)} color={palette.primaryRed} />
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
            const user = getAuth().currentUser;
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
            showAlert("Error", "Could not fetch blood banks.");
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
    safeArea: { 
        flex: 1, 
        backgroundColor: palette.pageBg 
    },
    listContainer: { 
        padding: scale(15), 
        backgroundColor: palette.pageBg 
    },
    card: { 
        backgroundColor: palette.white, 
        padding: scale(20), 
        borderRadius: scale(15), 
        marginBottom: scale(15), 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: scale(15),
    },
    cardTitle: { 
        fontSize: scale(18), 
        fontWeight: 'bold', 
        color: palette.darkText,
        flex: 1,
        marginRight: scale(10)
    },
    cityBadge: {
        backgroundColor: palette.primaryRed + '20',
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(12),
    },
    cityText: {
        fontSize: scale(12),
        fontWeight: '600',
        color: palette.primaryRed,
    },
    cardDetails: {
        marginBottom: scale(15),
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(8),
    },
    addressText: { 
        fontSize: scale(14), 
        color: palette.darkText, 
        lineHeight: scale(20),
        marginLeft: scale(8),
        flex: 1,
    },
    detailText: {
        fontSize: scale(14),
        color: palette.lightText,
        marginLeft: scale(8),
        flex: 1,
    },
    bloodTypesSection: {
        marginBottom: scale(15),
        padding: scale(12),
        backgroundColor: palette.pageBg,
        borderRadius: scale(10),
    },
    bloodTypesLabel: {
        fontSize: scale(13),
        fontWeight: '600',
        color: palette.darkText,
        marginBottom: scale(8),
    },
    bloodTypesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    bloodTypeChip: {
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(12),
        marginRight: scale(6),
        marginBottom: scale(4),
    },
    bloodTypeText: {
        fontSize: scale(11),
        fontWeight: '600',
        color: palette.white,
    },
    moreTypesChip: {
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(12),
        backgroundColor: palette.lightText,
        marginRight: scale(6),
        marginBottom: scale(4),
    },
    moreTypesText: {
        fontSize: scale(11),
        fontWeight: '600',
        color: palette.white,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: scale(10),
    },
    callButton: {
        flex: 1,
        backgroundColor: '#34C759',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(12),
        borderRadius: scale(8),
        gap: scale(6),
    },
    callButtonText: {
        color: palette.white,
        fontWeight: '600',
        fontSize: scale(14),
    },
    directionsButton: { 
        flex: 1,
        backgroundColor: palette.primaryRed, 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(12),
        borderRadius: scale(8),
        gap: scale(6),
    },
    directionsButtonText: { 
        color: palette.white, 
        fontWeight: '600', 
        fontSize: scale(14),
    },
    disabledButton: {
        flex: 1,
        backgroundColor: palette.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(12),
        borderRadius: scale(8),
        gap: scale(6),
    },
    disabledButtonText: {
        color: palette.lightText,
        fontWeight: '500',
        fontSize: scale(14),
    },
    emptyText: {
        textAlign: 'center', 
        color: palette.lightText, 
        marginTop: scale(40),
        fontSize: scale(16)
    }
});
