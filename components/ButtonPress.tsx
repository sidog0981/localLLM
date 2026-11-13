import { Pressable, type PressableProps } from 'react-native';

export default function ButtonPress(props: PressableProps) {
  return <Pressable accessibilityRole="button" {...props} />;
}
