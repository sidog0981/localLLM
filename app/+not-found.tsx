import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';

export default function NotFoundScreen() {
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>페이지를 찾을 수 없습니다.</Text>
      <Link href="/" style={[styles.link, { color: tint }]}>
        홈으로 돌아가기
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  link: {
    marginTop: 16,
    padding: 12,
  },
});
