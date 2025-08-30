import React, {useState,useCallback,useEffect}   from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter, useFocusEffect,useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import * as ImagePicker from 'expo-image-picker';

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

type GalleryImage = {
    id: string;
    imageUrl: string;
    uploaderName: string;
};

export default function GalleryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false); // For the upload indicator

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

    const handleAddImage = async () => {
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
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 4],
            quality: 0.7,
        });

        if (result.canceled) {
            return; 
        }

        setIsUploading(true);
        try {
            const imageUri = result.assets[0].uri;
            
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const storageRef = ref(storage, `gallery_images/${user.uid}-${Date.now()}.jpg`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const uploaderName = userDoc.exists() ? (userDoc.data().name || `${userDoc.data().firstName} ${userDoc.data().lastName}`.trim()) : 'Anonymous';

            await addDoc(collection(db, 'galleryImages'), {
                imageUrl: downloadURL,
                caption: '', // Caption can be added later if needed
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
    };

  useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity 
                    onPress={handleAddImage} 
                    disabled={isUploading} 
                    style={{ marginRight: 15 }}
                >
                    {isUploading 
                        ? <ActivityIndicator size="small" color={palette.primaryRed} />
                        : <Ionicons name="add-circle" size={28} color={palette.primaryRed} />
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
    listContainer: { padding: 5, backgroundColor: palette.pageBg },
    imageContainer: { flex: 1/2, margin: 5, backgroundColor: palette.white, borderRadius: 8, overflow: 'hidden', elevation: 2 },
    image: { width: '100%', height: 180 },
    uploaderName: { padding: 8, fontSize: 12, color: palette.lightText },
    emptyText: { textAlign: 'center', marginTop: 50, color: palette.lightText, fontSize: 16 },
});