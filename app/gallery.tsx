import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { uploadImageToCloudinary } from '../utils/cloudinary';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type GalleryImage = {
    id: string;
    imageUrl: string;
    uploaderName: string;
};

export default function GalleryScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const fetchImages = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'galleryImages'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
            setImages(data);
        } catch (error) {
            console.error("Error fetching images:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useFocusEffect(
        useCallback(() => {
            fetchImages();
        }, [fetchImages])
    );

    const handleAddImage = useCallback(async () => {
        const user = getAuth().currentUser;
        if (!user) {
            Alert.alert("Please log in to upload images.");
            return;
        }
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 4],
            quality: 0.6, // Reduced quality to help keep under 500KB
        });

        if (result.canceled) {
            return; 
        }

        setIsUploading(true);
        try {
            const imageUri = result.assets[0].uri;
            
            // Upload image to Cloudinary
            const uploadResult = await uploadImageToCloudinary(imageUri, 'gallery_images');
            
            if (!uploadResult.success) {
                Alert.alert('Upload Error', uploadResult.error || 'Failed to upload image');
                setIsUploading(false);
                return;
            }
            
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const uploaderName = userDoc.exists() ? (userDoc.data().name || `${userDoc.data().firstName} ${userDoc.data().lastName}`.trim()) : 'Anonymous';
            await addDoc(collection(db, 'galleryImages'), {
                imageUrl: uploadResult.url,
                caption: '',
                uploaderId: user.uid,
                uploaderName: uploaderName,
                createdAt: serverTimestamp(),
            });
            fetchImages();
        } catch (error) {
            console.error("Error uploading image:", error);
            Alert.alert('Error', 'Could not upload your image.');
        } finally {
            setIsUploading(false);
        }
    }, [fetchImages]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity 
                    onPress={handleAddImage} 
                    disabled={isUploading} 
                    style={{ marginRight: scale(15) }}
                >
                    {isUploading 
                        ? <ActivityIndicator size="small" color={palette.primaryRed} />
                        : <Ionicons name="add-circle" size={scale(28)} color={palette.primaryRed} /> // Scaled icon size
                    }
                </TouchableOpacity>
            ),
        });
    }, [isUploading, navigation, handleAddImage]);
    
    return (
        <SafeAreaView style={styles.safeArea}>
            {isLoading && images.length === 0 ? (
                <ActivityIndicator style={{flex: 1}} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={images}
                    numColumns={2}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: item.imageUrl }} style={styles.image} />
                            <Text style={styles.uploaderName} numberOfLines={1}>by {item.uploaderName}</Text>
                        </View>
                    )}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>No images in the gallery yet. Be the first to add one!</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    listContainer: { padding: scale(5), backgroundColor: palette.pageBg },
    imageContainer: { 
        flex: 1/2, 
        margin: scale(5), 
        backgroundColor: palette.white, 
        borderRadius: scale(8), 
        overflow: 'hidden', 
        elevation: 2 
    },
    image: { 
        width: '100%', 
        height: scale(180) 
    },
    uploaderName: { 
        padding: scale(8), 
        fontSize: scale(12), 
        color: palette.lightText 
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: scale(50), 
        color: palette.lightText, 
        fontSize: scale(16) 
    },
});