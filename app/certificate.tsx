import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { db } from '../firebase';
import * as MediaLibrary from 'expo-media-library';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', white: '#ffffff', certNameColor: '#000000ff', borderLight: '#EAEAEA' };

const CERTIFICATE_ASPECT_RATIO = 1.4;
const certificateWidth = screenWidth * 0.9; 
const certificateHeight = certificateWidth / CERTIFICATE_ASPECT_RATIO;


type DonationOffer = {
    id: string;
    donorName: string;
    confirmedDate: { toDate: () => Date };
};

export default function CertificateScreen() {
    const router = useRouter();
    const { offerId } = useLocalSearchParams<{ offerId: string }>();
    const viewShotRef = useRef<ViewShot>(null);

    const [offer, setOffer] = useState<DonationOffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!offerId) {
            Alert.alert("Error", "No donation record found.");
            router.back();
            return;
        }

        const fetchOffer = async () => {
            try {
                const docRef = doc(db, 'donationOffers', offerId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setOffer({ id: docSnap.id, ...docSnap.data() } as DonationOffer);
                } else {
                    Alert.alert("Error", "Could not find this donation record.");
                }
            } catch (error) {
                Alert.alert("Error", "Failed to load certificate.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchOffer();
    }, [offerId, router]);

    const handleDownload = useCallback(async () => {
        try {
            setDownloading(true);
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "We need permission to save photos to your device.");
                return;
            }
            const uri = await viewShotRef.current?.capture?.();
            if (!uri) throw new Error("Could not capture certificate.");
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert("Saved!", "Certificate saved to your photo gallery.");
        } catch (error) {
            Alert.alert("Error", "Could not save certificate.");
        } finally {
            setDownloading(false);
        }
    }, []);

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />;
    }

    if (!offer) {
        return <View style={styles.container}><Text>Donation record not found.</Text></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                    <ImageBackground 
                        source={require('../assets/images/certificate_template.png')} 
                        style={styles.certificateImage}
                        resizeMode="contain"
                    >
                        <Text style={styles.donorName}>{offer.donorName}</Text>
                        <Text style={styles.donationDate}>{offer.confirmedDate.toDate().toLocaleDateString()}</Text>
                    </ImageBackground>
                </ViewShot>
                <TouchableOpacity
                    style={[styles.downloadButton, downloading && { opacity: 0.7 }]}
                    onPress={handleDownload}
                    disabled={downloading}
                    accessibilityLabel="Download Certificate"
                >
                    <Text style={styles.downloadButtonText}>{downloading ? "Saving..." : "Download Certificate"}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: scale(20), 
        backgroundColor: '#f0f0f0' 
    },
    certificateImage: {
        width: certificateWidth,
        height: certificateHeight, 
        justifyContent: 'center',
        alignItems: 'center',
    },
    donorName: {
        position: 'absolute',
        top: '42%',
        fontSize: scale(18), 
        color: palette.certNameColor,
    },
    donationDate: {
        position: 'absolute',
        top: '79%', 
        left: '17%', 
        fontSize: scale(12), 
        color: palette.darkText,
    },
    downloadButton: {
        marginTop: scale(30),
        backgroundColor: palette.primaryRed,
        paddingVertical: scale(12),
        paddingHorizontal: scale(30),
        borderRadius: scale(8),
        alignItems: 'center',
    },
    downloadButtonText: {
        color: palette.white,
        fontWeight: 'bold',
        fontSize: scale(16),
    },
});