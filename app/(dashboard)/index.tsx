import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getUpcomingClasses, getUserBookings, ClassInstance, Booking } from '../../services/firebaseService';

export default function DashboardHome() {
  const { user, loading: authLoading } = useAuth();
  const [upcomingClasses, setUpcomingClasses] = useState<ClassInstance[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth' as any);
    }
  }, [user, authLoading]);

  const loadData = useCallback(async () => {
    try {
      const [classesData, bookingsData] = await Promise.all([
        getUpcomingClasses(),
        user ? getUserBookings(user.uid) : []
      ]);
      
      setUpcomingClasses(classesData.slice(0, 3)); // Show only first 3
      setRecentBookings(bookingsData.slice(0, 3)); // Show only first 3
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.displayName || 'Yoga Enthusiast'}!</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{recentBookings.length}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{upcomingClasses.length}+</Text>
          <Text style={styles.statLabel}>Available Classes</Text>
        </View>
      </View>

      {/* Upcoming Classes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Classes</Text>
          <TouchableOpacity onPress={() => router.push('/classes' as any)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingClasses.length > 0 ? (
          upcomingClasses.map((classItem) => (
            <View key={classItem.id} style={styles.classCard}>
              <View style={styles.classHeader}>
                <Text style={styles.className}>{classItem.courseName}</Text>
                <Text style={styles.classDate}>{formatDate(classItem.date)}</Text>
              </View>
              <Text style={styles.classTeacher}>Teacher: {classItem.teacher}</Text>
              <Text style={styles.classType}>{classItem.typeOfClass} • {classItem.duration} min</Text>
              <Text style={styles.classPrice}>${classItem.pricePerClass}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No upcoming classes available</Text>
        )}
      </View>

      {/* Recent Bookings */}
      {user && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/bookings' as any)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingClass}>{booking.courseName}</Text>
                  <View style={[
                    styles.statusBadge,
                    booking.status === 'confirmed' ? styles.confirmedBadge : styles.cancelledBadge
                  ]}>
                    <Text style={styles.statusText}>{booking.status}</Text>
                  </View>
                </View>
                <Text style={styles.bookingDate}>{formatDate(booking.classDate)}</Text>
                <Text style={styles.bookingTeacher}>Teacher: {booking.teacher}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No bookings yet</Text>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/courses' as any)}
          >
            <Text style={styles.actionButtonText}>Browse Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/classes' as any)}
          >
            <Text style={styles.actionButtonText}>View All Classes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2E8B57',
  },
  greeting: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    margin: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 16,
    color: '#2E8B57',
    fontWeight: '600',
  },
  classCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  classDate: {
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '600',
  },
  classTeacher: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  classType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  classPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  bookingCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingClass: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confirmedBadge: {
    backgroundColor: '#e8f5e8',
  },
  cancelledBadge: {
    backgroundColor: '#ffeaea',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookingDate: {
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '600',
    marginBottom: 4,
  },
  bookingTeacher: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2E8B57',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
