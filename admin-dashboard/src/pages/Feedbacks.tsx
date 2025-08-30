// In src/pages/Feedbacks.tsx

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// Define a type for our testimonial data
type Testimonial = {
  id: string;
  donorName: string;
  department: string;
  text: string;
  rating: number;
  createdAt: {
    toDate: () => Date;
  };
};

// Simple CSS-in-JS for styling
const styles = {
  container: { width: '100%' },
  title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' },
  feedbackCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '15px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  donorInfo: {
    fontWeight: '600' as '600',
    color: '#334155',
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 'bold' as 'bold',
    color: '#f59e0b', // A gold/yellow color for stars
  },
  text: {
    fontSize: '16px',
    color: '#475569',
    lineHeight: 1.5,
  },
};

// A helper component to display star ratings
const StarRating = ({ rating }: { rating: number }) => (
  <div style={styles.rating}>
    {rating} ★
  </div>
);


export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Testimonial[];
        setFeedbacks(data);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  if (loading) {
    return <div>Loading feedback...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Donor Feedback</h1>
      {feedbacks.map(feedback => (
        <div key={feedback.id} style={styles.feedbackCard}>
          <div style={styles.cardHeader}>
            <span style={styles.donorInfo}>{feedback.donorName} - {feedback.department}</span>
            {feedback.rating && <StarRating rating={feedback.rating} />}
          </div>
          <p style={styles.text}>"{feedback.text}"</p>
        </div>
      ))}
    </div>
  );
}