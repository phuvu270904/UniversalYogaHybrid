import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  password: string;
  created_date: string;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing user session on app start
    const checkUserSession = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error checking user session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Query the users collection for a user with matching email and role "user"
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email),
        where('role', '==', 'user')
      );
      
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        throw new Error('User not found or invalid credentials');
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserData;
      
      // Simple password check (in production, use proper hashing)
      if (userData.password !== password) {
        throw new Error('Invalid credentials');
      }
      
      // Set user data with document ID
      const userDataWithId = {
        ...userData,
        id: userDoc.id
      };
      
      setUser(userDataWithId);
      
      // Store user session
      await AsyncStorage.setItem('userData', JSON.stringify(userDataWithId));
      
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signup = async (email: string, password: string, name: string, phone?: string) => {
    try {
      // Check if user already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        throw new Error('User with this email already exists');
      }
      
      // Create new user document
      const newUser = {
        email,
        password, // In production, hash this password
        name,
        phone: phone || '',
        role: 'user',
        created_date: new Date().getTime().toString()
      };
      
      const docRef = await addDoc(collection(db, 'users'), newUser);
      
      // Set user data with document ID
      const userDataWithId = {
        ...newUser,
        id: docRef.id
      };
      
      setUser(userDataWithId);
      
      // Store user session
      await AsyncStorage.setItem('userData', JSON.stringify(userDataWithId));
      
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      // Clear user data from state
      setUser(null);
      
      // Remove user session from AsyncStorage
      await AsyncStorage.removeItem('userData');
      
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
