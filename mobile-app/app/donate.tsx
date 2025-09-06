import React, { FC, useCallback, useEffect, useRef, useState, memo } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    Linking,
    Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, where, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', criticalRed: '#D9324B', cardBg: '#FEFBFB' };

type Request = { id: string; patientName: string; hospital: string; bloodGroup: string; units: number; isCritical: boolean; requiredDate: { toDate: () => Date }; mobileNumber: string; notes?: string; requesterId: string; requesterName: string; };
const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
type DetailRowProps = { label: string; value: string; isCritical?: boolean; };
type RequestDetailsModalProps = { visible: boolean; request: Request | null; onClose: () => void; };
type RequestCardProps = { item: Request; onViewDetails: (item: Request) => void; onDonatePress: (item: Request) => void; };
type DonorProfile = { uid: string; name: string; mobile: string; };

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
            if (!uri) throw new Error("Failed to capture view");
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
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request for Blood</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={handleCopy} style={styles.modalActionButton}>
                                    <Text style={styles.modalActionText}>copy <Ionicons name="copy-outline" size={scale(14)} /></Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleShareAsImage} style={styles.modalActionButton}>
                                    <Text style={styles.modalActionText}>Share <Ionicons name="share-outline" size={scale(14)} /></Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={scale(32)} color={palette.white} />
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const DetailRow: FC<DetailRowProps> = ({ label, value, isCritical = false }) => (
    <View style={styles.detailRowModal}>
        <Text style={styles.detailLabelModal}>{label}</Text>
        <Text style={[styles.detailValueModal, isCritical && { color: palette.criticalRed, fontWeight: 'bold' }]}>{value}</Text>
    </View>
);

