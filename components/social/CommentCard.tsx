import { Image, StyleSheet, Text, View } from "react-native";

type CommentCardProps = {
 avatar: any;
 username: string;
 comment: string;
 time: string;
};

export default function CommentCard({ avatar, username, comment, time }:CommentCardProps) {
  return (
    <View style={styles.container}>
      <Image source={avatar} style={styles.avatar} />

      <View style={styles.right}>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.comment}>{comment}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderColor: "#000",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#000",
  },
  right: {
    flex: 1,
  },
  username: {
    fontFamily: "Montserrat",
    fontSize: 15,
    color: "#000",
  },
  comment: {
    fontFamily: "Lato",
    fontSize: 14,
    color: "#222",
    marginTop: 4,
  },
  time: {
    marginTop: 6,
    fontFamily: "Lato",
    fontSize: 12,
    color: "#666",
  },
});
