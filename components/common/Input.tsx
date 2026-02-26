import { Text, TextInput, View } from "react-native";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  secure?: boolean;
}

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secure = false,
}: InputProps) {
  return (
    <View className="w-full my-3">
      {label && (
        <Text className="mb-2 text-base heading-font text-black">{label}</Text>
      )}

      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={value}
        secureTextEntry={secure}
        onChangeText={onChangeText}
        className="w-full border border-gray-300 p-4 rounded-xl normal-font text-black"
      />
    </View>
  );
}