const RequestCard: FC<RequestCardProps> = ({ item, onViewDetails, onDonatePress }) => (
    <View style={styles.card}>
        <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>Blood Details</Text>
            {item.isCritical && <View style={styles.urgentTag}><Text style={styles.urgentTagText}>Urgent</Text></View>}
        </View>
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


export default function DonateScreen() {
    const [allRequests, setAllRequests] = useState<Request[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);

    const openDetailsModal = (request: Request) => { setSelectedRequest(request); setIsModalVisible(true); };
    const closeDetailsModal = () => setIsModalVisible(false);

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
                        name: data.name || `${data.firstName} ${data.lastName}`.trim(),
                        mobile: data.mobile || 'Not available'
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
    }, [searchQuery, selectedBloodGroup, allRequests]);

    const handleDonatePress = async (request: Request) => {
        if (!donorProfile) {
            Alert.alert("Error", "Could not identify your user profile. Please try again.");
            return;
        }
        Alert.alert(
            "Thank You for Your Offer!",
            `We will notify ${request.requesterName || 'the requester'} about your willingness to donate.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "OK, Share", 
                    onPress: async () => {
                        try {
                            const notificationPromise = addDoc(collection(db, "notifications"), {
                                recipientId: request.requesterId,
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
                            const offerPromise = addDoc(collection(db, "donationOffers"), {
                                donorId: donorProfile.uid,
                                donorName: donorProfile.name,
                                requesterId: request.requesterId,
                                requesterName: request.requesterName,
                                requestId: request.id,
                                hospital: request.hospital,
                                bloodGroup: request.bloodGroup,
                                status: "offered",
                                createdAt: serverTimestamp()
                            });
                            await Promise.all([notificationPromise, offerPromise]);
                            Alert.alert("Sent!", `${request.requesterName} has been notified. Check your History page for next steps.`);
                        } catch (error) {
                            console.error("Error creating notification/offer: ", error);
                            Alert.alert("Error", "Could not send notification. Please try again.");
                        }
                    } 
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.searchAndFilterContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={scale(20)} color={palette.lightText} style={{ marginLeft: scale(10) }} />
                    <TextInput placeholder="Search by hospital, patient..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
                    <Ionicons name="mic" size={scale(20)} color={palette.lightText} style={{ marginRight: scale(10) }} />
                </View>
                <FlatList 
                    data={BLOOD_GROUPS} 
                    keyExtractor={item => item} 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.bloodFilterButton, selectedBloodGroup === item && styles.selectedBloodFilter]} 
                            onPress={() => setSelectedBloodGroup(item)}>
                            <Text style={[styles.bloodFilterText, selectedBloodGroup === item && styles.selectedBloodFilterText]}>{item}</Text>
                        </TouchableOpacity>
                    )} 
                    contentContainerStyle={{ paddingHorizontal: scale(15), paddingVertical: scale(10) }} 
                />
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
    searchAndFilterContainer: { backgroundColor: palette.white, paddingBottom: scale(5), elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.pageBg, marginHorizontal: scale(15), borderRadius: scale(10), marginTop: scale(10) },
    searchInput: { flex: 1, padding: scale(12), fontSize: scale(16) },
    bloodFilterButton: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.borderLight, borderRadius: scale(20), paddingVertical: scale(8), paddingHorizontal: scale(16), marginRight: scale(10) },
    selectedBloodFilter: { backgroundColor: palette.primaryRed, borderColor: palette.primaryRed },
    bloodFilterText: { color: palette.primaryRed, fontWeight: '500', fontSize: scale(14) },
    selectedBloodFilterText: { color: palette.white },
    listContainer: { padding: scale(15), backgroundColor: palette.pageBg },
    card: { backgroundColor: palette.cardBg, borderRadius: scale(8), padding: scale(15), marginBottom: scale(15), borderWidth: 1, borderColor: '#F0E5F4' },
    titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) },
    cardTitle: { fontSize: scale(16), fontWeight: 'bold', color: palette.darkText },
    urgentTag: { backgroundColor: palette.criticalRed, borderRadius: scale(4), paddingHorizontal: scale(8), paddingVertical: scale(3), marginLeft: scale(10) },
    urgentTagText: { color: palette.white, fontSize: scale(10), fontWeight: 'bold' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(5) },
    detailLabel: { color: palette.lightText, width: scale(60), fontSize: scale(14) },
    detailValue: { color: palette.darkText, fontWeight: '500', fontSize: scale(14) },
    viewDetailsText: { color: palette.primaryRed, fontWeight: 'bold', fontSize: scale(14) },
    donateButton: { backgroundColor: palette.primaryRed, paddingVertical: scale(8), paddingHorizontal: scale(20), borderRadius: scale(6) },
    donateButtonText: { color: palette.white, fontWeight: 'bold', fontSize: scale(14) },
    emptyText: { textAlign: 'center', marginTop: scale(50), color: palette.lightText, fontSize: scale(16) },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { width: '90%', backgroundColor: palette.cardBg, borderRadius: scale(10), overflow: 'hidden' },
    modalHeader: { padding: scale(15), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F8F8', borderBottomWidth: 1, borderBottomColor: palette.borderLight },
    modalTitle: { fontSize: scale(16), fontWeight: 'bold', color: palette.primaryRed },
    modalActions: { flexDirection: 'row' },
    modalActionButton: { flexDirection: 'row', alignItems: 'center', marginLeft: scale(15) },
    modalActionText: { color: palette.lightText, fontSize: scale(14) },
    modalBody: { padding: scale(20) },
    watermark: { position: 'absolute', width: scale(120), height: scale(120), top: '50%', left: '50%', transform: [{ translateX: scale(-60) }, { translateY: scale(-60) }], opacity: 0.05 },
    detailRowModal: { marginBottom: scale(12), flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    detailLabelModal: { fontSize: scale(14), color: palette.lightText, marginRight: scale(8) },
    detailValueModal: { fontSize: scale(16), color: palette.darkText, fontWeight: '500' },
    closeButton: { position: 'absolute', top: scale(40), right: scale(20) },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: palette.borderLight,
        paddingTop: scale(10),
        marginTop: scale(10),
    },
});