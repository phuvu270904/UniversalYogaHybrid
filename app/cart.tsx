import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCart, CartItem } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { createBooking } from '../services/firebaseService';

export default function CartScreen() {
  const { user } = useAuth();
  const { cartItems, removeFromCart, clearCart, getCartTotal } = useCart();
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRemoveItem = (classId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this class from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(classId) }
      ]
    );
  };

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to book classes.');
      router.push('/login');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Book ${cartItems.length} class${cartItems.length > 1 ? 'es' : ''} for $${getCartTotal()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book All', onPress: processCheckout }
      ]
    );
  };

  const processCheckout = async () => {
    if (!user) return;

    setCheckoutLoading(true);
    let successCount = 0;
    let failedBookings: string[] = [];

    try {
      // Process each cart item as a booking
      for (const item of cartItems) {
        try {
          await createBooking(
            user.id,
            user.name,
            user.email,
            item.classData
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to book ${item.classData.courseName}:`, error);
          failedBookings.push(item.classData.courseName);
        }
      }

      // Show results
      if (successCount === cartItems.length) {
        Alert.alert('Success!', `All ${successCount} classes booked successfully!`);
        clearCart();
      } else if (successCount > 0) {
        Alert.alert(
          'Partial Success',
          `${successCount} classes booked successfully. ${failedBookings.length} failed to book: ${failedBookings.join(', ')}`
        );
        // Remove successfully booked items from cart
        const successfullyBookedItems = cartItems.filter(item => 
          !failedBookings.includes(item.classData.courseName)
        );
        successfullyBookedItems.forEach(item => {
          removeFromCart(item.id);
        });
      } else {
        Alert.alert('Booking Failed', 'Failed to book any classes. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'An error occurred during checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.className}>{item.classData.courseName}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.id)}
        >
          <Ionicons name="close-circle" size={24} color="#e53e3e" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.classDate}>{formatDate(item.classData.date)}</Text>
        <Text style={styles.classInfo}>
          Teacher: {item.classData.teacher} • {item.classData.duration} min
        </Text>
        <Text style={styles.classInfo}>
          Difficulty: {item.classData.difficulty}
        </Text>
        <Text style={styles.classPrice}>${item.classData.pricePerClass}</Text>
      </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>Please login to view your cart</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                'Clear Cart',
                'Are you sure you want to remove all items from your cart?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear All', style: 'destructive', onPress: clearCart }
                ]
              );
            }}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyCart}>
          <Ionicons name="basket-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Browse classes and add them to your cart</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => router.push('/(dashboard)/classes')}
          >
            <Text style={styles.browseButtonText}>Browse Classes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.checkoutSection}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total: </Text>
              <Text style={styles.totalAmount}>${getCartTotal()}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.checkoutButton, checkoutLoading && styles.checkoutButtonDisabled]}
              onPress={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.checkoutButtonText}>
                  Book All ({cartItems.length} class{cartItems.length > 1 ? 'es' : ''})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E8B57',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginLeft: -32, // Offset the back button width
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cartList: {
    padding: 20,
    paddingBottom: 100, // Space for checkout section
  },
  cartItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  removeButton: {
    padding: 4,
  },
  itemDetails: {
    gap: 4,
  },
  classDate: {
    fontSize: 16,
    color: '#2E8B57',
    fontWeight: '600',
  },
  classInfo: {
    fontSize: 14,
    color: '#666',
  },
  classPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginTop: 8,
  },
  checkoutSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  checkoutButton: {
    backgroundColor: '#2E8B57',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
