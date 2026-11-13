import { Pressable, Text, View, type PressableProps } from "react-native";

type ToggleProps = Omit<PressableProps, "children" | "onPress"> & {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function Toggle({
  label,
  description,
  value,
  onValueChange,
  disabled,
  className,
  ...props
}: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      className={`flex-row items-center justify-between gap-4 ${disabled ? "opacity-50" : ""} ${
        className ?? ""
      }`}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      {...props}
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-slate-900 dark:text-white">
          {label}
        </Text>
        {description ? (
          <Text className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        className={`h-7 w-12 justify-center rounded-full px-1 ${
          value ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <View
          className={`size-5 rounded-full bg-white shadow-sm ${value ? "translate-x-5" : "translate-x-0"}`}
        />
      </View>
    </Pressable>
  );
}
