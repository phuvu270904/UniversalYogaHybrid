import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc,
  setDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.config';

export interface Course {
  id: string;
  capacity: number;
  createdAt: Timestamp;
  dayOfWeek: string;
  description?: string;
  difficulty: string;
  duration: number;
  location?: string;
  price: number;
  time: string;
  type: string;
}

export interface ClassInstance {
  id: string;
  course_id: string;
  date: string;
  teacher: string;
  comments: string;
  latitude: number;
  longitude: number;
  photo_path?: string;
}

export interface ClassInstanceWithCourse extends ClassInstance {
  course: Course;
}

export interface Booking {
  id: string;
  firestore_id: string;
  class_id: string;
  user_id: string;
  sync_status: string;
  // Additional fields for app functionality
  customerName?: string;
  customerEmail?: string;
  courseId?: string;
  courseName?: string;
  classDate?: string;
  teacher?: string;
  pricePerClass?: number;
  bookingDate?: Timestamp;
  status?: 'confirmed' | 'cancelled';
}

// Course services
export const getCourses = async (): Promise<Course[]> => {
  try {
    const coursesRef = collection(db, 'yoga_courses');
    const snapshot = await getDocs(coursesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Course));
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

export const getCourse = async (courseId: string): Promise<Course | null> => {
  try {
    const courseDoc = await getDoc(doc(db, 'yoga_courses', courseId));
    if (courseDoc.exists()) {
      return {
        id: courseDoc.id,
        ...courseDoc.data()
      } as Course;
    }
    return null;
  } catch (error) {
    console.error('Error fetching course:', error);
    return null;
  }
};

// Class services
export const getClasses = async (): Promise<ClassInstance[]> => {
  try {
    const classesRef = collection(db, 'class_instances');
    const q = query(classesRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ClassInstance));
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
};

export const getClassesByCourse = async (courseId: string): Promise<ClassInstance[]> => {
  try {
    console.log(courseId, "Fetching classes for course ID");
    
    const classesRef = collection(db, 'class_instances');
    
    // First try with composite index (where + orderBy)
    try {
      const q = query(
        classesRef, 
        where('course_id', '==', courseId),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClassInstance));
    } catch (indexError: any) {
      // If index doesn't exist, fall back to simple query and sort in memory
      console.warn('Composite index not available, falling back to client-side sorting:', indexError.message);
      
      const simpleQuery = query(classesRef, where('course_id', '==', courseId));
      const snapshot = await getDocs(simpleQuery);
      const classes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClassInstance));
      
      // Sort by date on the client side
      return classes.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    }
  } catch (error) {
    console.error('Error fetching classes by course:', error);
    return [];
  }
};

export const getUpcomingClasses = async (): Promise<ClassInstance[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const classesRef = collection(db, 'class_instances');
    const q = query(
      classesRef,
      where('date', '>=', today),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ClassInstance));
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    return [];
  }
};

// Enhanced class services with course information
export const getClassesWithCourse = async (): Promise<ClassInstanceWithCourse[]> => {
  try {
    const classes = await getClasses();
    const classesWithCourse = await Promise.all(
      classes.map(async (classInstance) => {
        const course = await getCourse(classInstance.course_id);
        return {
          ...classInstance,
          course: course!
        } as ClassInstanceWithCourse;
      })
    );
    return classesWithCourse.filter(c => c.course !== null);
  } catch (error) {
    console.error('Error fetching classes with course info:', error);
    return [];
  }
};

export const getUpcomingClassesWithCourse = async (): Promise<ClassInstanceWithCourse[]> => {
  try {
    const classes = await getUpcomingClasses();
    const classesWithCourse = await Promise.all(
      classes.map(async (classInstance) => {
        const course = await getCourse(classInstance.course_id);
        return {
          ...classInstance,
          course: course!
        } as ClassInstanceWithCourse;
      })
    );
    
    return classesWithCourse.filter(c => c.course !== null);
  } catch (error) {
    console.error('Error fetching upcoming classes with course info:', error);
    return [];
  }
};

export const getClassesByCourseWithCourse = async (courseId: string): Promise<ClassInstanceWithCourse[]> => {
  try {
    const classes = await getClassesByCourse(courseId);
    const course = await getCourse(courseId);
    if (!course) return [];
    
    return classes.map(classInstance => ({
      ...classInstance,
      course
    } as ClassInstanceWithCourse));
  } catch (error) {
    console.error('Error fetching classes by course with course info:', error);
    return [];
  }
};

// Booking services
export const createBooking = async (
  customerId: string,
  customerName: string,
  customerEmail: string,
  classInstance: ClassInstance
): Promise<string> => {
  try {
    const bookingData: Omit<Booking, 'id'> = {
      firestore_id: '', // Will be set after document creation
      class_id: classInstance.id,
      user_id: customerId,
      sync_status: 'synced',
      // Additional fields for app functionality
      customerName,
      customerEmail,
      courseId: classInstance.course_id,
      classDate: classInstance.date,
      teacher: classInstance.teacher,
      bookingDate: Timestamp.now(),
      status: 'confirmed'
    };

    const docRef = await addDoc(collection(db, 'bookings'), bookingData);
    
    // Update the document with its own ID as firestore_id
    await setDoc(doc(db, 'bookings', docRef.id), {
      ...bookingData,
      firestore_id: docRef.id
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    return '';
  }
};

export const getUserBookings = async (customerId: string): Promise<Booking[]> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('user_id', '==', customerId),
      orderBy('bookingDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
  } catch {
    return [];
  }
};
