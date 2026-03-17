import { XCircle, Copy, Share2 as Share, Search, Mic } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import * as htmlToImage from 'html-to-image';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', criticalRed: '#D9324B', cardBg: '#FEFBFB' };

type Request = { id: string; patientName: string; hospital: string; bloodGroup: string; units: number; isCritical: boolean; requiredDate: { toDate: () => Date }; mobileNumber: string; notes?: string; requesterId: string; requesterName: string; acceptedDonors?: string[]; };
const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
type DetailRowProps = { label: string; value: string; isCritical?: boolean; };
type RequestDetailsModalProps = { visible: boolean; request: Request | null; onClose: () => void; };
type RequestCardProps = { item: Request; onViewDetails: (item: Request) => void; onDonatePress: (item: Request) => void; };
type DonorProfile = { uid: string; name: string; mobile: string; };

const RequestDetailsModal: FC<RequestDetailsModalProps> = ({ visible, request, onClose }) => {
    const detailsRef = useRef<View>(null);
    if (!request) return null;

    const handleCopy = async () => {
        const textToCopy = `*Request for Blood*\n\nPatient Name: ${request.patientName}\nMobile Number: ${request.mobileNumber}\nRequired Date: ${request.requiredDate.toDate().toLocaleDateString()}\nBlood Group: ${request.bloodGroup}\nHospital: ${request.hospital}\nUnits: ${request.units}\nCritical: ${request.isCritical ? 'Yes' : 'No'}\nNotes: ${request.notes || 'N/A'}`;
        await Clipboard.setStringAsync(textToCopy);
        showAlert('Copied!', 'Request details copied to clipboard.');
    };

    const handleShareAsImage = async () => {
        if (!detailsRef.current) return;
        try {
            const dataUrl = await htmlToImage.toPng(detailsRef.current as any);

            // Check if Web Share API is available and supports files
            if (navigator.share) {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], `request_${request.id}.png`, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Blood Request',
                        text: 'Urgent Blood Request Details'
                    });
                    return;
                }
            }

            // Fallback to Download
            const link = document.createElement('a');
            link.download = `request_${request.id}.png`;
            link.href = dataUrl;
            link.click();
            showAlert("Saved", "Image downloaded to your device.");

        } catch (error) {
            console.error("Error sharing image:", error);
            showAlert('Error', 'Could not share the details as an image.');
        }
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View ref={detailsRef} collapsable={false}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request for Blood</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={handleCopy} style={styles.modalActionButton}>
                                    <Text style={styles.modalActionText}>copy <Copy size={scale(14)} /></Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleShareAsImage} style={styles.modalActionButton}>
                                    <Text style={styles.modalActionText}>Share <Share size={scale(14)} /></Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.modalBody}>
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
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <XCircle size={scale(32)} color={palette.white} />
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
    const lastLoadTimeRef = useRef<number>(0);  // Track last data load time

    const openDetailsModal = (request: Request) => { setSelectedRequest(request); setIsModalVisible(true); };
    const closeDetailsModal = () => setIsModalVisible(false);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch all requests (both student and hospital requests)
            // Hospital requests have hospitalId field, student requests have requesterId
            const q = query(
                collection(db, 'requests'),
                where('status', 'in', ['pending', 'active']),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const allRequestsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // If it's a hospital request, map the fields
                if (data.hospitalId) {
                    return {
                        id: doc.id,
                        patientName: data.patientName,
                        hospital: data.hospitalName || data.hospital,
                        bloodGroup: data.bloodGroup,
                        units: data.unitsNeeded || data.units,
                        isCritical: data.urgency === 'critical' || data.isCritical,
                        requiredDate: data.requiredBy || data.requiredDate,
                        mobileNumber: data.contactNumber || data.mobileNumber,
                        notes: data.additionalNotes || data.notes || '',
                        requesterId: data.hospitalId,
                        requesterName: data.hospitalName,
                    } as Request;
                }
                // Student request - use as is
                return { id: doc.id, ...data } as Request;
            });

            // Filter out outdated requests (required date has passed)
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Set to start of today
            const activeRequestsData = allRequestsData.filter(request => {
                const requiredDate = request.requiredDate?.toDate?.() || new Date();
                requiredDate.setHours(0, 0, 0, 0);
                return requiredDate >= now; // Only show today and future requests
            });

            // Sort by critical first, then by date
            activeRequestsData.sort((a, b) => {
                if (a.isCritical && !b.isCritical) return -1;
                if (!a.isCritical && b.isCritical) return 1;
                const dateA = a.requiredDate?.toDate?.() || new Date();
                const dateB = b.requiredDate?.toDate?.() || new Date();
                return dateB.getTime() - dateA.getTime();
            });

            setAllRequests(activeRequestsData);
            setFilteredRequests(activeRequestsData);
        } catch (error) {
            console.error("Error fetching requests: ", error);
            showAlert('Error', 'Could not fetch blood requests.');
        } finally {
            setIsLoading(false);
            lastLoadTimeRef.current = Date.now(); // Update last load time
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

    useFocusEffect(
        useCallback(() => {
            // Only reload data if it's been more than 30 seconds since last load
            // or if there's no data yet
            const now = Date.now();
            const lastLoadTime = lastLoadTimeRef.current;
            const shouldRefresh = !lastLoadTime || (now - lastLoadTime > 30000) ||
                allRequests.length === 0;

            if (shouldRefresh) {
                fetchRequests();
            }
        }, [fetchRequests, allRequests.length])
    );

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
            showAlert("Error", "Could not identify your user profile. Please try again.");
            return;
        }

        // Check if user has already donated and if they need to wait
        try {
            const userDocRef = doc(db, 'users', donorProfile.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                if (userData.lastDonated) {
                    const lastDonationDate = userData.lastDonated.toDate();
                    const today = new Date();
                    const daysSinceLastDonation = Math.floor((today.getTime() - lastDonationDate.getTime()) / (1000 * 60 * 60 * 24));
                    const daysRemaining = 60 - daysSinceLastDonation;

                    if (daysRemaining > 0) {
                        showAlert(
                            "Not Eligible Yet",
                            `You donated blood ${daysSinceLastDonation} days ago. You need to wait ${daysRemaining} more days before your next donation.\n\nYou can donate again after ${new Date(lastDonationDate.getTime() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`
                        );
                        return;
                    }
                }
            }
        } catch (error) {
            console.error("Error checking donation eligibility:", error);
        }

        const proceedWithDonation = async () => {
                        try {
                            const notificationPromise = addDoc(collection(db, "notifications"), {
                                recipientId: request.requesterId,
                                donorId: donorProfile.uid,
                                donorName: donorProfile.name,
                                donorContact: donorProfile.mobile,
                                requestId: request.id,
                                bloodGroup: request.bloodGroup,
                                hospital: request.hospital,
                                title: "🩸 Donor Available!",
                                message: `${donorProfile.name} is willing to donate ${request.bloodGroup} blood at ${request.hospital}. Contact: ${donorProfile.mobile}`,
                                status: "unread",
                                read: false,
                                type: "donation",
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

                            // Update acceptedDonors array in the request document
                            const requestRef = doc(db, 'requests', request.id);
                            const updatePromise = updateDoc(requestRef, {
                                acceptedDonors: [...(request.acceptedDonors || []), donorProfile.uid]
                            });

                            await Promise.all([notificationPromise, offerPromise, updatePromise]);
                            showAlert("Sent!", `${request.requesterName} has been notified. Check your History page for next steps.`);
                        } catch (error) {
                            console.error("Error creating notification/offer: ", error);
                            showAlert("Error", "Could not send notification. Please try again.");
                        }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Thank You for Your Offer!\n\nWe will notify ${request.requesterName || 'the requester'} about your willingness to donate.\n\nClick OK to proceed.`);
            if (confirmed) {
                await proceedWithDonation();
            }
        } else {
            showAlert(
                "Thank You for Your Offer!",
                `We will notify ${request.requesterName || 'the requester'} about your willingness to donate.`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "OK, Share",
                        onPress: proceedWithDonation
                    }
                ]
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.searchAndFilterContainer}>
                <View style={styles.searchBar}>
                    <Search size={scale(20)} color={palette.lightText} style={{ marginLeft: scale(10) }} />
                    <TextInput placeholder="Search by hospital, patient..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
                    <Mic size={scale(20)} color={palette.lightText} style={{ marginRight: scale(10) }} />
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
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={5}
                    windowSize={5}
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
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={8}
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
    modalContent: { width: '100%', backgroundColor: palette.cardBg, borderRadius: scale(10), overflow: 'hidden' },
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