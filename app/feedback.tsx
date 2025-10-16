import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = {
    primaryRed: '#9B0000',
    darkText: '#333333',
    lightText: '#8A8A8A',
    white: '#ffffff',
    borderLight: '#EAEAEA',
    trophyYellow: '#FFC107',
};

export default function FeedbackScreen() {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [userDepartment, setUserDepartment] = useState('');

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const fullName = data.name || `${data.firstName} ${data.lastName}`.trim();
                    setUserName(fullName || 'Anonymous');
                    setUserDepartment(data.department || 'Unknown Department');
                }
            });
        }
    }, []);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please select a star rating before submitting.');
            return;
        }
        setIsLoading(true);
        try {
            await addDoc(collection(db, 'feedback'), {
                userName: userName,
                department: userDepartment,
                rating: rating,
                comment: comment,
                status: 'new',
                priority: 'medium',
                category: 'general',
                createdAt: serverTimestamp(),
            });
            Alert.alert('Thank You!', 'Your feedback has been submitted successfully.');
            router.back(); 
        } catch (error) {
            console.error("Error submitting feedback: ", error);
            Alert.alert('Error', 'Could not submit your feedback. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <Text style={styles.title}>How was your experience?</Text>
                
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Ionicons 
                                name={star <= rating ? 'star' : 'star-outline'} 
                                size={scale(40)} 
                                color={palette.trophyYellow} 
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    style={styles.textInput}
                    placeholder="Share more details about your experience..."
                    multiline
                    value={comment}
                    onChangeText={setComment}
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color={palette.white} />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit Feedback</Text>
                    )}
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    container: {
        flex: 1,
        padding: scale(20),
        justifyContent: 'center',
    },
    title: {
        fontSize: scale(22),
        fontWeight: 'bold',
        textAlign: 'center',
        color: palette.darkText,
        marginBottom: scale(20),
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: scale(30),
        gap: scale(15),
    },
    textInput: {
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.borderLight,
        borderRadius: scale(10),
        padding: scale(15),
        height: scale(120),
        textAlignVertical: 'top',
        fontSize: scale(16),
        color: palette.darkText,
        marginBottom: scale(30),
    },
    submitButton: {
        backgroundColor: palette.primaryRed,
        padding: scale(15),
        borderRadius: scale(10),
        alignItems: 'center',
    },
    submitButtonText: {
        color: palette.white,
        fontSize: scale(18),
        fontWeight: 'bold',
    },
});