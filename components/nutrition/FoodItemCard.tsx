import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type FoodItemCardProps = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image?: ImageSourcePropType;
};

export default function FoodItemCard({ name, calories, protein, carbs, fats, image }: FoodItemCardProps) {
  return (
    <TouchableOpacity style={styles.card}>
      {image && <Image source={image} style={styles.image} />}

      <View style={styles.info}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.cals}>{calories} kcal</Text>

        <View style={styles.macrosRow}>
          <Text style={styles.macro}>P: {protein}g</Text>
          <Text style={styles.macro}>C: {carbs}g</Text>
          <Text style={styles.macro}>F: {fats}g</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderColor: "#000",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    marginVertical: 8,
    alignItems: "center",
    gap: 14,
  },
  image: {
    width: 55,
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#000",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "Montserrat",
    color: "#000",
  },
  cals: {
    fontSize: 14,
    fontFamily: "Lato",
    color: "#333",
    marginTop: 4,
  },
  macrosRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  macro: {
    fontFamily: "Lato",
    fontSize: 12,
    color: "#222",
  },
});
