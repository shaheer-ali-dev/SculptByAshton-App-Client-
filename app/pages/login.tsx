'use client'

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/auth";
import Loader from "../../components/common/Loader";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loadUser, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Load user if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      loadUser();
    }
  }, []);

  // Redirect if logged in
  useEffect(() => {
    if (user) {
      router.replace("/"); // main screen
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter Email and Password");
      return;
    }

    try {
      await login(email, password);
      router.replace("/"); // redirect to main
    } catch (err) {
      alert("Login failed. Check credentials.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        {/* Inputs */}
        <TextInput
          placeholder="Email"
          placeholderTextColor={styles.placeholder.color}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={styles.placeholder.color}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <Loader />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Link to Signup */}
        <Text style={styles.signupText}>
          Don't have an account?{" "}
          <Text
            style={styles.signupLink}
            onPress={() => router.push("/pages/signup")}
          >
            Sign Up
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Page / background: strict black
  page: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#000000", // strict black background
  },

  // Card (surface) uses very dark gray to create subtle depth
  card: {
    backgroundColor: "#0b0b0b", // dark surface
    borderRadius: 12,
    padding: 25,
    borderWidth: 1,
    borderColor: "#151515",
    // subtle shadow tuned for dark theme
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },

  // Title / text
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#ffffff",
  },

  // Inputs: dark background, light gray placeholder, white input text
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#202020",
    borderRadius: 8,
    backgroundColor: "#111111",
    color: "#ffffff", // input text color
  },
  placeholder: {
    color: "#a8a8a8",
  },

  // Login button: white CTA for highest contrast on black background
  loginButton: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: "#000000",
    fontWeight: "600",
  },

  // Signup text / link
  signupText: {
    textAlign: "center",
    marginTop: 15,
    color: "#bfbfbf",
  },
  signupLink: {
    color: "#ffffff",
    fontWeight: "600",
  },
});