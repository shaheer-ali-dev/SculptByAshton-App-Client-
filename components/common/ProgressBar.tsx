import { View } from "react-native";

interface ProgressProps {
  progress: number; // between 0 and 1
}

export default function ProgressBar({ progress }: ProgressProps) {
  return (
    <View className="w-full h-4 bg-gray-200 rounded-xl overflow-hidden">
      <View
        className="h-full bg-black"
        style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
      />
    </View>
  );
}
