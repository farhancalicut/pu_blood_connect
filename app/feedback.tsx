// app/feedback.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Make sure this path is correct

const palette = {
    primaryRed: '#9B0000',
    darkText: '#333333',
    lightText: '#8A8A8A',
    white: '#ffffff',
    borderLight: '#EAEAEA',
    trophyYellow: '#FFC107',
};

const FeedbackScreen = () => {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [userDepartment, setUserDepartment] = useState('');

    useEffect(() => {
        // Fetch current user's name and department to attach to the feedback
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setUserName(docSnap.data().name || 'Anonymous');
                    setUserDepartment(docSnap.data().department || 'Unknown Department');
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
            await addDoc(collection(db, 'testimonials'), {
                donorName: userName,
                department: userDepartment,
                rating: rating,
                text: comment,
                createdAt: serverTimestamp(),
            });
            
            Alert.alert('Thank You!', 'Your feedback has been submitted successfully.');
            router.back(); // Go back to the dashboard

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
                
                {/* Star Rating */}
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Ionicons 
                                name={star <= rating ? 'star' : 'star-outline'} 
                                size={40} 
                                color={palette.trophyYellow} 
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Comment Box */}
                <TextInput
                    style={styles.textInput}
                    placeholder="Share more details about your experience..."
                    multiline
                    value={comment}
                    onChangeText={setComment}
                />

                {/* Submit Button */}
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
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        color: palette.darkText,
        marginBottom: 20,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
        gap: 15,
    },
    textInput: {
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.borderLight,
        borderRadius: 10,
        padding: 15,
        height: 120,
        textAlignVertical: 'top',
        fontSize: 16,
        color: palette.darkText,
        marginBottom: 30,
    },
    submitButton: {
        backgroundColor: palette.primaryRed,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    submitButtonText: {
        color: palette.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default FeedbackScreen;