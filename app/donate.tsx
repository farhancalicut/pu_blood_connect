import React, { useState, useCallback, useEffect, FC, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView,
  ActivityIndicator, TextInput, Share, Modal, Image
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, User } from 'firebase/auth'; // Import User type
import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', criticalRed: '#D9324B', cardBg: '#FEFBFB' };

type Request = { id: string; patientName: string; hospital: string; bloodGroup: string; units: number; isCritical: boolean; requiredDate: { toDate: () => Date }; mobileNumber: string; notes?: string;  requesterId: string; requesterName: string;};

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// --- Component Prop Types ---
type DetailRowProps = { label: string; value: string; isCritical?: boolean; };
type RequestDetailsModalProps = { visible: boolean; request: Request | null; onClose: () => void; };
type RequestCardProps = { item: Request; onViewDetails: (item: Request) => void;onDonatePress: (item: Request) => void;  };
type DonorProfile = {
    uid: string;
    name: string;
    mobile: string; // Assuming you have a 'mobile' field in your users collection
};
// --- RequestDetailsModal Component ---
const RequestDetailsModal: FC<RequestDetailsModalProps> = ({ visible, request, onClose }) => {
    const viewShotRef = useRef<ViewShot>(null);
    if (!request) return null;

    const handleCopy = async () => {
        const textToCopy = `*Request for Blood*\n\nPatient Name: ${request.patientName}\nMobile Number: ${request.mobileNumber}\nRequired Date: ${request.requiredDate.toDate().toLocaleDateString()}\nBlood Group: ${request.bloodGroup}\nHospital: ${request.hospital}\nUnits: ${request.units}\nCritical: ${request.isCritical ? 'Yes' : 'No'}\nNotes: ${request.notes || 'N/A'}`;
        await Clipboard.setStringAsync(textToCopy);
        Alert.alert('Copied!', 'Request details copied to clipboard.');
    };

    const handleShareAsImage = async () => {
        try {
            const uri = await viewShotRef.current?.capture?.();

            if (!uri) {
                throw new Error("Failed to capture view");
            }

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Error", "Sharing is not available on this device.");
                return;
            }

            await Sharing.shareAsync(uri);

        } catch (error) {
            console.error("Error sharing image:", error);
            Alert.alert('Error', 'Could not share the details as an image.');
        }
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Request for Blood</Text><View style={styles.modalActions}><TouchableOpacity onPress={handleCopy} style={styles.modalActionButton}><Text style={styles.modalActionText}>copy <Ionicons name="copy-outline" size={14} /></Text></TouchableOpacity><TouchableOpacity onPress={handleShareAsImage} style={styles.modalActionButton}><Text style={styles.modalActionText}>Share <Ionicons name="share-outline" size={14} /></Text></TouchableOpacity></View></View>
                        <View style={styles.modalBody}>
                            <Image source={{ uri: 'https://i.ibb.co/68v8z0p/heart-logo.png' }} style={styles.watermark} />
                            <DetailRow label="Patient Name:" value={request.patientName} />
                            <DetailRow label="Mobile Number:" value={request.mobileNumber} />
                            <DetailRow label="Required Date:" value={request.requiredDate.toDate().toLocaleDateString()} />
                            <DetailRow label="Blood Group" value={request.bloodGroup} />
                            <DetailRow label="Hospital" value={request.hospital} />
                            <DetailRow label="How many Units" value={String(request.units)} />
                            <DetailRow label="is it Critical?" value={request.isCritical ? 'Yes' : 'No'} isCritical={request.isCritical} />
                            <DetailRow label="Additional Notes/Purpose:" value={request.notes || 'N/A'} />
                        </View>
                    </View>
                </ViewShot>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}><Ionicons name="close-circle" size={32} color={palette.white} /></TouchableOpacity>
            </View>
        </Modal>
    );
};

