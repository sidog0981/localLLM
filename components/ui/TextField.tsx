import { Text, TextInput, View, type TextInputProps } from "react-native";

type TextFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  containerClassName?: string;
};

export function TextField({
  label,
  helperText,
  errorMessage,
  containerClassName,
  className,
  editable = true,
  multiline,
  ...props
}: TextFieldProps) {
  const message = errorMessage ?? helperText;

  return (
    <View className={containerClassName}>
      {label ? (
        <Text className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </Text>
      ) : null}
      <TextInput
        className={`rounded-xl border bg-white px-4 text-base text-slate-950 placeholder:text-slate-400 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 ${
          errorMessage
            ? "border-rose-500 focus:border-rose-500"
            : "border-slate-300 focus:border-indigo-500 dark:border-slate-700 dark:focus:border-indigo-400"
        } ${multiline ? "min-h-28 py-3" : "h-12"} ${editable ? "" : "opacity-50"} ${className ?? ""}`}
        editable={editable}
        multiline={multiline}
        {...props}
      />
      {message ? (
        <Text
          className={`mt-1.5 text-xs ${
            errorMessage
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
