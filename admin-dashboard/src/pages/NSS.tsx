// In src/pages/NSS.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Define a type for our user data
type Volunteer = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  phone?: string;
};

// Simple CSS-in-JS for styling
const styles = {
  container: { width: '100%' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b' },
  tabsContainer: { display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '20px' },
  tab: { padding: '10px 20px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' as '500', color: '#666' },
  activeTab: { borderBottom: '3px solid #d9324b', color: '#d9324b' },
  listContainer: { display: 'flex', flexDirection: 'column' as 'column', gap: '10px' },
  userCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  userInfo: { display: 'flex', flexDirection: 'column' as 'column' },
  userName: { fontWeight: '600' as '600', fontSize: '16px' },
  userDetails: { color: '#666' },
  approveButton: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' as '500' },
};

export default function NSS() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [pendingVolunteers, setPendingVolunteers] = useState<Volunteer[]>([]);
  const [approvedVolunteers, setApprovedVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch users who said "Yes" and have a "pending" status
      const pendingQuery = query(collection(db, 'users'), where('isNssVolunteer', '==', 'Yes'), where('nssStatus', '==', 'pending'));
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingData = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Volunteer[];
      setPendingVolunteers(pendingData);

      // Fetch users who are already approved
      const approvedQuery = query(collection(db, 'users'), where('nssStatus', '==', 'approved'));
      const approvedSnapshot = await getDocs(approvedQuery);
      const approvedData = approvedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Volunteer[];
      setApprovedVolunteers(approvedData);

    } catch (error) {
      console.error("Error fetching NSS volunteers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (userId: string) => {
    if (window.confirm("Are you sure you want to approve this volunteer?")) {
        const userDocRef = doc(db, 'users', userId);
        try {
            await updateDoc(userDocRef, { nssStatus: 'approved' });
            alert("Volunteer approved!");
            fetchData(); // Refresh both lists
        } catch (error) {
            console.error("Error approving volunteer:", error);
            alert("Failed to approve volunteer.");
        }
    }
  };

  if (loading) {
    return <div>Loading NSS data...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>NSS Volunteer Management</h1>
      <div style={styles.tabsContainer}>
        <div style={activeTab === 'pending' ? { ...styles.tab, ...styles.activeTab } : styles.tab} onClick={() => setActiveTab('pending')}>
          Pending Approval ({pendingVolunteers.length})
        </div>
        <div style={activeTab === 'approved' ? { ...styles.tab, ...styles.activeTab } : styles.tab} onClick={() => setActiveTab('approved')}>
          Approved Volunteers ({approvedVolunteers.length})
        </div>
      </div>

      {activeTab === 'pending' && (
        <div style={styles.listContainer}>
          {pendingVolunteers.map(user => (
            <div key={user.id} style={styles.userCard}>
              <div style={styles.userInfo}>
                <span style={styles.userName}>
                  {(user.firstName || user.lastName)
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : user.name}
                </span>
                <span style={styles.userDetails}>{user.department} - {user.phone}</span>
              </div>
              <button style={styles.approveButton} onClick={() => handleApprove(user.id)}>Approve</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'approved' && (
        <div style={styles.listContainer}>
          {approvedVolunteers.map(user => (
            <div key={user.id} style={styles.userCard}>
               <div style={styles.userInfo}>
                <span style={styles.userName}>
                  {(user.firstName || user.lastName)
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : user.name}
                </span>
                <span style={styles.userDetails}>{user.department} - {user.phone}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}