const DetailRow: FC<DetailRowProps> = ({ label, value, isCritical = false }) => (
    <View style={styles.detailRowModal}><Text style={styles.detailLabelModal}>{label}</Text><Text style={[styles.detailValueModal, isCritical && { color: palette.criticalRed, fontWeight: 'bold' }]}>{value}</Text></View>
);

const RequestCard: FC<RequestCardProps> = ({ item, onViewDetails, onDonatePress }) => (
    <View style={styles.card}>
        <View style={styles.titleContainer}><Text style={styles.cardTitle}>Blood Details</Text>{item.isCritical && <View style={styles.urgentTag}><Text style={styles.urgentTagText}>Urgent</Text></View>}</View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Blood:</Text><Text style={styles.detailValue}>{item.bloodGroup}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Units:</Text><Text style={styles.detailValue}>{item.units}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Place:</Text><Text style={styles.detailValue}>{item.hospital}</Text></View>
        <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => onViewDetails(item)}>
                <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.donateButton} onPress={() => onDonatePress(item)}>
                <Text style={styles.donateButtonText}>Donate</Text>
            </TouchableOpacity>
        </View>
    </View>
);

const DonateScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [allRequests, setAllRequests] = useState<Request[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    const openDetailsModal = (request: Request) => { setSelectedRequest(request); setIsModalVisible(true); };
    const closeDetailsModal = () => setIsModalVisible(false);
    const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);

    // --- FULLY IMPLEMENTED LOGIC ---
    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'requests'), 
                where('status', '==', 'pending'),
                orderBy('isCritical', 'desc'),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const requestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
            setAllRequests(requestsData);
            setFilteredRequests(requestsData);
        } catch (error) {
            console.error("Error fetching requests: ", error);
            Alert.alert('Error', 'Could not fetch blood requests.');
        } finally {
            setIsLoading(false);
        }
    }, []);
// --- NEW: Fetch current user's profile on load ---
    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setDonorProfile({
                        uid: user.uid,
                        name: data.name || 'Anonymous Donor',
                        mobile: data.mobile || 'Not available' // Ensure you have a 'mobile' field on your user docs
                    });
                }
            });
        }
    }, []);
    useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

    useEffect(() => {
        let result = allRequests;

        if (selectedBloodGroup !== 'All') {
            result = result.filter(req => req.bloodGroup === selectedBloodGroup);
        }

        if (searchQuery.length > 0) {
            const lowercasedQuery = searchQuery.toLowerCase();
            result = result.filter(req => 
                req.hospital.toLowerCase().includes(lowercasedQuery) ||
                req.patientName.toLowerCase().includes(lowercasedQuery)
            );
        }
        setFilteredRequests(result);
    }, [searchQuery, selectedBloodGroup, allRequests]); // --- END OF IMPLEMENTED LOGIC ---
