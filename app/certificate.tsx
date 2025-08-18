import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import { db } from '../firebase';
import * as MediaLibrary from 'expo-media-library';

const palette = { primaryRed: '#9B0000', darkText: '#333333', white: '#ffffff', certNameColor: '#000000ff', borderLight: '#EAEAEA' };

type DonationOffer = {
    id: string;
    donorName: string;
    confirmedDate: { toDate: () => Date };
};

export default function CertificateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { offerId } = useLocalSearchParams<{ offerId: string }>();
    const viewShotRef = useRef<ViewShot>(null);

    const [offer, setOffer] = useState<DonationOffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!offerId) {
            Alert.alert("Error", "No donation record found.");
            router.back();
            return;
        }

        const fetchOffer = async () => {
            const docRef = doc(db, 'donationOffers', offerId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setOffer({ id: docSnap.id, ...docSnap.data() } as DonationOffer);
            } else {
                Alert.alert("Error", "Could not find this donation record.");
            }
            setIsLoading(false);
        };
        fetchOffer();
    }, [offerId]);
    const handleDownload = async () => {
        try {
            // Ask for permission to save to photos
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "We need permission to save photos to your device.");
                return;
            }

            // Capture the certificate view as an image
            const uri = await viewShotRef.current?.capture?.();
            if (!uri) throw new Error("Could not capture certificate.");

            // Save the image to the device's media library
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert("Saved!", "Certificate saved to your photo gallery.");

        } catch (error) {
            console.error("Error saving certificate:", error);
            Alert.alert("Error", "Could not save certificate.");
        }
    };
    
    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />;
    }

    if (!offer) {
        return <View><Text>Donation record not found.</Text></View>;
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
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f0f0f0' },
    certificateImage: {
        width: 350,
        height: 250, // Adjust aspect ratio as needed
        justifyContent: 'center',
        alignItems: 'center',
    },
    donorName: {
        position: 'absolute',
        top: '42%', // Tweak this value to move text up/down
        fontSize: 18,
        color: palette.certNameColor,
        
    },
    donationDate: {
        position: 'absolute',
        top: '79%', // Tweak this value
        left: '17%', // Tweak this value to move text left/right
        fontSize: 12,
        color: palette.darkText,
    },
});