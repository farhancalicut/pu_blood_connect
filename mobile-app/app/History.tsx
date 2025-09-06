import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, FlatList, Share, Dimensions
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { getAuth } from "firebase/auth";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const { width: screenWidth } = Dimensions.get('window');
const guidelineBaseWidth = 375; 

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;

const palette = { primaryRed: '#9B0000', darkText: '#333333', lightText: '#8A8A8A', white: '#ffffff', borderLight: '#EAEAEA', pageBg: '#F7F7F7', green: '#28a745', yellow: '#ffc107' };

type DonationOffer = {
    id: string;
    hospital: string;
    bloodGroup: string;
    status: 'offered' | 'credentials_submitted' | 'completed' | 'rejected';
    createdAt: { toDate: () => Date };
};

export default function HistoryScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("Donated");
    const [isLoading, setIsLoading] = useState(true);
    const [allOffers, setAllOffers] = useState<DonationOffer[]>([]);
    const auth = getAuth();
    const user = auth.currentUser;

    const fetchHistory = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'donationOffers'),
                where('donorId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationOffer));
            setAllOffers(data);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);
    
    useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

    const pendingOffers = useMemo(() => allOffers.filter(o => o.status === 'offered' || o.status === 'credentials_submitted'), [allOffers]);
    const donatedOffers = useMemo(() => allOffers.filter(o => o.status === 'completed'), [allOffers]);

    const renderDonatedItem = ({ item }: { item: DonationOffer }) => {
        const handleShareDonation = async () => {
            try {
                const message = `I'm proud to have donated ${item.bloodGroup} blood at ${item.hospital} on ${item.createdAt.toDate().toLocaleDateString()} through the PU Blood Connect app! #DonateBloodSaveLives`;
                await Share.share({ message });
            } catch (error) {
                console.error("Error sharing donation:", error);
            }
        };
        
        return (
            <View key={item.id} style={styles.card}>
                <View>
                    <Text style={styles.cardTitle}>Donation on: {item.createdAt.toDate().toLocaleDateString()}</Text>
                    <Text style={styles.cardText}>Blood: {item.bloodGroup}</Text>
                    <Text style={styles.cardText}>Location: {item.hospital}</Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/certificate', params: { offerId: item.id } })}>
                        <Text style={styles.certificate}>Get Certificate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.share} onPress={handleShareDonation}>
                        <Text style={styles.shareText}>Share</Text>
                        <MaterialCommunityIcons name="share-all-outline" size={scale(16)} color="black" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderPendingItem = ({ item }: { item: DonationOffer }) => {
        const statusText = item.status === 'offered' ? "Upload Your Credential" : "Under Verification";
        const isActionable = item.status === 'offered';

        return (
            <View style={styles.card}>
                <View>
                    <Text style={styles.cardTitle}>Offer on: {item.createdAt.toDate().toLocaleDateString()}</Text>
                    <Text style={styles.cardText}>Blood: {item.bloodGroup}</Text>
                    <Text style={styles.cardText}>Location: {item.hospital}</Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity disabled={!isActionable} onPress={() => isActionable && router.push({ pathname: '/upload-credential', params: { offerId: item.id }})}>
                        <Text style={[styles.pendingStatus, isActionable && styles.actionableText]}>{statusText}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "Donated" && styles.activeTab]}
                    onPress={() => setActiveTab("Donated")}
                >
                    <Text style={[ styles.tabText, activeTab === "Donated" && styles.activeTabText, ]}>
                        Donated
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "Pending" && styles.activeTab]}
                    onPress={() => setActiveTab("Pending")}
                >
                    <Text style={[ styles.tabText, activeTab === "Pending" && styles.activeTabText, ]}>
                        Pending
                    </Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color="#B71C1C" />
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={activeTab === 'Donated' ? donatedOffers : pendingOffers}
                    renderItem={activeTab === 'Donated' ? renderDonatedItem : renderPendingItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text style={styles.emptyText}>No {activeTab} history found.</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf6f6" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f2f0f0",
    borderRadius: scale(8),
    margin: scale(10),
    marginHorizontal: scale(16),
    marginTop: scale(20)
  },
  tab: { 
    flex: 1, 
    padding: scale(10), 
    alignItems: "center", 
    borderRadius: scale(8) 
  },
  activeTab: { backgroundColor: "#e6e3ff" },
  tabText: { fontSize: scale(14), color: "#333" },
  activeTabText: { fontWeight: "bold", color: "black" },
  card: {
    backgroundColor: "#EDEDED",
    marginHorizontal: scale(16),
    marginVertical: scale(8),
    padding: scale(16),
    borderRadius: scale(14),
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems: 'center'
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: scale(13),
    marginBottom: scale(4),
  },
  cardText: {
    fontSize: scale(12),
    color: "#555",
    marginTop: scale(2),
  },
  cardActions: {
    alignItems: 'flex-end',
  },
  certificate: {
    color: "#B71C1C",
    fontWeight: "bold",
    fontSize: scale(12),
    marginBottom: scale(10),
  },
  share: {
    flexDirection: "row",
    alignItems: "center",
  },
  shareText: {
    marginRight: scale(4),
    fontSize: scale(12),
    color: "#333",
    fontWeight: "bold",
  },
  pendingStatus: {
    color: "#555",
    fontWeight: "500",
    fontSize: scale(12),
  },
  actionableText: {
    color: '#3478f6', 
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: scale(50),
    fontSize: scale(16),
    color: '#555',
  }
});