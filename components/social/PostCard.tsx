import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type PostCardProps = {
 avatar: any;
 username: string; 
    text: string;
    image: string | null;
    likes: number;
    comments: number;
    time: string;
    onLike: () => void;
    onComment: () => void;
};

export default function PostCard({
  avatar,
  username,
  text,
  image,
  likes,
  comments,
  time,
  onLike,
  onComment,
}:PostCardProps) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={avatar} style={styles.avatar} />
        <View>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </View>

      {/* Text */}
      <Text style={styles.text}>{text}</Text>

      {/* Image */}
      {image && (
        <Image source={{ uri: image }} style={styles.postImage} />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Text style={styles.actionText}>❤️ {likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onComment}>
          <Text style={styles.actionText}>💬 {comments}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#000",
  },
  username: {
    fontFamily: "Montserrat",
    fontSize: 16,
    color: "#000",
  },
  time: {
    fontFamily: "Lato",
    fontSize: 12,
    color: "#666",
  },
  text: {
    fontFamily: "Lato",
    fontSize: 15,
    color: "#000",
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 250,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#000",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    borderWidth: 2,
    borderColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionText: {
    fontFamily: "Montserrat",
    fontSize: 15,
    color: "#000",
  },
});
