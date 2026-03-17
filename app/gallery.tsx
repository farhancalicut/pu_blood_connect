import { ImageIcon, Plus, Trash2 } from 'lucide-react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { showAlert } from '../utils/alert';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { requestMediaLibraryPermissionsAsync, launchImageLibraryAsync, MediaTypeOptions } from '../utils/imagePickerWeb';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type GalleryImage = {
    id: string;
    imageUrl: string;
    uploaderName: string;
    uploaderId: string;
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
            let q;
            try {
                // Try to fetch with ordering first
                q = query(collection(db, 'galleryImages'), orderBy('createdAt', 'desc'));
            } catch (indexError) {
                console.log('Index not available, fetching without ordering');
                // Fallback: fetch without ordering if index doesn't exist
                q = query(collection(db, 'galleryImages'));
            }
            
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                imageUrl: doc.data().imageUrl || '',
                uploaderName: doc.data().uploaderName || 'Anonymous',
                uploaderId: doc.data().uploaderId || '',
            }));
            console.log('Fetched gallery images:', data.length);
            setImages(data);
        } catch (error) {
            console.error("Error fetching images:", error);
            showAlert('Error', 'Could not load gallery images. Please try again.');
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
            showAlert('Login Required', 'Please log in to upload images.');
            return;
        }
        const { status } = await requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission Denied', 'Sorry, we need camera roll permissions.');
            return;
        }
        let result = await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images,
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
                showAlert('Upload Error', uploadResult.error || 'Failed to upload image');
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
            showAlert('Success', 'Image uploaded successfully!');
            fetchImages();
        } catch (error) {
            console.error("Error uploading image:", error);
            showAlert('Error', 'Could not upload your image.');
        } finally {
            setIsUploading(false);
        }
    }, [fetchImages]);

    const handleDeleteImage = useCallback(async (imageId: string, uploaderId: string) => {
        const user = getAuth().currentUser;
        if (!user) {
            showAlert('Login Required', 'Please log in to delete images.');
            return;
        }

        // Check if user owns the image
        if (user.uid !== uploaderId) {
            showAlert('Permission Denied', 'You can only delete your own images.');
            return;
        }

        // Confirm deletion
        const confirmDelete = Platform.OS === 'web' 
            ? window.confirm('Are you sure you want to delete this image?')
            : await new Promise<boolean>((resolve) => {
                showAlert(
                    'Delete Image',
                    'Are you sure you want to delete this image?',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
                    ]
                );
            });

        if (!confirmDelete) return;

        try {
            // Delete from Firestore
            await deleteDoc(doc(db, 'galleryImages', imageId));
            showAlert('Success', 'Image deleted successfully!');
            fetchImages();
        } catch (error) {
            console.error('Error deleting image:', error);
            showAlert('Error', 'Could not delete the image. Please try again.');
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
                        : <Plus size={scale(28)} color={palette.primaryRed} /> // Scaled icon size
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
                    renderItem={({ item }) => {
                        const user = getAuth().currentUser;
                        const canDelete = user && user.uid === item.uploaderId;
                        
                        return (
                            <View style={styles.imageContainer}>
                                <Image 
                                    source={{ uri: item.imageUrl }} 
                                    style={styles.image}
                                    resizeMode="cover"
                                    onError={(error) => {
                                        console.error('Image load error for:', item.imageUrl, error);
                                    }}
                                />
                                {canDelete && (
                                    <TouchableOpacity 
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteImage(item.id, item.uploaderId)}
                                    >
                                        <Trash2 size={scale(18)} color={palette.white} />
                                    </TouchableOpacity>
                                )}
                                <Text style={styles.uploaderName} numberOfLines={1}>by {item.uploaderName}</Text>
                            </View>
                        );
                    }}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ImageIcon size={scale(80)} color={palette.lightText} />
                            <Text style={styles.emptyText}>No images in the gallery yet.</Text>
                            <Text style={styles.emptySubText}>Be the first to add one!</Text>
                        </View>
                    }
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
    deleteButton: {
        position: 'absolute',
        top: scale(8),
        right: scale(8),
        backgroundColor: palette.primaryRed,
        borderRadius: scale(20),
        width: scale(36),
        height: scale(36),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    uploaderName: { 
        padding: scale(8), 
        fontSize: scale(12), 
        color: palette.lightText 
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(100),
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: scale(20), 
        color: palette.darkText, 
        fontSize: scale(18),
        fontWeight: '600',
    },
    emptySubText: {
        textAlign: 'center',
        marginTop: scale(8),
        color: palette.lightText,
        fontSize: scale(14),
    },
});
