import { Text, View, type ViewProps } from "react-native";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

type BadgeProps = ViewProps & {
  label: string;
  tone?: BadgeTone;
};

const containerTones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 dark:bg-slate-800",
  primary: "bg-indigo-100 dark:bg-indigo-950",
  success: "bg-emerald-100 dark:bg-emerald-950",
  warning: "bg-amber-100 dark:bg-amber-950",
  danger: "bg-rose-100 dark:bg-rose-950",
};

const textTones: Record<BadgeTone, string> = {
  neutral: "text-slate-600 dark:text-slate-300",
  primary: "text-indigo-700 dark:text-indigo-300",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  danger: "text-rose-700 dark:text-rose-300",
};

export function Badge({
  label,
  tone = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${containerTones[tone]} ${className ?? ""}`}
      {...props}
    >
      <Text className={`text-xs font-semibold ${textTones[tone]}`}>
        {label}
      </Text>
    </View>
  );
}
