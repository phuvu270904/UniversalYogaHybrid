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
import { router } from 'expo-router';
import { getCourses, getClassesByCourse, Course } from '../../services/firebaseService';

export default function CoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourses = async () => {
    try {
      const coursesData = await getCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const handleCoursePress = async (course: Course) => {
    try {
      const classes = await getClassesByCourse(course.id);
      if (classes.length === 0) {
        Alert.alert('No Classes', 'No classes are scheduled for this course yet.');
        return;
      }
      // Navigate to course details with course data
      router.push({
        pathname: '/course-details',
        params: { 
          courseId: course.id,
          courseName: course.type,
          courseData: JSON.stringify(course)
        }
      });
    } catch (error) {
      console.error('Error checking course classes:', error);
      Alert.alert('Error', 'Failed to load course details.');
    }
  };

  const renderCourseItem = ({ item }: { item: Course }) => (
    <TouchableOpacity 
      style={styles.courseCard}
      onPress={() => handleCoursePress(item)}
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseName}>{item.type}</Text>
        <Text style={styles.coursePrice}>${item.price}</Text>
      </View>
      
      <View style={styles.courseDetails}>
        <Text style={styles.courseInfo}>
          {item.dayofweek} • {item.duration} minutes
        </Text>
        <Text style={styles.courseType}>{item.difficulty}</Text>
        <Text style={styles.courseCapacity}>Capacity: {item.capacity} people</Text>
      </View>
      
      {item.description && (
        <Text style={styles.courseDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.viewClassesButton}>
        <Text style={styles.viewClassesText}>View Classes</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yoga Courses</Text>
        <Text style={styles.headerSubtitle}>
          Discover our yoga courses and find your perfect practice
        </Text>
      </View>

      <FlatList
        data={courses}
        renderItem={renderCourseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No courses available</Text>
            <Text style={styles.emptySubtext}>
              Check back later for new courses
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
  courseCard: {
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
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  coursePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  courseDetails: {
    marginBottom: 12,
  },
  courseInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  courseType: {
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '600',
    marginBottom: 4,
  },
  courseCapacity: {
    fontSize: 14,
    color: '#666',
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  viewClassesButton: {
    backgroundColor: '#f0f8f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E8B57',
  },
  viewClassesText: {
    color: '#2E8B57',
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
