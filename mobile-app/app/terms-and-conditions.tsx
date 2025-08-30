import React from 'react';
import {  Text, StyleSheet, SafeAreaView, ScrollView,  } from 'react-native';


const palette = { darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

export default function TermsAndConditionsScreen() {

    return (
        <SafeAreaView style={styles.safeArea}>
            
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.heading}>1. Acceptance of Terms</Text>
                <Text style={styles.paragraph}>By using the PU Blood Connect app, you agree to be bound by these Terms and Conditions.</Text>
                <Text style={styles.heading}>2. Disclaimer</Text>
                <Text style={styles.paragraph}>This app acts as a facilitator to connect blood donors and requesters. We do not verify medical information and are not responsible for any interactions or transactions between users. Users are responsible for their own safety and for verifying all information.</Text>
                <Text style={styles.heading}>3. User Conduct</Text>
                <Text style={styles.paragraph}>You agree to use the app responsibly and ethically. Misuse of contact information or any form of harassment is strictly prohibited and will result in account termination.</Text>
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
