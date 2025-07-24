import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getClassesByCourse, createBooking, Course, ClassInstance } from '../services/firebaseService';

interface ClassInstanceWithDetails extends ClassInstance {
  courseName: string;
  pricePerClass: number;
  duration: number;
  availableSpots: number;
}

export default function CourseDetailsScreen() {
  const { user } = useAuth();
  const { courseId, courseName, courseData } = useLocalSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [classes, setClasses] = useState<ClassInstanceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadCourseDetails = async () => {
      try {
        // Parse course data from params
        let courseInfo: Course | null = null;
        if (courseData) {
          courseInfo = JSON.parse(courseData as string);
          setCourse(courseInfo);
        }

        // Load classes for this course
        if (courseId && courseInfo) {
          const classesData = await getClassesByCourse(courseId as string);
          
          // Transform classes to include needed properties
          const enhancedClasses: ClassInstanceWithDetails[] = classesData.map(classItem => ({
            ...classItem,
            courseName: courseInfo?.type || 'Yoga Class',
            pricePerClass: courseInfo?.price || 0,
            duration: courseInfo?.duration || 60,
            availableSpots: Math.max(0, (courseInfo?.capacity || 20) - 0) // TODO: Calculate actual bookings
          }));
          
          setClasses(enhancedClasses);
        }
      } catch (error) {
        console.error('Error loading course details:', error);
        Alert.alert('Error', 'Failed to load course details.');
      } finally {
        setLoading(false);
      }
    };

    loadCourseDetails();
  }, [courseId, courseData]);

  const handleBookClass = async (classItem: ClassInstanceWithDetails) => {
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

  const confirmBooking = async (classItem: ClassInstanceWithDetails) => {
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

  const renderClassItem = ({ item }: { item: ClassInstanceWithDetails }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <Text style={styles.classDate}>{formatDate(item.date)}</Text>
        <View style={[
          styles.spotsIndicator,
          isClassFull(item.availableSpots) && styles.fullClass
        ]}>
          <Text style={[
            styles.spotsText,
            isClassFull(item.availableSpots) && styles.fullClassText
          ]}>
            {isClassFull(item.availableSpots) ? 'FULL' : `${item.availableSpots} slots`}
          </Text>
        </View>
      </View>
      
      <View style={styles.classDetails}>
        <Text style={styles.classInfo}>
          Teacher: {item.teacher} • {item.duration} min
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
        <Text style={styles.loadingText}>Loading course details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {courseName || course?.type}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Course Info */}
        {course && (
          <View style={styles.courseInfoCard}>
            <Text style={styles.courseName}>{course.type}</Text>
            <View style={styles.courseDetails}>
              <Text style={styles.courseDetail}>
                <Text style={styles.detailLabel}>Type: </Text>
                {course.type}
              </Text>
              <Text style={styles.courseDetail}>
                <Text style={styles.detailLabel}>Day: </Text>
                {course.dayofweek}
              </Text>
              <Text style={styles.courseDetail}>
                <Text style={styles.detailLabel}>Duration: </Text>
                {course.duration} minutes
              </Text>
              <Text style={styles.courseDetail}>
                <Text style={styles.detailLabel}>Capacity: </Text>
                {course.capacity} people
              </Text>
              <Text style={styles.courseDetail}>
                <Text style={styles.detailLabel}>Price: </Text>
                ${course.price} per class
              </Text>
            </View>
            {course.description && (
              <Text style={styles.courseDescription}>{course.description}</Text>
            )}
          </View>
        )}

        {/* Classes List */}
        <View style={styles.classesSection}>
          <Text style={styles.sectionTitle}>Available Classes</Text>
          {classes.length > 0 ? (
            <FlatList
              data={classes}
              renderItem={renderClassItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No classes scheduled</Text>
              <Text style={styles.emptySubtext}>
                Check back later for new classes
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  courseInfoCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  courseDetails: {
    marginBottom: 15,
  },
  courseDetail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#333',
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  classesSection: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  classCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  classDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B57',
    flex: 1,
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
    fontSize: 18,
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
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
