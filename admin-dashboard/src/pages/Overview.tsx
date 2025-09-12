// In src/pages/Overview.tsx

import { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

// Define a type for our chart data
type DepartmentData = {
  name: string;
  donors: number;
};

// Simple CSS-in-JS for styling our dashboard
const styles = {
  container: { width: '100%' },
  title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#333333ff' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' ,color: '#333333ff'},
  statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  statNumber: { fontSize: '32px', fontWeight: 'bold', marginBottom: '5px',  },
  statLabel: { fontSize: '16px', color: '#666' },
  chartContainer: { height: '400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
};

export default function Overview() {
  const [stats, setStats] = useState({ userCount: 0, totalDonations: 0, eventCount: 0 });
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users and donations collections at the same time
        const usersQuery = query(collection(db, 'users'));
        const donationsQuery = query(collection(db, 'donations'));
        const eventsQuery = query(collection(db, 'events'));
        
        const [userSnapshot, donationSnapshot, eventSnapshot] = await Promise.all([
          getDocs(usersQuery),
          getDocs(donationsQuery),
          getDocs(eventsQuery), // Fetch events
        ]);

        const userCount = userSnapshot.size;
        const totalDonations = donationSnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().units || 0), 0);
        const eventCount = eventSnapshot.size; // Get the count of events
        
        // 👇 3. UPDATE THE STATE WITH THE NEW COUNT
        setStats({ userCount, totalDonations, eventCount });

        // Process data for the department chart
        const deptCounts: { [key: string]: number } = {};
        userSnapshot.docs.forEach(doc => {
          const department = doc.data().department;
          if (department) {
            deptCounts[department] = (deptCounts[department] || 0) + 1;
          }
        });
        
        const chartData = Object.keys(deptCounts).map(deptName => ({
          name: deptName,
          donors: deptCounts[deptName],
        }));

        setDepartmentData(chartData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard Overview</h1>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.userCount}</div>
          <div style={styles.statLabel}>Total Users Registered</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.totalDonations}</div>
          <div style={styles.statLabel}>Total Units Donated</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.eventCount}</div>
          <div style={styles.statLabel}>Total Camps Organized</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '20px',color: '#333333ff' }}>Donors by Department</h2>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={departmentData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="donors" fill="#d9324b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}