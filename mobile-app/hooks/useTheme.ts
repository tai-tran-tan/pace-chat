import { useMemo } from 'react';
import theme from '../theme';

export const useTheme = () => {
  return useMemo(() => theme, []);
};

export default useTheme; 