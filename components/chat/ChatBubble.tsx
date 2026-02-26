import { Text, View } from "react-native";

interface ChatBubbleProps {
  message: string;
  isSender?: boolean; // true = user, false = coach
}

export default function ChatBubble({ message, isSender = false }: ChatBubbleProps) {
  return (
    <View
      className={`w-full my-1 px-3 ${
        isSender ? "items-end" : "items-start"
      }`}
    >
      <View
        className={`max-w-[80%] p-3 rounded-2xl border ${
          isSender
            ? "bg-black border-black"
            : "bg-white border-gray-300"
        }`}
      >
        <Text
          className={`${
            isSender ? "text-white" : "text-black"
          } normal-font`}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}
