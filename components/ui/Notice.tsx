import { Text, View, type ViewProps } from "react-native";

type NoticeTone = "info" | "success" | "warning" | "danger";

type NoticeProps = ViewProps & {
  title: string;
  description: string;
  tone?: NoticeTone;
};

const containerTones: Record<NoticeTone, string> = {
  info: "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950",
  success:
    "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
  warning:
    "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
  danger: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950",
};

const markerTones: Record<NoticeTone, string> = {
  info: "bg-indigo-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

export function Notice({
  title,
  description,
  tone = "info",
  className,
  ...props
}: NoticeProps) {
  return (
    <View
      className={`flex-row gap-3 rounded-2xl border p-4 ${containerTones[tone]} ${className ?? ""}`}
      {...props}
    >
      <View className={`mt-1.5 size-2 rounded-full ${markerTones[tone]}`} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </Text>
        <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
          {description}
        </Text>
      </View>
    </View>
  );
}
