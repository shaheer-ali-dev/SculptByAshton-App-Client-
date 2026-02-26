import { Image, View } from "react-native";

interface AvatarProps {
  uri?: string;
  size?: number;
}

export default function Avatar({ uri, size = 50 }: AvatarProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: "#e5e5e5",
      }}
    >
      <Image
        source={
          uri
            ? { uri }
            : require("../../assets//images/default-avatar.png") // Add one
        }
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
