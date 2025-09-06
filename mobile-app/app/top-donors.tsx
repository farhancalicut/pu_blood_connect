import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

// --- RESPONSIVE SETUP ---
const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; // Standard screen width to scale from

// This function scales sizes based on the screen width
const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', trophyYellow: '#FFC107', trophyBg: '#FFF2CC' };

type User = { id: string; firstName?: string; department?: string; totalDonates?: number; };
type DepartmentStat = { name: string; donorCount: number; totalUnits: number; };

const ListItem = ({ name, detail, action, isTrophy = false }: { name: string; detail?: string; action: React.ReactNode; isTrophy?: boolean }) => (
    <View style={styles.listItem}>
        <View style={[styles.itemIcon, { backgroundColor: isTrophy ? palette.trophyBg : '#EAEAEA' }]}>
            <Ionicons name={isTrophy ? "trophy" : "person"} size={scale(18)} color={isTrophy ? palette.trophyYellow : palette.primaryRed} />
        </View>
        <View style={styles.itemDetails}>
            <Text style={styles.itemTitle}>{String(name)}</Text>
            {detail ? <Text style={styles.itemSubtitle}>{String(detail)}</Text> : null}
        </View>
        <Text style={styles.itemAction}>{String(action)}</Text>
    </View>
);

export default function TopDonorsScreen() {
    // --- YOUR LOGIC (UNCHANGED) ---
    const [topStudents, setTopStudents] = useState<User[]>([]);
    const [topDepartments, setTopDepartments] = useState<DepartmentStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'department'>('students');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const studentsQuery = query(collection(db, 'users'), orderBy('totalDonates', 'desc'), limit(50));
            const studentsSnap = await getDocs(studentsQuery);
            setTopStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));

            const allUsersSnap = await getDocs(collection(db, 'users'));
            const deptStats: { [key: string]: { donorCount: number; totalUnits: number } } = {};
            allUsersSnap.forEach(doc => {
                const data = doc.data();
                if (data.department && data.totalDonates > 0) {
                    if (!deptStats[data.department]) deptStats[data.department] = { donorCount: 0, totalUnits: 0 };
                    deptStats[data.department].donorCount++;
                    deptStats[data.department].totalUnits += data.totalDonates;
                }
            });
            const statsArray = Object.keys(deptStats).map(name => ({ name, ...deptStats[name] }));
            statsArray.sort((a, b) => b.donorCount - a.donorCount || b.totalUnits - a.totalUnits);
            setTopDepartments(statsArray);
        } catch (error) {
            console.error("Error fetching top donors:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(()=>{fetchData();},[fetchData]));

    const dataToShow = activeTab === 'students' ? topStudents : topDepartments;
    
    // --- YOUR JSX (UNCHANGED) ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'students' && styles.activeTab]} onPress={() => setActiveTab('students')}><Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>Students</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'department' && styles.activeTab]} onPress={() => setActiveTab('department')}><Text style={[styles.tabText, activeTab === 'department' && styles.activeTabText]}>Department</Text></TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primaryRed} />
            ) : (
                <FlatList
                    data={dataToShow}
                    keyExtractor={(item: any) => item.id || item.name}
                    contentContainerStyle={styles.listContainer}
                    renderItem={({ item }) => (
                        activeTab === 'students' 
                        ? <ListItem name={(item as User).firstName || 'Anonymous'} detail={(item as User).department} action={`${(item as User).totalDonates} Units`} isTrophy />
                        : <ListItem name={(item as DepartmentStat).name} detail={`${(item as DepartmentStat).donorCount} Donors`} action={`${(item as DepartmentStat).totalUnits} Units`} isTrophy />
                    )}
                />
            )}
        </SafeAreaView>
    );
}

// --- RESPONSIVE STYLESHEET ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.white },
    tabContainer: { 
        flexDirection: 'row', 
        backgroundColor: "#f2f0f0", 
        borderRadius: scale(8), 
        margin: scale(15) 
    },
    tab: { 
        flex: 1, 
        padding: scale(10), 
        alignItems: "center", 
        borderRadius: scale(8) 
    },
    activeTab: { backgroundColor: "#e6e3ff" },
    tabText: { 
        fontSize: scale(14), 
        color: "#333" 
    },
    activeTabText: { 
        fontWeight: "bold", 
        color: "black" 
    },
    listContainer: { 
        paddingHorizontal: scale(15), 
        paddingBottom: scale(15) 
    },
    listItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: palette.white, 
        padding: scale(12), 
        borderRadius: scale(10), 
        marginBottom: scale(10), 
        elevation: 1 
    },
    itemIcon: { 
        width: scale(40), 
        height: scale(40), 
        borderRadius: scale(20), 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: scale(12) 
    },
    itemDetails: { flex: 1 },
    itemTitle: { 
        fontSize: scale(14), 
        fontWeight: '600', 
        color: palette.darkText 
    },
    itemSubtitle: { 
        fontSize: scale(12), 
        color: palette.lightText 
    },
    itemAction: { 
        fontWeight: '600', 
        fontSize: scale(16), 
        color: palette.primaryRed 
    },
});