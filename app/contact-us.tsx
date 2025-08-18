import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

export default function ContactUsScreen() {

    return (
        <SafeAreaView style={styles.safeArea}>
            
            <View style={styles.container}>
                <Text style={styles.heading}>Get in Touch</Text>
                <Text style={styles.paragraph}>If you have any questions or require assistance, please feel free to contact us.</Text>
                
                <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={24} color={palette.primaryRed} />
                    <Text style={styles.contactText}>contact@publoodconnect.edu</Text>
                </View>
                <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={24} color={palette.primaryRed} />
                    <Text style={styles.contactText}>+91-413-1234567</Text>
                </View>
                <View style={styles.contactRow}>
                    <Ionicons name="location-outline" size={24} color={palette.primaryRed} />
                    <Text style={styles.contactText}>PU Blood Donation Unit, Puducherry University, Puducherry</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
   
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    container: { padding: 20 },
    heading: { fontSize: 22, fontWeight: 'bold', color: palette.darkText, marginBottom: 10 },
    paragraph: { fontSize: 16, color: palette.lightText, lineHeight: 24, marginBottom: 30 },
    contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    contactText: { fontSize: 16, color: palette.darkText, marginLeft: 15, flex: 1 },
});