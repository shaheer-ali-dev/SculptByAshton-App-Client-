import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

interface ChatInputProps {
  onSend: (msg: string) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <View className="flex-row items-center p-3 border-t border-gray-300 bg-white">
      <TextInput
        className="flex-1 p-3 rounded-xl border border-gray-400 normal-font"
        placeholder="Type a message..."
        placeholderTextColor="#888"
        value={text}
        onChangeText={setText}
      />

      <TouchableOpacity
        onPress={handleSend}
        className="ml-3 bg-black px-4 py-3 rounded-xl"
      >
        <Text className="text-white heading-font">Send</Text>
      </TouchableOpacity>
    </View>
  );
}
