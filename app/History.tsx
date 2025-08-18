import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, FlatList,Share 
} from "react-native";
import {  MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth } from "firebase/auth";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";

type DonationOffer = {
    id: string;
    hospital: string;
    bloodGroup: string;
    status: 'offered' | 'credentials_submitted' | 'completed' | 'rejected';
    createdAt: { toDate: () => Date };
};

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
            {/* 3. Connect the Share button to the new function */}
            <TouchableOpacity style={styles.share} onPress={handleShareDonation}>
                <Text style={styles.shareText}>Share</Text>
                <MaterialCommunityIcons name="share-all-outline" size={16} color="black" />
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
      

      {/* Tabs */}
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
    borderRadius: 8,
    margin: 10,
    marginHorizontal:16,
    marginTop:20
  },
  tab: { flex: 1, padding: 10, alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: "#e6e3ff" },
  tabText: { fontSize: 14, color: "#333" },
  activeTabText: { fontWeight: "bold", color: "black" },
  card: {
    backgroundColor: "#EDEDED",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems: 'center'
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  cardActions: {
    alignItems: 'flex-end',
  },
  certificate: {
    color: "#B71C1C",
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 10,
  },
  share: {
    flexDirection: "row",
    alignItems: "center",
  },
  shareText: {
    marginRight: 4,
    fontSize: 12,
    color: "#333",
    fontWeight: "bold",
  },
  pendingStatus: {
    color: "#555",
    fontWeight: "500",
    fontSize: 12,
  },
  actionableText: {
      color: '#3478f6', // A blue color to indicate it's tappable
      fontWeight: 'bold',
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 50,
      fontSize: 16,
      color: '#555',
  }
});
