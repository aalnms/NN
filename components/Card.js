import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons'; // Assuming FontAwesome5 is used
import { COLORS, SIZES, FONTS } from '../src/theme'; // Adjust path if necessary

// Added onAddToCart prop, made onPress optional
// Removed TypeScript type annotations from JS file
const Card = ({ iconName, title, description, onPress, onAddToCart }) => {
  // Determine if the description looks like a price to apply specific style
  const isPrice = /\d/.test(description) && /ريال|SAR/i.test(description); // Simple check for digits and currency
  const isContactForPrice = /تواصل للسعر/i.test(description);

  return (
    // Card container - still touchable if onPress is provided, but main action is button
    <TouchableOpacity
      style={[styles.card, { direction: 'rtl' }]}
      onPress={onPress} // Keep original onPress if needed for navigation later
      activeOpacity={onPress ? 0.7 : 1} // Only change opacity if it's pressable
      disabled={!onPress} // Disable touch effect if no onPress provided
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        {/* Increased icon size */}
        <FontAwesome5 name={iconName} size={SIZES.h1 * 1.5} color={COLORS.primary} />
      </View>

      {/* Text Content */}
      <View style={[styles.textContainer, { alignItems: 'center' }]}>
        <Text style={[styles.title, { writingDirection: 'rtl' }]}>{title}</Text>
        <Text style={[styles.description, isPrice && styles.price, { writingDirection: 'rtl' }]}>
          {description}
        </Text>
      </View>

      {/* Add to Cart Button - Conditionally render if not "Contact for Price" */}
      {!isContactForPrice && (
        <TouchableOpacity style={styles.addButton} onPress={onAddToCart} activeOpacity={0.8}>
          <FontAwesome5 name="cart-plus" size={SIZES.h4} color={COLORS.white} style={{ marginRight: SIZES.base }} />
          <Text style={[styles.addButtonText, { writingDirection: 'rtl' }]}>أضف للسلة</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 1.5,
    padding: SIZES.padding,
    margin: SIZES.base / 2,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '47%', // تحديد عرض البطاقة لتناسب العرض
    minHeight: 180, // تقليل الارتفاع
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: SIZES.padding / 2,
    backgroundColor: COLORS.lightGray, // Changed from lightGray2
    padding: SIZES.padding / 2,
    borderRadius: SIZES.radius,
  },
  title: {
    ...FONTS.h4,
    fontSize: SIZES.body3, // تكبير حجم الخط
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SIZES.base,
    lineHeight: SIZES.h4 * 1.2,
  },
  description: {
    ...FONTS.body4,
    fontSize: SIZES.body4,
    color: COLORS.text,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: SIZES.base,
  },
  price: {
    ...FONTS.h4,
    color: COLORS.primary,
    fontWeight: '700',
    opacity: 1,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius * 2,
    marginTop: SIZES.base,
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    ...FONTS.body4,
    color: COLORS.white,
    fontWeight: 'bold',
    marginRight: SIZES.base,
  },
});

export default Card;
