import React from 'react';
import {  Text, StyleSheet, SafeAreaView, ScrollView, } from 'react-native';


const palette = { darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

export default function PrivacyPolicyScreen() {

    return (
        <SafeAreaView style={styles.safeArea}>
            
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.paragraph}>Last updated: August 15, 2025</Text>
                <Text style={styles.heading}>1. Information We Collect</Text>
                <Text style={styles.paragraph}>We collect information you provide directly to us when you create an account, such as your name, email, department, blood group, and phone number. This information is essential for the app to function.</Text>
                <Text style={styles.heading}>2. How We Use Your Information</Text>
                <Text style={styles.paragraph}>Your information is used solely to facilitate blood donation connections. Your name and contact details may be shared with a requester if you offer to donate, or with a potential donor if you make a request.</Text>
                <Text style={styles.heading}>3. Data Security</Text>
                <Text style={styles.paragraph}>We take reasonable measures to protect your personal information from loss, theft, misuse, and unauthorized access.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
   
    container: { padding: 20 },
    heading: { fontSize: 18, fontWeight: 'bold', color: palette.darkText, marginTop: 20, marginBottom: 10 },
    paragraph: { fontSize: 15, color: palette.lightText, lineHeight: 22 },
});