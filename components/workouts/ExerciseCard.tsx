
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ExerciseCardProps = {
 name: string;
 sets: number; 
    reps: number;
    image: string;
    onPress: () => void;
};

export default function ExerciseCard({
  name,
  sets,
  reps,
  image,
  onPress,
}:ExerciseCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: image }} style={styles.thumbnail} />

      <View style={styles.right}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>{sets} sets • {reps} reps</Text>
      </View>

      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 16,
    padding: 12,
    marginVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnail: {
    width: 65,
    height: 65,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
  },
  right: {
    flex: 1,
  },
  name: {
    fontFamily: "Montserrat",
    fontSize: 16,
    color: "#000",
  },
  sub: {
    marginTop: 4,
    fontFamily: "Lato",
    fontSize: 13,
    color: "#444",
  },
  arrow: {
    fontSize: 22,
    fontFamily: "Montserrat",
    color: "#000",
  },
});
