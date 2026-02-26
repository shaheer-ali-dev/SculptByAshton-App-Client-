"use client";

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCalorieStore } from "../../../store/useCalorieStore";

export default function CalorieScreen() {
  const [dish, setDish] = useState("");
  const [servings, setServings] = useState("1");

  const { fetchCalories, nutrition, loading, error, clear } = useCalorieStore();

  const handleSubmit = async () => {
    if (!dish.trim()) return;
    clear(); // reset previous data
    await fetchCalories(dish.trim(), Number(servings) || 1);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: styles.tokens.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Calorie Meter</Text>
        <Text style={styles.subtitle}>
          Quickly estimate nutrition for a dish. Enter the dish name and servings.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Dish</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Grilled chicken salad"
            placeholderTextColor={styles.tokens.muted}
            value={dish}
            onChangeText={setDish}
            returnKeyType="done"
          />

          <Text style={styles.label}>Servings</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor={styles.tokens.muted}
            keyboardType="numeric"
            value={servings}
            onChangeText={setServings}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={styles.tokens.primary} />
            ) : (
              <Text style={styles.buttonText}>Calculate</Text>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {nutrition && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultHeading}>Nutrition (per serving)</Text>
            <View style={styles.row}>
              <Text style={styles.resultLabel}>Calories</Text>
              <Text style={styles.resultValue}>{nutrition.Calories} kcal</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.resultLabel}>Protein</Text>
              <Text style={styles.resultValue}>{nutrition.Protein} g</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.resultLabel}>Carbs</Text>
              <Text style={styles.resultValue}>{nutrition.Carbs} g</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.resultLabel}>Fat</Text>
              <Text style={styles.resultValue}>{nutrition.Fat} g</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tokens: {
    bg: "#000000",
    surface: "#0b0b0b",
    surfaceAlt: "#111111",
    border: "#151515",
    muted: "#9a9a9a",
    text: "#ffffff",
    accent: "#4ade80",
    primary: "#000000",
  },

  kav: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#000000",
    alignItems: "stretch",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  subtitle: {
    color: "#9a9a9a",
    marginBottom: 18,
  },

  form: {
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#151515",
    marginBottom: 16,
  },

  label: {
    color: "#bfbfbf",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },

  input: {
    width: "100%",
    backgroundColor: "#111111",
    color: "#ffffff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },

  button: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 16,
  },

  error: {
    marginTop: 10,
    color: "#ff8b8b",
    textAlign: "center",
  },

  resultContainer: {
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#151515",
  },
  resultHeading: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
  },
  resultLabel: {
    color: "#9a9a9a",
    fontWeight: "700",
  },
  resultValue: {
    color: "#ffffff",
    fontWeight: "800",
  },
});