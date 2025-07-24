import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getUpcomingClassesForDisplay, createBooking, ClassForDisplay } from '../../services/firebaseService';

export default function ClassesScreen() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassForDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  const loadClasses = async () => {
    try {
      const classesData = await getUpcomingClassesForDisplay();
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const handleBookClass = async (classItem: ClassForDisplay) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to book a class.');
      return;
    }

    if (classItem.availableSpots <= 0) {
      Alert.alert('Class Full', 'This class is fully booked.');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Book ${classItem.courseName} on ${formatDate(classItem.date)} for $${classItem.pricePerClass}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book Now', onPress: () => confirmBooking(classItem) }
      ]
    );
  };

  const confirmBooking = async (classItem: ClassForDisplay) => {
    if (!user) return;

    setBookingLoading(classItem.id);
    try {
      await createBooking(
        user.id,
        user.name,
        user.email,
        classItem
      );
      
      Alert.alert('Success', 'Class booked successfully!');
      
      // Update the class available spots locally
      setClasses(prevClasses =>
        prevClasses.map(c =>
          c.id === classItem.id
            ? { ...c, availableSpots: c.availableSpots - 1 }
            : c
        )
      );
    } catch (error) {
      console.error('Error booking class:', error);
      Alert.alert('Booking Failed', 'Failed to book the class. Please try again.');
    } finally {
      setBookingLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isClassFull = (availableSpots: number) => availableSpots <= 0;

  const renderClassItem = ({ item }: { item: ClassForDisplay }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <Text style={styles.className}>{item.courseName}</Text>
        <View style={[
          styles.spotsIndicator,
          isClassFull(item.availableSpots) && styles.fullClass
        ]}>
          <Text style={[
            styles.spotsText,
            isClassFull(item.availableSpots) && styles.fullClassText
          ]}>
            {isClassFull(item.availableSpots) ? 'FULL' : `${item.availableSpots} spots`}
          </Text>
        </View>
      </View>
      
      <View style={styles.classDetails}>
        <Text style={styles.classDate}>{formatDate(item.date)}</Text>
        <Text style={styles.classInfo}>
          Teacher: {item.teacher} • {item.duration} min • {item.difficulty}
        </Text>
        {item.comments && (
          <Text style={styles.classComments}>{item.comments}</Text>
        )}
      </View>
      
      <View style={styles.classFooter}>
        <Text style={styles.classPrice}>${item.pricePerClass}</Text>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (isClassFull(item.availableSpots) || bookingLoading === item.id) && styles.bookButtonDisabled
          ]}
          onPress={() => handleBookClass(item)}
          disabled={isClassFull(item.availableSpots) || bookingLoading === item.id}
        >
          {bookingLoading === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.bookButtonText}>
              {isClassFull(item.availableSpots) ? 'Full' : 'Book Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Classes</Text>
        <Text style={styles.headerSubtitle}>
          Book your spot in our yoga classes
        </Text>
      </View>

      <FlatList
        data={classes}
        renderItem={renderClassItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No upcoming classes</Text>
            <Text style={styles.emptySubtext}>
              Check back later for new classes
            </Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: '#2E8B57',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  listContainer: {
    padding: 20,
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  spotsIndicator: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E8B57',
  },
  fullClass: {
    backgroundColor: '#ffeaea',
    borderColor: '#e53e3e',
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E8B57',
  },
  fullClassText: {
    color: '#e53e3e',
  },
  classDetails: {
    marginBottom: 15,
  },
  classDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B57',
    marginBottom: 6,
  },
  classInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  classComments: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  bookButton: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});
