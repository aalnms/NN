import { ViewStyle, TextStyle } from 'react-native';

export type FontWeight = '400' | '500' | '600' | '700' | 'normal' | 'bold';
export type UserSelect = 'none' | 'auto' | 'text' | 'contain' | 'all';
export type CursorValue = 'auto' | 'pointer' | 'default';

export interface StyledViewProps extends Omit<ViewStyle, 'cursor'> {
  fontWeight?: FontWeight;
  userSelect?: UserSelect;
  cursor?: CursorValue;
}

export interface StyledTextProps extends Omit<TextStyle, 'userSelect'> {
  fontWeight?: FontWeight;
  userSelect?: UserSelect;
}
