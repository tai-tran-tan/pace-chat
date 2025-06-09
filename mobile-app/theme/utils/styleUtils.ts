import { Dimensions } from 'react-native';

export const { width, height } = Dimensions.get('window');

export function scale(size: number) {
  return (width / 375) * size;
}

export function font(fontSize: number, fontWeight: string = '400', color: string = '#222') {
  return { fontSize, fontWeight, color };
} 