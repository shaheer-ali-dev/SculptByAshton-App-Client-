import { StyleSheet, Text, TextInput, View } from "react-native";

type SetRepsInputProps = {
 set: number;
 reps: number;
 weight: number;
 onChange: (field: "set" | "reps" | "weight", value: string) => void;
};

export default function SetRepsInput({ set, reps, weight, onChange }:SetRepsInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.col}>
        <Text style={styles.label}>Set</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(set)}
          onChangeText={(v) => onChange("set", v)}
        />
      </View>

      <View style={styles.col}>
        <Text style={styles.label}>Reps</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(reps)}
          onChangeText={(v) => onChange("reps", v)}
        />
      </View>

      <View style={styles.col}>
        <Text style={styles.label}>Weight</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(weight)}
          onChangeText={(v) => onChange("weight", v)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 10,
  },
  col: {
    flex: 1,
  },
  label: {
    fontFamily: "Montserrat",
    fontSize: 14,
    color: "#000",
    marginBottom: 4,
  },
  input: {
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    fontFamily: "Lato",
    color: "#000",
  },
});
