import { Pressable, Text, type PressableProps } from "react-native";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "small" | "medium" | "large";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  textClassName?: string;
};

const containerVariants: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 active:bg-indigo-700",
  secondary:
    "bg-slate-900 active:bg-slate-700 dark:bg-white dark:active:bg-slate-200",
  outline:
    "border border-slate-300 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800",
  ghost: "bg-transparent active:bg-slate-100 dark:active:bg-slate-800",
  danger: "bg-rose-600 active:bg-rose-700",
};

const textVariants: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-white dark:text-slate-950",
  outline: "text-slate-700 dark:text-slate-200",
  ghost: "text-slate-700 dark:text-slate-200",
  danger: "text-white",
};

const sizeVariants: Record<ButtonSize, string> = {
  small: "min-h-9 px-3 py-2",
  medium: "min-h-11 px-4 py-2.5",
  large: "min-h-13 px-5 py-3",
};

const textSizeVariants: Record<ButtonSize, string> = {
  small: "text-sm",
  medium: "text-base",
  large: "text-base",
};

export function Button({
  label,
  variant = "primary",
  size = "medium",
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`items-center justify-center rounded-xl ${containerVariants[variant]} ${sizeVariants[size]} ${
        disabled ? "opacity-50" : ""
      } ${className ?? ""}`}
      disabled={disabled}
      {...props}
    >
      <Text
        className={`font-semibold ${textVariants[variant]} ${textSizeVariants[size]} ${
          textClassName ?? ""
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
