import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

export default function ContactUsScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.heading}>Get in Touch</Text>
                <Text style={styles.paragraph}>If you have any questions or require assistance, please feel free to contact us.</Text>
                
                <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={scale(24)} color={palette.primaryRed} />
                    <Text style={styles.contactText}>contact@publoodconnect.edu</Text>
                </View>
                <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={scale(24)} color={palette.primaryRed} />
                    <Text style={styles.contactText}>+91-413-1234567</Text>
                </View>
                <View style={styles.contactRow}>
                    <Ionicons name="location-outline" size={scale(24)} color={palette.primaryRed} />
                    <Text style={styles.contactText}>PU Blood Donation Unit, Puducherry University, Puducherry</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: palette.white 
    },
    container: { 
        padding: scale(20) 
    },
    heading: { 
        fontSize: scale(22), 
        fontWeight: 'bold', 
        color: palette.darkText, 
        marginBottom: scale(10) 
    },
    paragraph: { 
        fontSize: scale(16), 
        color: palette.lightText, 
        lineHeight: scale(24), 
        marginBottom: scale(30) 
    },
    contactRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: scale(20) 
    },
    contactText: { 
        fontSize: scale(16), 
        color: palette.darkText, 
        marginLeft: scale(15), 
        flex: 1 
    },
});