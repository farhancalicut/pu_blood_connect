import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, FlatList, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', green: '#28a745', yellow: '#ffc107' };

type Submission = {
    id: string;
    donorName: string;
    donorId: string;
    confirmedUnits: number;
    confirmedDate: { toDate: () => Date };
    certificateUrl: string;
    bloodGroup: string;
    hospital: string;
};

const SubmissionCard = React.memo(({ item, onApprove, onReject, processingId }: { item: Submission, onApprove: () => void, onReject: () => void, processingId: string | null }) => (
    <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.donorName}</Text>
        <Text style={styles.cardText}>Units Donated: {item.confirmedUnits}</Text>
        <TouchableOpacity onPress={() => Alert.alert("Certificate", "Viewing the certificate image will be implemented next.")}>
            <Text style={styles.viewCertificateLink}>View Certificate</Text>
        </TouchableOpacity>
        <View style={styles.buttonRow}>
            <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton, processingId === item.id && { opacity: 0.6 }]}
                onPress={onReject}
                disabled={processingId === item.id}
                accessibilityLabel="Reject Submission"
            >
                <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionButton, styles.approveButton, processingId === item.id && { opacity: 0.6 }]}
                onPress={onApprove}
                disabled={processingId === item.id}
                accessibilityLabel="Approve Submission"
            >
                <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
        </View>
    </View>
));

export default function AdminScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const checkAdminStatusAndFetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                router.replace('/login');
                return;
            }
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().role === 'admin') {
                setIsAdmin(true);
                const submissionsQuery = query(
                    collection(db, 'donationOffers'),
                    where('status', '==', 'credentials_submitted')
                );
                const querySnapshot = await getDocs(submissionsQuery);
                const subs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
                setSubmissions(subs);
            } else {
                Alert.alert("Access Denied", "You do not have permission to view this page.");
                router.replace('/dashboard');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch admin data.');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            checkAdminStatusAndFetchData();
        }, [checkAdminStatusAndFetchData])
    );

    const handleApprove = useCallback(async (submission: Submission) => {
        setProcessingId(submission.id);
        try {
            const offerDocRef = doc(db, 'donationOffers', submission.id);
            const userDocRef = doc(db, 'users', submission.donorId);
            const donorDocSnap = await getDoc(userDocRef);
            if (!donorDocSnap.exists()) {
                throw new Error("Donor user profile not found!");
            }
            const donorDepartment = donorDocSnap.data().department || 'N/A';

            await updateDoc(offerDocRef, { status: 'completed' });

            await updateDoc(userDocRef, {
                totalDonates: increment(submission.confirmedUnits),
                lastDonated: submission.confirmedDate
            });
            await addDoc(collection(db, "donations"), {
                donorName: submission.donorName,
                donorId: submission.donorId,
                department: donorDepartment,
                units: submission.confirmedUnits,
                bloodGroup: submission.bloodGroup,
                hospital: submission.hospital,
                date: submission.confirmedDate,
                createdAt: serverTimestamp(),
            });

            Alert.alert('Success', `${submission.donorName}'s donation has been approved.`);
            checkAdminStatusAndFetchData();
        } catch (error) {
            Alert.alert('Error', 'Could not approve the submission.');
        } finally {
            setProcessingId(null);
        }
    }, [checkAdminStatusAndFetchData]);

    const handleReject = useCallback(async (submission: Submission) => {
        setProcessingId(submission.id);
        try {
            const offerDocRef = doc(db, 'donationOffers', submission.id);
            await updateDoc(offerDocRef, { status: 'rejected' });
            Alert.alert('Success', `${submission.donorName}'s donation has been rejected.`);
            checkAdminStatusAndFetchData();
        } catch (error) {
            Alert.alert('Error', 'Could not reject the submission.');
        } finally {
            setProcessingId(null);
        }
    }, [checkAdminStatusAndFetchData]);

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />;
    }
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                data={submissions}
                keyExtractor={item => item.id}
                renderItem={({ item }) =>
                    <SubmissionCard
                        item={item}
                        onApprove={() => handleApprove(item)}
                        onReject={() => handleReject(item)}
                        processingId={processingId}
                    />
                }
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={<Text style={styles.listHeader}>Pending Approvals</Text>}
                ListEmptyComponent={<Text style={styles.emptyText}>No credentials are waiting for approval.</Text>}
                extraData={processingId}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    listContainer: { padding: scale(15), backgroundColor: palette.pageBg },
    listHeader: { 
        fontSize: scale(20), 
        fontWeight: 'bold', 
        color: palette.darkText, 
        marginBottom: scale(15) 
    },
    card: { 
        backgroundColor: palette.white, 
        borderRadius: scale(8), 
        padding: scale(15), 
        marginBottom: scale(15), 
        borderWidth: 1, 
        borderColor: palette.borderLight 
    },
    cardTitle: { 
        fontSize: scale(16), 
        fontWeight: 'bold', 
        color: palette.darkText 
    },
    cardText: { 
        fontSize: scale(14), 
        color: palette.lightText, 
        marginTop: scale(4) 
    },
    viewCertificateLink: { 
        color: palette.primaryRed, 
        marginVertical: scale(10), 
        textDecorationLine: 'underline',
        fontSize: scale(14)
    },
    buttonRow: { 
        flexDirection: 'row', 
        justifyContent: 'flex-end', 
        marginTop: scale(10), 
        gap: scale(10) 
    },
    actionButton: { 
        paddingVertical: scale(8), 
        paddingHorizontal: scale(20), 
        borderRadius: scale(6) 
    },
    approveButton: { backgroundColor: palette.green },
    rejectButton: { backgroundColor: palette.yellow },
    actionButtonText: { 
        color: palette.white, 
        fontWeight: 'bold',
        fontSize: scale(14)
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: scale(50), 
        color: palette.lightText, 
        fontSize: scale(16) 
    }
});