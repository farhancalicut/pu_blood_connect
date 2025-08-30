// In src/pages/Donations.tsx

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define a type for our donation data
type Donation = {
  id: string;
  donorName: string;
  bloodGroup: string;
  units: number;
  date: {
    toDate: () => Date;
  };
};

// Define a type for our chart data
type BloodGroupData = {
  name: string;
  value: number;
};

// Define some colors for our pie chart
const COLORS = ['#d9324b', '#ff6b6b', '#ff8e8e', '#ffb3b3', '#4a4a4a', '#7b7b7b', '#a4a4a4', '#cccccc'];

const styles = {
    container: { width: '100%' },
    title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' },
    layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'flex-start' },
    statsContainer: { display: 'flex', flexDirection: 'column' as 'column', gap: '20px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    statNumber: { fontSize: '32px', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b' },
    statLabel: { fontSize: '16px', color: '#64748b' }, // Darker gray for label
    chartContainer: { height: '350px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    tableContainer: { gridColumn: 'span 2', marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' as 'collapse' },
    th: { 
      borderBottom: '2px solid #ddd', 
      padding: '12px', 
      textAlign: 'left' as 'left', 
      backgroundColor: '#f8f8f8',
      color: '#334155', // Darker color for table headers
      fontWeight: '600' as '600', // Bolder font for headers
    },
    td: { borderBottom: '1px solid #ddd', padding: '12px', color: '#334155' }, // Darker color for table data
};

export default function Donations() {
  const [stats, setStats] = useState({ donationCount: 0, totalUnits: 0 });
  const [bloodGroupData, setBloodGroupData] = useState<BloodGroupData[]>([]);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const donationsQuery = query(collection(db, 'donations'), orderBy('date', 'desc'));
        const donationSnapshot = await getDocs(donationsQuery);
        const donations = donationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Donation[];

        // Calculate stats
        const donationCount = donations.length;
        const totalUnits = donations.reduce((sum, doc) => sum + (doc.units || 1), 0);
        setStats({ donationCount, totalUnits });

        // Process data for pie chart
        const bloodGroupCounts: { [key: string]: number } = {};
        donations.forEach(doc => {
          const bg = doc.bloodGroup;
          if (bg) {
            bloodGroupCounts[bg] = (bloodGroupCounts[bg] || 0) + (doc.units || 1);
          }
        });
        const chartData = Object.keys(bloodGroupCounts).map(bgName => ({
          name: bgName,
          value: bloodGroupCounts[bgName],
        }));
        setBloodGroupData(chartData);
        
        // Get the 5 most recent donations for the table
        setRecentDonations(donations.slice(0, 5));

      } catch (error) {
        console.error("Error fetching donations data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading donations data...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Donations Data</h1>
      <div style={styles.layout}>
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.donationCount}</div>
            <div style={styles.statLabel}>Total Donations</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.totalUnits}</div>
            <div style={styles.statLabel}>Total Units Collected</div>
          </div>
        </div>
        <div style={styles.chartContainer}>
          <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Units by Blood Group</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={bloodGroupData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {bloodGroupData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={styles.tableContainer}>
        <h3 style={{ marginBottom: '20px' }}>Recent Donations</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Donor Name</th>
              <th style={styles.th}>Blood Group</th>
              <th style={styles.th}>Units</th>
              <th style={styles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentDonations.map(donation => (
              <tr key={donation.id}>
                <td style={styles.td}>{donation.donorName}</td>
                <td style={styles.td}>{donation.bloodGroup}</td>
                <td style={styles.td}>{donation.units || 1}</td>
                <td style={styles.td}>{donation.date.toDate().toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}