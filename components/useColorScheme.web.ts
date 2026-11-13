import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useClientOnlyValue } from './useClientOnlyValue';

export function useColorScheme() {
  const colorScheme = useNativeColorScheme();
  return useClientOnlyValue('light' as const, colorScheme === 'dark' ? 'dark' : 'light');
}
