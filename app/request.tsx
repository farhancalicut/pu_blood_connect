import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebase';
import { notifyUsersAboutBloodRequest } from '../utils/notifications';

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375;

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#FEF8F8' };

export default function RequestScreen() {
    const router = useRouter();
    const [patientName, setPatientName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [requiredDate, setRequiredDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [bloodGroup, setBloodGroup] = useState('');
    const [units, setUnits] = useState('');
    const [hospital, setHospital] = useState('');
    const [isCritical, setIsCritical] = useState(false);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [requesterInfo, setRequesterInfo] = useState({ uid: '', name: '', department: '' });

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setRequesterInfo({
                        uid: user.uid,
                        name: docSnap.data().name || [docSnap.data().firstName, docSnap.data().lastName].filter(Boolean).join(' ') || 'Anonymous',
                        department: docSnap.data().department || 'Unknown'
                    });
                }
            });
        }
    }, []);

    const handleSubmit = async () => {
        if (!patientName || !mobileNumber || !bloodGroup || !units || !hospital) {
            Alert.alert('Missing Information', 'Please fill out all required fields.');
            return;
        }
        setIsLoading(true);
        try {
            await addDoc(collection(db, 'requests'), {
                patientName,
                mobileNumber,
                requiredDate,
                bloodGroup,
                units: Number(units),
                hospital,
                isCritical,
                notes,
                requesterId: requesterInfo.uid,
                requesterName: requesterInfo.name,
                requesterDepartment: requesterInfo.department,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            
            // Send push notifications to users with matching blood group
            try {
                await notifyUsersAboutBloodRequest(
                    bloodGroup,
                    patientName,
                    hospital,
                    isCritical
                );
            } catch (notifError) {
                console.error('Error sending notifications:', notifError);
                // Don't fail the request submission if notifications fail
            }
            
            Alert.alert('Success', 'Your blood request has been sent.');
            router.back();
        } catch (error) {
            console.error("Error sending request: ", error);
            Alert.alert('Error', 'Could not send your request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || requiredDate;
        setShowDatePicker(Platform.OS === 'ios');
        setRequiredDate(currentDate);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.label}>Patient Name</Text>
                    <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Jane Doe" />
                    
                    <Text style={styles.label}>Mobile Number</Text>
                    <TextInput style={styles.input} value={mobileNumber} onChangeText={setMobileNumber} placeholder="0123456789" keyboardType="phone-pad" />
                    
                    <View style={styles.row}>
                        <View style={styles.halfWidth}>
                            <Text style={styles.label}>Required Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <View pointerEvents="none">
                                    <TextInput style={styles.input} value={requiredDate.toLocaleDateString()} editable={false} />
                                </View>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.halfWidth}>
                            <Text style={styles.label}>Blood Group</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={bloodGroup} onValueChange={(itemValue) => setBloodGroup(itemValue)} style={styles.picker}>
                                    <Picker.Item label="Select..." value="" />
                                    <Picker.Item label="A+" value="A+" /><Picker.Item label="A-" value="A-" />
                                    <Picker.Item label="B+" value="B+" /><Picker.Item label="B-" value="B-" />
                                    <Picker.Item label="AB+" value="AB+" /><Picker.Item label="AB-" value="AB-" />
                                    <Picker.Item label="O+" value="O+" /><Picker.Item label="O-" value="O-" />
                                </Picker>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.row}>
                        <View style={styles.halfWidth}>
                            <Text style={styles.label}>How many Units</Text>
                            <TextInput style={styles.input} value={units} onChangeText={setUnits} placeholder="e.g., 2" keyboardType="number-pad" />
                        </View>
                        <View style={styles.halfWidth}>
                            <Text style={styles.label}>Hospital</Text>
                            <TextInput style={styles.input} value={hospital} onChangeText={setHospital} placeholder="City Hospital" />
                        </View>
                    </View>

                    <View style={styles.switchRow}>
                        <Text style={styles.label}>Is it Critical?</Text>
                        <Switch trackColor={{ false: "#767577", true: "#C84B5B" }} thumbColor={palette.white} onValueChange={setIsCritical} value={isCritical} />
                    </View>

                    <Text style={styles.label}>Have any additional Notes?/Purpose</Text>
                    <TextInput style={[styles.input, styles.multilineInput]} value={notes} onChangeText={setNotes} multiline placeholder="e.g., for a scheduled surgery" />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => router.back()}>
                            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={isLoading}>
                            {isLoading ? <ActivityIndicator color={palette.white} /> : <Text style={styles.buttonText}>Sent Request</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            {showDatePicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={requiredDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    container: { padding: scale(20), backgroundColor: palette.pageBg },
    label: { 
        fontSize: scale(14), 
        color: palette.lightText, 
        marginBottom: scale(8), 
        fontWeight: '500' 
    },
    input: { 
        backgroundColor: palette.white, 
        borderWidth: 1, 
        borderColor: palette.borderLight, 
        borderRadius: scale(8), 
        padding: scale(12), 
        fontSize: scale(16), 
        color: palette.darkText, 
        marginBottom: scale(20),
        height: scale(50),
    },
    multilineInput: { 
        height: scale(100), 
        textAlignVertical: 'top' 
    },
    row: { 
        flexDirection: 'row', 
        justifyContent: 'space-between' 
    },
    halfWidth: { 
        width: '48%' 
    },
    switchRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: scale(20) 
    },
    pickerContainer: { 
        borderWidth: 1, 
        borderColor: palette.borderLight, 
        borderRadius: scale(8), 
        backgroundColor: palette.white, 
        justifyContent: 'center',
        height: scale(50),
    },
    picker: { 
        height: scale(50) 
    },
    buttonRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: scale(20) 
    },
    button: { 
        flex: 1, 
        padding: scale(15), 
        borderRadius: scale(8), 
        alignItems: 'center' 
    },
    cancelButton: { 
        borderWidth: 1, 
        borderColor: palette.primaryRed, 
        marginRight: scale(10) 
    },
    submitButton: { 
        backgroundColor: palette.primaryRed, 
        marginLeft: scale(10) 
    },
    buttonText: { 
        color: palette.white, 
        fontSize: scale(16), 
        fontWeight: 'bold' 
    },
    cancelButtonText: { 
        color: palette.primaryRed 
    },
});