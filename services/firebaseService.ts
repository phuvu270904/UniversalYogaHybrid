import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.config';

export interface Course {
  id: string;
  courseName: string;
  dayOfWeek: string;
  duration: number;
  capacity: number;
  pricePerClass: number;
  typeOfClass: string;
  description: string;
  createdAt: Timestamp;
}

export interface ClassInstance {
  id: string;
  courseId: string;
  courseName: string;
  date: string;
  teacher: string;
  comments: string;
  availableSpots: number;
  pricePerClass: number;
  typeOfClass: string;
  duration: number;
  createdAt: Timestamp;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  courseId: string;
  courseName: string;
  classId: string;
  classDate: string;
  teacher: string;
  pricePerClass: number;
  bookingDate: Timestamp;
  status: 'confirmed' | 'cancelled';
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
    throw error;
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
    throw error;
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
    throw error;
  }
};

export const getClassesByCourse = async (courseId: string): Promise<ClassInstance[]> => {
  try {
    const classesRef = collection(db, 'class_instances');
    const q = query(
      classesRef, 
      where('courseId', '==', courseId),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ClassInstance));
  } catch (error) {
    console.error('Error fetching classes by course:', error);
    throw error;
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
    throw error;
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
      customerId,
      customerName,
      customerEmail,
      courseId: classInstance.courseId,
      courseName: classInstance.courseName,
      classId: classInstance.id,
      classDate: classInstance.date,
      teacher: classInstance.teacher,
      pricePerClass: classInstance.pricePerClass,
      bookingDate: Timestamp.now(),
      status: 'confirmed'
    };

    const docRef = await addDoc(collection(db, 'bookings'), bookingData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const getUserBookings = async (customerId: string): Promise<Booking[]> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('customerId', '==', customerId),
      orderBy('bookingDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
};
