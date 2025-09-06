import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Collapsible from 'react-native-collapsible';

// --- RESPONSIVE SETUP ---
const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; // Standard screen width to scale from

// This function scales sizes based on the screen width
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7' };

const FAQ_DATA = [
    {
        section: "General Blood Donation",
        questions: [
            {
                q: "Who can donate blood?",
                a: "Most healthy adults can donate. General requirements include being at least 18 years old, weighing at least 50 kg, and being in good overall health. The final decision is made by the medical staff at the donation center."
            },
            {
                q: "How often can I donate blood?",
                a: "You can typically donate whole blood once every 3 months (or 12 weeks). This interval allows your body to fully replenish its red blood cell count."
            },
            {
                q: "Is donating blood safe?",
                a: "Yes. All equipment, including the needle, is sterile, new, and used only once for your donation before being discarded. You cannot get any diseases from donating blood."
            },
            {
                q: "What should I do before donating?",
                a: "Make sure to get a good night's sleep, eat a healthy meal (avoiding fatty foods), and drink plenty of water before your donation. Bring a valid photo ID with you."
            },
        ]
    },
    {
        section: "About The App",
        questions: [
            {
                q: "How do I request blood?",
                a: "From the Dashboard, tap the 'Request' button. Fill in all the required details for the patient, including the hospital and blood group, and submit the form."
            },
            {
                q: "How do I offer to donate?",
                a: "Go to the 'Donate' page to see a list of active requests. When you find one you can help with, tap the 'Donate' button to notify the requester of your willingness to help."
            },
            {
                q: "What happens after I offer to donate?",
                a: "After you offer, you will coordinate the donation directly. Once you have donated, go to your 'History' page, find the pending offer, and tap 'Upload Credential' to submit proof of your donation for verification."
            },
            {
                q: "Is my personal information safe?",
                a: "Yes. Your contact information is only shared with a requester after you explicitly tap the 'Donate' button for their specific request. We are committed to protecting your privacy."
            }
        ]
    }
];

const FaqItem = ({ item }: { item: { q: string, a: string } }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    return (
        <View style={styles.faqItemContainer}>
            <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)}>
                <View style={styles.questionContainer}>
                    <Text style={styles.questionText}>{item.q}</Text>
                    <Ionicons name={isCollapsed ? 'chevron-down-outline' : 'chevron-up-outline'} size={scale(20)} color={palette.lightText} />
                </View>
            </TouchableOpacity>
            <Collapsible collapsed={isCollapsed}>
                <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{item.a}</Text>
                </View>
            </Collapsible>
        </View>
    );
};

export default function FaqScreen() {
    // --- YOUR JSX (UNCHANGED) ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {FAQ_DATA.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.section}</Text>
                        {section.questions.map((item, qIndex) => (
                            <FaqItem key={qIndex} item={item} />
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

// --- RESPONSIVE STYLESHEET ---
const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: palette.white, 
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
    },
    container: { 
        padding: scale(15), 
        backgroundColor: palette.pageBg 
    },
    section: { 
        marginBottom: scale(20) 
    },
    sectionTitle: { 
        fontSize: scale(20), 
        fontWeight: 'bold', 
        color: palette.darkText, 
        marginBottom: scale(10), 
        paddingHorizontal: scale(5) 
    },
    faqItemContainer: { 
        backgroundColor: palette.white, 
        borderRadius: scale(10), 
        marginBottom: scale(10), 
        borderWidth: 1, 
        borderColor: palette.borderLight 
    },
    questionContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: scale(15) 
    },
    questionText: { 
        flex: 1, 
        fontSize: scale(16), 
        fontWeight: '500', 
        color: palette.darkText, 
        marginRight: scale(10) 
    },
    answerContainer: { 
        paddingHorizontal: scale(15), 
        paddingBottom: scale(15), 
        borderTopWidth: 1, 
        borderTopColor: palette.borderLight 
    },
    answerText: { 
        fontSize: scale(14), 
        color: palette.lightText, 
        lineHeight: scale(22), 
        paddingTop: scale(10) 
    },
});