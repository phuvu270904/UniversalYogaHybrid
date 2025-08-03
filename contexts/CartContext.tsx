import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClassForDisplay } from '../services/firebaseService';

export interface CartItem {
  id: string;
  classData: ClassForDisplay;
  addedAt: Date;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (classData: ClassForDisplay) => void;
  removeFromCart: (classId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  isInCart: (classId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

const CART_STORAGE_KEY = 'yoga_cart_items';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart items from AsyncStorage on initialization
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  // Save cart items to AsyncStorage whenever cart changes
  useEffect(() => {
    saveCartToStorage();
  }, [cartItems]);

  const loadCartFromStorage = async () => {
    try {
      const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        // Convert addedAt strings back to Date objects
        const cartWithDates = parsedCart.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }));
        setCartItems(cartWithDates);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
  };

  const saveCartToStorage = async () => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  };

  const addToCart = (classData: ClassForDisplay) => {
    // Check if item is already in cart
    if (isInCart(classData.id)) {
      return; // Don't add duplicates
    }

    const newCartItem: CartItem = {
      id: classData.id,
      classData,
      addedAt: new Date()
    };

    setCartItems(prev => [...prev, newCartItem]);
  };

  const removeFromCart = (classId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== classId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.classData.pricePerClass, 0);
  };

  const getCartItemCount = () => {
    return cartItems.length;
  };

  const isInCart = (classId: string) => {
    return cartItems.some(item => item.id === classId);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
    isInCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
