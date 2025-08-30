// In src/pages/Users.tsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

// Type for user data remains the same
type User = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
};

// Updated styles to include a search input
const styles = {
  container: { width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' , color: '#333333ff'},
  title: { fontSize: '28px', fontWeight: 'bold' , color: '#333333ff' },
  searchInput: {
    padding: '10px 15px',
    fontSize: '16px',
    width: '300px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white', // The background is white
    color: '#333333',         // 👈 ADD THIS LINE to set the text color to dark gray
  },
  table: { width: '100%', borderCollapse: 'collapse' as 'collapse', marginTop: '20px' },
  th: { borderBottom: '2px solid #b0b0b0ff', padding: '12px', textAlign: 'left' as 'left', backgroundColor: '#f8f8f8' },
  td: { borderBottom: '1px solid #d6d6d6ff', padding: '12px' },
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // State for the search input

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const userList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Filter users based on the search query
  const filteredUsers = users.filter(user => {
    const fullName = user.name || `${user.firstName} ${user.lastName}`;
    return fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>User Management</h1>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>User ID</th>
          </tr>
        </thead>
        <tbody>
          {/* Map over the FILTERED user list */}
          {filteredUsers.map(user => (
            <tr key={user.id}>
              <td style={styles.td}>{user.name || `${user.firstName} ${user.lastName}`}</td>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>{user.department}</td>
              <td style={styles.td}>{user.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}