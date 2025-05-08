import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList, // Changed from ScrollView
  TouchableOpacity,
  Modal,
  Linking,
  ScrollView, // Keep ScrollView for the Modal content
  Alert,
} from 'react-native';
import Card from '../../components/Card'; // Adjust path if necessary
import { FontAwesome5 } from '@expo/vector-icons'; // Example import
import { COLORS, SIZES, FONTS } from '../../src/theme'; // Adjust path if necessary

// Define Product Type (Optional but good practice)
interface Product {
  id: string;
  icon: string;
  title: string;
  description: string;
  price?: number; // Add price as a number if possible for calculations
}

// Helper function to extract price (example)
const extractPrice = (description: string): number => {
  // Handle both Arabic and English numerals
  const arabicToEnglish: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  // Convert Arabic numerals to English
  const englishNumerals = description.split('').map(char => arabicToEnglish[char] || char).join('');
  const match = englishNumerals.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Data for Data Analysis Services
const dataAnalysisProducts: Product[] = [
  {
    id: '1',
    icon: 'chart-line', // Generic icon for data analysis
    title: 'تحليل بيانات المبيعات الشهرية',
    description: '267 ريال', // Price as description
    price: 267
  },
  {
    id: '2',
    icon: 'users-cog', // Icon related to customer segmentation
    title: 'تحليل وتقسيم العملاء',
    description: '301 ريال',
    price: 301
  },
  {
    id: '3',
    icon: 'search-dollar', // Icon related to market analysis
    title: 'تحليل بيانات العملاء والسوق',
    description: '٣٠٠ ريال', // Note: Using Arabic numeral here as provided
    price: 300
  },
  {
    id: '4',
    icon: 'industry', // Icon related to industrial data
    title: 'تحليل البيانات الصناعية والإنتاجية',
    description: '٣٥٠ ريال', // Note: Using Arabic numeral here as provided
    price: 350
  },
  {
    id: '5',
    icon: 'notes-medical', // Icon related to health data
    title: 'تحليل البيانات الصحية',
    description: 'تواصل للسعر', // Placeholder for price
  },
];

// Data for AI Automation Services
const automationProducts: Product[] = [
  {
    id: 'auto-1',
    icon: 'headset', // Icon for customer service
    title: 'أتمتة خدمة العملاء',
    description: '٣٠٠ ريال',
    price: 300
  },
  {
    id: 'auto-2',
    icon: 'file-invoice-dollar', // Icon for data/document management
    title: 'أتمتة إدارة البيانات والوثائق',
    description: '٤٠٠ ريال',
    price: 400
  },
  {
    id: 'auto-3',
    icon: 'bullhorn', // Icon for marketing
    title: 'أتمتة عمليات التسويق الرقمي',
    description: '٦٠٠ ريال',
    price: 600
  },
  {
    id: 'auto-4',
    icon: 'users', // Icon for HR
    title: 'أتمتة إدارة الموارد البشرية',
    description: '٢٧٠٠ ريال',
    price: 2700
  },
];

// Data for AI Agents
const aiAgentsProducts: Product[] = [
  {
    id: 'agent-1',
    icon: 'robot', // Icon for custom agent
    title: 'وكيل مخصص',
    description: '٧٠٠ ريال',
    price: 700
  },  
  {
    id: 'agent-2',
    icon: 'chart-pie', // Icon for data analysis agent
    title: 'وكيل محلل البيانات',
    description: '٤٩٩ ريال',
    price: 499
  },
  {
    id: 'agent-3',
    icon: 'store-alt', // Icon for marketing agent
    title: 'وكيل تسويق',
    description: '٤٩٩ ريال',
    price: 499
  },
  {
    id: 'agent-4',
    icon: 'search', // Icon for SEO agent
    title: 'وكيل محسن لمحركات البحث',
    description: '٤٩٩ ريال',
    price: 499
  },
];


export default function ServicesScreen() {
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [isCheckoutModalVisible, setCheckoutModalVisible] = useState(false);

  const addToCart = (product: Product) => {
    // Basic add - allows duplicates. Could add logic to increment quantity later.
    setCartItems([...cartItems, product]);
    Alert.alert('تمت الإضافة', `${product.title} أضيف إلى السلة.`);
  };

  // Function to remove item by index
  const removeFromCart = (indexToRemove: number) => {
    setCartItems(currentItems => currentItems.filter((_, index) => index !== indexToRemove));
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.price || extractPrice(item.description);
      return sum + price;
    }, 0);
  };

  const handleOnlinePayment = () => {
    const url = 'https://brightaii.com/checkout.html';
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('خطأ', `لا يمكن فتح الرابط: ${url}`);
      }
    });
    setCheckoutModalVisible(false); // Close modal after initiating payment
  };

  const handleWhatsAppRedirect = () => {
    const phone = '966538229013';
    const message = `أرغب في إرسال إيصال الدفع للمنتجات في سلتي. المبلغ الإجمالي: ${calculateTotal()} ريال`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback or alert if WhatsApp is not installed
        Alert.alert('خطأ', 'تطبيق واتساب غير مثبت أو لا يمكن فتح الرابط.');
      }
    });
     setCheckoutModalVisible(false); // Close modal
  };


  // Render item function for FlatList
  const renderProduct = ({ item }: { item: Product }) => (
    <Card
      iconName={item.icon}
      title={item.title}
      description={item.description}
      onAddToCart={() => addToCart(item)}
      onPress={undefined} // Explicitly pass undefined to satisfy TS
    />
  );

  // Helper to render a section
  const renderSection = (title: string, data: Product[]) => (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={data}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2} // Key for grid layout
        scrollEnabled={false} // Disable inner FlatList scrolling
        columnWrapperStyle={styles.row} // Optional: style the row wrapper
        // contentContainerStyle={styles.listContentContainer}
      />
    </>
  );


  return (
    <View style={styles.gradientBackground}>
      {/* Cart Indicator/Button */}
      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => setCheckoutModalVisible(true)}
        activeOpacity={0.8}
      >
        <FontAwesome5 name="shopping-cart" size={SIZES.h3} color={COLORS.primary} />
        {cartItems.length > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Use ScrollView for the overall page to contain multiple FlatLists */}
      <ScrollView contentContainerStyle={styles.scrollViewContentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.mainTitle}>خدماتنا الذكية</Text>
          <Text style={styles.mainSubtitle}>حلول متقدمة تناسب أعمالك</Text>
        </View>
        {renderSection('خدمات تحليل البيانات', dataAnalysisProducts)}
        {renderSection('أتمتة الأعمال الروتينية بالذكاء الاصطناعي', automationProducts)}
        {renderSection('وكلاء الذكاء الاصطناعي', aiAgentsProducts)}
      </ScrollView>

      {/* Checkout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCheckoutModalVisible}
        onRequestClose={() => {
          setCheckoutModalVisible(!isCheckoutModalVisible);
        }}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <FontAwesome5 name="shopping-basket" size={SIZES.h2} color={COLORS.primary} />
              <Text style={styles.modalTitle}>إتمام الشراء</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {/* Cart Items Summary */}
              {cartItems.length === 0 ? (
                <Text style={styles.emptyCartText}>السلة فارغة</Text>
              ) : (
                cartItems.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.modalCartItemRow}>
                     {/* Delete Button */}
                     <TouchableOpacity onPress={() => removeFromCart(index)} style={styles.deleteButton}>
                       <FontAwesome5 name="trash-alt" size={SIZES.h4} color={COLORS.accent} />
                     </TouchableOpacity>
                     {/* Item Text */}
                     <Text style={styles.modalCartItemText}>
                       {item.title} - {item.description}
                     </Text>
                  </View>
                ))
              )}
              {/* Display total only if cart is not empty */}
              {cartItems.length > 0 && (
                 <Text style={styles.modalTotal}>المجموع: {calculateTotal()} ريال</Text>
              )}

              {/* Separator */}
              <View style={styles.separator}></View>

              {/* Payment Option 1: Online */}
              <Text style={styles.paymentOptionTitle}>الدفع الإلكتروني</Text>
              {/* Disable payment buttons if cart is empty */}
              <TouchableOpacity
                 style={[styles.paymentButton, cartItems.length === 0 && styles.disabledButton]}
                 onPress={handleOnlinePayment}
                 disabled={cartItems.length === 0}
              >
                <Text style={styles.paymentButtonText}>الدفع الآن (عبر بوابة الدفع)</Text>
              </TouchableOpacity>

              <View style={styles.separator}></View>

              {/* Payment Option 2: Bank Transfer */}
              <Text style={styles.paymentOptionTitle}>التحويل البنكي</Text>
              <Text style={styles.bankDetailsTitle}>معلومات الحساب البنكي:</Text>
              <Text style={styles.bankDetails}>رقم الآيبان: SA15 8000 0857 6080 1136 1397</Text>
              <Text style={styles.bankDetails}>البنك: بنك الراجحي</Text>
              <Text style={styles.bankDetails}>اسم المستفيد: رتاج احمد</Text>
              {/* Display amount only if cart is not empty */}
              {cartItems.length > 0 && (
                 <Text style={styles.bankDetails}>المبلغ المطلوب: {calculateTotal()} ريال</Text>
              )}

              <TouchableOpacity
                 style={[styles.paymentButton, styles.whatsappButton, cartItems.length === 0 && styles.disabledButton]}
                 onPress={handleWhatsAppRedirect}
                 disabled={cartItems.length === 0}
              >
                 <FontAwesome5 name="whatsapp" size={SIZES.h4} color={COLORS.white} style={{ marginRight: SIZES.base }}/>
                 <Text style={styles.paymentButtonText}>إرسال الإيصال عبر واتساب</Text>
              </TouchableOpacity>

            </ScrollView>

             {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCheckoutModalVisible(!isCheckoutModalVisible)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>إغلاق السلة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    backgroundColor: COLORS.background || '#f8f9fa',
    // خلفية تدرج لوني خفيف
    // يمكن استخدام مكتبة LinearGradient لمزيد من الجمال
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
    marginTop: SIZES.padding * 2,
  },
  mainTitle: {
    ...FONTS.h1,
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: SIZES.h1 * 1.1,
    letterSpacing: 1,
    marginBottom: SIZES.base,
    textShadowColor: COLORS.lightGray,
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  mainSubtitle: {
    ...FONTS.body2,
    color: COLORS.text, // <-- استبدال COLORS.gray بـ COLORS.text
    fontSize: SIZES.body2,
    marginBottom: SIZES.padding,
    textAlign: 'center',
  },
  scrollViewContentContainer: {
    paddingTop: SIZES.padding * 3.5,
    paddingHorizontal: SIZES.padding / 2,
    paddingBottom: SIZES.padding * 2,
  },
  sectionTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
    marginBottom: SIZES.padding,
    marginTop: SIZES.padding * 1.5,
    textAlign: 'right',
    paddingRight: SIZES.padding / 2,
    fontSize: SIZES.h3,
    fontWeight: '700',
    borderRightWidth: 4,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base,
    paddingLeft: SIZES.base,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: SIZES.padding,
  },
  cartButton: {
    position: 'absolute',
    top: SIZES.padding * 2,
    left: SIZES.padding,
    zIndex: 10,
    backgroundColor: COLORS.white,
    padding: SIZES.padding / 2,
    borderRadius: SIZES.radius * 3,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    elevation: 2,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: SIZES.body5,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalCenteredView: {
    flex: 1,
    justifyContent: 'flex-end', // Position modal at the bottom
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Dim background
  },
  modalView: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radius * 3,
    borderTopRightRadius: SIZES.radius * 3,
    padding: SIZES.padding * 1.5,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SIZES.padding,
    alignSelf: 'flex-end',
  },
  modalTitle: {
    ...FONTS.h2,
    fontWeight: 'bold',
    marginBottom: 0,
    marginRight: SIZES.base,
    textAlign: 'right',
    color: COLORS.primary,
    fontSize: SIZES.h2 * 1.1,
  },
  modalScrollView: {
    width: '100%',
    marginBottom: SIZES.padding,
  },
  emptyCartText: {
    ...FONTS.body3,
    textAlign: 'center', // Keep centered
    color: COLORS.lightGray, // Use a less prominent color
    marginVertical: SIZES.padding * 2,
  },
  modalCartItemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray, // Changed from lightGray2
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base,
  },
  modalCartItemText: {
    ...FONTS.body3,
    flex: 1, // Allow text to take available space
    textAlign: 'right', // Ensure text itself is right-aligned
    writingDirection: 'rtl', // Ensure RTL writing direction
    marginLeft: SIZES.base, // Space between text and delete button
  },
  modalTotal: {
    ...FONTS.h2,
    color: COLORS.primary,
    textAlign: 'right',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.lightGray, // Changed from lightGray2
    marginVertical: SIZES.padding,
    fontWeight: '700', // Fixed fontWeight value
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    width: '90%',
    alignSelf: 'center',
    marginVertical: SIZES.padding,
  },
  paymentOptionTitle: {
    ...FONTS.h4,
    fontWeight: 'bold', // Explicitly set fontWeight
    marginBottom: SIZES.padding / 2,
    textAlign: 'right', // Align payment title to the right
    writingDirection: 'rtl', // Ensure RTL writing direction
  },
  paymentButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding,
    borderRadius: SIZES.radius * 2,
    width: '100%',
    marginVertical: SIZES.base,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    // تأثير عند الضغط
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  paymentButtonText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bankDetailsTitle: {
    ...FONTS.body3,
    fontWeight: 'bold', // Explicitly set fontWeight
    marginBottom: SIZES.base,
    textAlign: 'right', // Align bank title to the right
    writingDirection: 'rtl', // Ensure RTL writing direction
    marginTop: SIZES.base,
  },
  bankDetails: {
    ...FONTS.body4,
    marginBottom: SIZES.base / 2,
    textAlign: 'right', // Align bank details to the right
    writingDirection: 'rtl', // Ensure RTL writing direction
    lineHeight: SIZES.body4 * 1.5, // Improve readability
  },
  closeButton: {
    backgroundColor: COLORS.lightGray,
    padding: SIZES.padding / 2,
    borderRadius: SIZES.radius * 2,
    alignItems: 'center',
    marginTop: SIZES.padding / 2,
    width: '80%',
    alignSelf: 'center',
    elevation: 2,
    shadowColor: COLORS.lightGray, // <-- استبدال COLORS.gray بـ COLORS.lightGray
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  closeButtonText: {
    ...FONTS.body3,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray, // Indicate disabled state
    opacity: 0.7,
  },
  deleteButton: {
    padding: SIZES.base,
    marginLeft: SIZES.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
