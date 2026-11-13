import { Text, View, type ViewProps } from "react-native";

type CardProps = ViewProps & {
  title?: string;
  description?: string;
  contentClassName?: string;
};

export function Card({
  title,
  description,
  contentClassName,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${
        className ?? ""
      }`}
      {...props}
    >
      {title ? (
        <Text className="text-base font-bold text-slate-950 dark:text-white">
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text
          className={`text-sm leading-5 text-slate-500 dark:text-slate-400 ${title ? "mt-1" : ""}`}
        >
          {description}
        </Text>
      ) : null}
      {children ? (
        <View
          className={`${title || description ? "mt-4" : ""} ${contentClassName ?? ""}`}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
