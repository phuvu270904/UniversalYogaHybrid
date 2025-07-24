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

export interface ClassForDisplay {
  id: string;
  courseId: string;
  courseName: string;
  date: string;
  teacher: string;
  comments?: string;
  duration: number;
  typeOfClass: string;
  pricePerClass: number;
  availableSpots: number;
  difficulty: string;
  capacity: number;
}

export interface Booking {
  id: string;
  class_id: string;
  user_id: string;
}

export interface BookingWithClassAndCourse extends Booking {
  classInstance: ClassInstance;
  course: Course;
}

export interface BookingForDisplay {
  id: string;
  courseName: string;
  classDate: string;
  teacher: string;
  pricePerClass: number;
  status: string;
  bookingDate: Timestamp;
  // Additional details from class and course
  duration: number;
  typeOfClass: string;
  difficulty: string;
  location?: string;
  comments: string;
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

// Helper function to get booking count for a class
export const getClassBookingCount = async (classId: string): Promise<number> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('class_id', '==', classId),
      where('status', '==', 'confirmed')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting booking count:', error);
    return 0;
  }
};

// Get upcoming classes with full display information
export const getUpcomingClassesForDisplay = async (): Promise<ClassForDisplay[]> => {
  try {
    const classesWithCourse = await getUpcomingClassesWithCourse();
    
    const classesForDisplay = await Promise.all(
      classesWithCourse.map(async (classWithCourse) => {
        const bookingCount = await getClassBookingCount(classWithCourse.id);
        const availableSpots = Math.max(0, classWithCourse.course.capacity - bookingCount);
        
        return {
          id: classWithCourse.id,
          courseId: classWithCourse.course_id,
          courseName: classWithCourse.course.type, // Using type as course name
          date: classWithCourse.date,
          teacher: classWithCourse.teacher,
          comments: classWithCourse.comments,
          duration: classWithCourse.course.duration,
          typeOfClass: classWithCourse.course.type,
          pricePerClass: classWithCourse.course.price,
          availableSpots,
          difficulty: classWithCourse.course.difficulty,
          capacity: classWithCourse.course.capacity
        } as ClassForDisplay;
      })
    );
    
    return classesForDisplay;
  } catch (error) {
    console.error('Error fetching classes for display:', error);
    return [];
  }
};

// Booking services
export const createBooking = async (
  customerId: string,
  customerName: string,
  customerEmail: string,
  classInstance: ClassForDisplay
): Promise<string> => {
  try {
    const bookingData: Omit<Booking, 'id'> = {
      class_id: classInstance.id,
      user_id: customerId,
    };

    const docRef = await addDoc(collection(db, 'bookings'), bookingData);
    
    // Update the document with its own ID as firestore_id
    await setDoc(doc(db, 'bookings', docRef.id), {
      ...bookingData,
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
      where('user_id', '==', customerId)
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

// Enhanced booking function with class and course relations
export const getUserBookingsWithRelations = async (customerId: string): Promise<BookingWithClassAndCourse[]> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('user_id', '==', customerId)
    );
    const snapshot = await getDocs(q);
    
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
    
    // Get class instance and course data for each booking
    const bookingsWithRelations = await Promise.all(
      bookings.map(async (booking) => {
        try {
          // Get class instance
          const classInstanceDoc = await getDoc(doc(db, 'class_instances', booking.class_id));
          if (!classInstanceDoc.exists()) {
            return null;
          }
          
          const classInstance = {
            id: classInstanceDoc.id,
            ...classInstanceDoc.data()
          } as ClassInstance;
          
          // Get course data
          const course = await getCourse(classInstance.course_id);
          if (!course) {
            return null;
          }
          
          return {
            ...booking,
            classInstance,
            course
          } as BookingWithClassAndCourse;
        } catch (error) {
          console.error(`Error fetching relations for booking ${booking.id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null values (bookings with missing class instances or courses)
    return bookingsWithRelations.filter(booking => booking !== null) as BookingWithClassAndCourse[];
  } catch (error) {
    console.error('Error fetching user bookings with relations:', error);
    return [];
  }
};

// Get a single booking with relations
export const getBookingWithRelations = async (bookingId: string): Promise<BookingWithClassAndCourse | null> => {
  try {
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingDoc.exists()) {
      return null;
    }
    
    const booking = {
      id: bookingDoc.id,
      ...bookingDoc.data()
    } as Booking;
    
    // Get class instance
    const classInstanceDoc = await getDoc(doc(db, 'class_instances', booking.class_id));
    if (!classInstanceDoc.exists()) {
      return null;
    }
    
    const classInstance = {
      id: classInstanceDoc.id,
      ...classInstanceDoc.data()
    } as ClassInstance;
    
    // Get course data
    const course = await getCourse(classInstance.course_id);
    if (!course) {
      return null;
    }
    
    return {
      ...booking,
      classInstance,
      course
    } as BookingWithClassAndCourse;
  } catch (error) {
    console.error('Error fetching booking with relations:', error);
    return null;
  }
};

// Get user bookings formatted for display
export const getUserBookingsForDisplay = async (customerId: string): Promise<BookingForDisplay[]> => {
  try {
    const bookingsWithRelations = await getUserBookingsWithRelations(customerId);
    
    const bookingsForDisplay = bookingsWithRelations.map((booking) => {
      return {
        id: booking.id,
        courseName: booking.course.type,
        classDate: booking.classInstance.date,
        teacher: booking.classInstance.teacher,
        pricePerClass: booking.course.price,
        status: 'confirmed', // Default status since Firestore doesn't have status field
        bookingDate: booking.course.createdAt, // Using course creation as booking date placeholder
        duration: booking.course.duration,
        typeOfClass: booking.course.type,
        difficulty: booking.course.difficulty,
        location: booking.course.location,
        comments: booking.classInstance.comments
      } as BookingForDisplay;
    });
    
    // Sort by class date (newest first)
    return bookingsForDisplay.sort((a, b) => {
      const dateA = new Date(a.classDate);
      const dateB = new Date(b.classDate);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Error fetching user bookings for display:', error);
    return [];
  }
};