// --- NEW: Function to handle the donation offer ---
    const handleDonatePress = async (request: Request) => {
        if (!donorProfile) {
            Alert.alert("Error", "Could not identify your user profile. Please try again.");
            return;
        }

        Alert.alert(
            "Thank You for Your Offer!",
            `We will notify ${request.requesterName} about your willingness to donate.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "OK, Share", 
                    onPress: async () => {
                        try {
                            // Create a notification document in Firestore
                            await addDoc(collection(db, "notifications"), {
                                recipientId: request.requesterId, // The person who made the request
                                donorId: donorProfile.uid,
                                donorName: donorProfile.name,
                                donorContact: donorProfile.mobile,
                                requestId: request.id,
                                bloodGroup: request.bloodGroup,
                                hospital: request.hospital,
                                status: "unread",
                                type: "DONATION_OFFER",
                                createdAt: serverTimestamp()
                            });
                            Alert.alert("Sent!", `${request.requesterName} has been notified.`);
                        } catch (error) {
                            console.error("Error creating notification: ", error);
                            Alert.alert("Error", "Could not send notification. Please try again.");
                        }
                    } 
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={28} color={palette.darkText} /></TouchableOpacity>
                <Text style={styles.headerTitle}>Donate</Text>
                <TouchableOpacity style={styles.headerButton}onPress={() => router.push('/notifications')}><Ionicons name="notifications-outline" size={24} color={palette.darkText} /></TouchableOpacity>
            </View>
            <View style={styles.searchAndFilterContainer}>
                <View style={styles.searchBar}><Ionicons name="search" size={20} color={palette.lightText} style={{marginLeft: 10}} /><TextInput placeholder="Search by hospital, patient..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} /><Ionicons name="mic" size={20} color={palette.lightText} style={{marginRight: 10}} /></View>
                <FlatList data={BLOOD_GROUPS} keyExtractor={item => item} horizontal showsHorizontalScrollIndicator={false} renderItem={({ item }) => (<TouchableOpacity style={[styles.bloodFilterButton, selectedBloodGroup === item && styles.selectedBloodFilter]} onPress={() => setSelectedBloodGroup(item)}><Text style={[styles.bloodFilterText, selectedBloodGroup === item && styles.selectedBloodFilterText]}>{item}</Text></TouchableOpacity>)} contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 10 }} />
            </View>
            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={filteredRequests}
                    renderItem={({ item }) => <RequestCard item={item} onViewDetails={openDetailsModal} onDonatePress={handleDonatePress} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>No matching blood requests found.</Text>}
                />
            )}
            <RequestDetailsModal visible={isModalVisible} request={selectedRequest} onClose={closeDetailsModal} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: palette.white },
    headerButton: { width: 28, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: palette.darkText },
    searchAndFilterContainer: { backgroundColor: palette.white, paddingBottom: 5, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.pageBg, marginHorizontal: 15, borderRadius: 10, marginTop: 10 },
    searchInput: { flex: 1, padding: 12, fontSize: 16 },
    bloodFilterButton: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.borderLight, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10 },
    selectedBloodFilter: { backgroundColor: palette.primaryRed, borderColor: palette.primaryRed },
    bloodFilterText: { color: palette.primaryRed, fontWeight: '500' },
    selectedBloodFilterText: { color: palette.white },
    listContainer: { padding: 15, backgroundColor: palette.pageBg },
    card: { backgroundColor: palette.cardBg, borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F0E5F4' },
    titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: palette.darkText },
    urgentTag: { backgroundColor: palette.criticalRed, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 10 },
    urgentTagText: { color: palette.white, fontSize: 10, fontWeight: 'bold' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    detailLabel: { color: palette.lightText, width: 60 },
    detailValue: { color: palette.darkText, fontWeight: '500' },
    viewDetailsText: { color: palette.primaryRed, fontWeight: 'bold', fontSize: 14 },
    donateButton: { backgroundColor: palette.primaryRed, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6, marginLeft: 'auto' },
    donateButtonText: { color: palette.white, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: palette.lightText, fontSize: 16 },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { width: '90%', backgroundColor: palette.cardBg, borderRadius: 10, overflow: 'hidden' },
    modalHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F8F8', borderBottomWidth: 1, borderBottomColor: palette.borderLight },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: palette.primaryRed },
    modalActions: { flexDirection: 'row' },
    modalActionButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
    modalActionText: { color: palette.lightText, fontSize: 14 },
    modalBody: { padding: 20 },
    watermark: { position: 'absolute', width: 120, height: 120, top: '50%', left: '50%', transform: [{translateX: -60}, {translateY: -60}], opacity: 0.05 },
    detailRowModal: { marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    detailLabelModal: { fontSize: 14, color: palette.lightText, marginBottom: 4, marginRight: 8 },
    detailValueModal: { fontSize: 16, color: palette.darkText, fontWeight: '500' },
    closeButton: { position: 'absolute', top: 40, right: 20 },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Align button to the right
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: palette.borderLight,
        paddingTop: 10,
        marginTop: 10,
    },
});

export default DonateScreen;