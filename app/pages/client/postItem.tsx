import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Post } from "../../../store/usePostStore";

interface Props {
  post: Post;
  onPress?: () => void;
  // optional prop: when true, render a small square thumbnail like Instagram feed grid
  thumbnail?: boolean;
}

// Change BASE_URL according to your setup
const BASE_URL = "http://sculptbyashton.com:5000"; // Android emulator
// For real device: replace with PC IP

export default function PostItem({ post, onPress, thumbnail = true }: Props) {
  if (!post) return null;

  const descriptionText = post.description ?? "";
  const shortDescription =
    descriptionText.length > 100
      ? descriptionText.slice(0, 100) + "..."
      : descriptionText;

  const imageUri = post.imageUrl?.startsWith("http")
    ? post.imageUrl
    : `${BASE_URL}${post.imageUrl}`;

  const date = new Date(post.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Thumbnail layout (small square on the left) vs full-width square
  if (thumbnail) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.rowCard}>
          <Image source={{ uri: imageUri }} style={styles.thumb} />

          <View style={styles.content}>
            <Text style={styles.title}>{post.title || "Untitled"}</Text>
            <Text style={styles.description} numberOfLines={3}>
              {shortDescription}
            </Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Full-width square image (Instagram single post style)
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={styles.card}>
        <Image source={{ uri: imageUri }} style={styles.squareImage} />

        <View style={styles.content}>
          <Text style={styles.title}>{post.title || "Untitled"}</Text>
          <Text style={styles.description}>{shortDescription}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // dark themed card for full-width square image
  card: {
    backgroundColor: "#0b0b0b",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#151515",
    elevation: 2,
  },

  // row style: small thumbnail on left, text on right
  rowCard: {
    flexDirection: "row",
    backgroundColor: "#0b0b0b",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#151515",
  },

  // small square thumbnail (keeps spacing consistent)
  thumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 12,
    resizeMode: "cover",
    backgroundColor: "#111111",
  },

  // full-width square image (1:1)
  squareImage: {
    width: "100%",
    aspectRatio: 1,
    resizeMode: "cover",
    backgroundColor: "#111111",
  },

  content: {
    flex: 1,
    paddingRight: 4,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#ffffff",
  },
  description: {
    fontSize: 13,
    color: "#bfbfbf",
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    color: "#9a9a9a",
  },
});