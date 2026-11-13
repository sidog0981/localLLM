import { Text, View } from "react-native";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <View className="mb-4">
      {eyebrow ? (
        <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          {eyebrow}
        </Text>
      ) : null}
      <Text className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
        {title}
      </Text>
      {description ? (
        <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
