import { StyleSheet, Text, TouchableOpacity } from "react-native";

type WorkoutCardProps = {
    title: string;
    duration: number;
    exercises: number;
    onPress: () => void;
};

export default function WorkoutCard({ title, duration, exercises, onPress }:WorkoutCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.detail}>{duration} mins • {exercises} exercises</Text>

      <Text style={styles.button}>Start Workout →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
    padding: 18,
    borderRadius: 18,
    marginVertical: 12,
  },
  title: {
    fontFamily: "Montserrat",
    fontSize: 18,
    color: "#000",
    marginBottom: 6,
  },
  detail: {
    fontFamily: "Lato",
    fontSize: 14,
    color: "#444",
    marginBottom: 14,
  },
  button: {
    fontFamily: "Montserrat",
    fontSize: 15,
    color: "#000",
  },
});
