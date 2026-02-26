'use client'

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/auth";
import Loader from "../../components/common/Loader";

export default function SignupPage() {
  const router = useRouter();
  const { user, register, loadUser, loading } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("client");
  const [avatar, setAvatar] = useState(null);

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

  const handleAvatarChange = (e) => {
    if (e?.target?.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password) {
      alert("Name, Email, and Password are required!");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("bio", bio);
    formData.append("role", role);
    if (avatar) formData.append("avatar", avatar);

    try {
      await register(formData);
      router.replace("/"); // redirect to main
    } catch (err) {
      alert("Signup failed. Try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>

        {/* Avatar Preview (web file input used like original) */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => document.getElementById("avatarInput")?.click()}
        >
          {avatar ? (
            <Image
              source={{ uri: URL.createObjectURL(avatar) }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarPlaceholder}>Upload Avatar</Text>
          )}
        </TouchableOpacity>

        <input
          id="avatarInput"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
        />

        {/* Inputs */}
        <TextInput
          placeholder="Full Name"
          placeholderTextColor={styles.placeholder.color}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor={styles.placeholder.color}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={styles.placeholder.color}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <TextInput
          placeholder="Bio"
          placeholderTextColor={styles.placeholder.color}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          style={[styles.input, styles.textArea]}
        />

        {/* Role Selector (keeps existing client-only option but styled) */}
        <View style={styles.selectContainer}>
          <TouchableOpacity
            onPress={() => setRole("client")}
            style={[styles.roleButton, role === "client" && styles.roleSelected]}
          >
            <Text style={role === "client" ? styles.roleSelectedText : styles.roleText}>
              Client
            </Text>
          </TouchableOpacity>
        </View>

        {/* Signup Button */}
        <TouchableOpacity
          onPress={handleSignup}
          style={[styles.signupButton, loading && styles.signupButtonDisabled]}
          disabled={loading}
        >
          {loading ? <Loader /> : <Text style={styles.signupButtonText}>Sign Up</Text>}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Text
            style={styles.loginLink}
            onPress={() => router.push("/pages/login")}
          >
            Login
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Theme tokens
  colors: {
    bg: "#000000",
    surface: "#0b0b0b",
    surfaceAlt: "#111111",
    border: "#151515",
    muted: "#bfbfbf",
    text: "#ffffff",
    placeholder: "#a8a8a8",
  },

  page: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#000000", // strict black background
  },

  card: {
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#151515",
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#ffffff",
  },

  avatarButton: {
    alignSelf: "center",
    marginBottom: 18,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#202020",
    overflow: "hidden",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    color: "#a8a8a8",
  },

  input: {
    width: "100%",
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#202020",
    borderRadius: 10,
    backgroundColor: "#111111",
    color: "#ffffff",
  },
  placeholder: {
    color: "#a8a8a8",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  selectContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 18,
  },
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#202020",
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: "#0b0b0b",
  },
  roleSelected: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  roleText: {
    color: "#bfbfbf",
    fontWeight: "600",
  },
  roleSelectedText: {
    color: "#000000",
    fontWeight: "700",
  },

  signupButton: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  signupButtonDisabled: {
    opacity: 0.85,
  },
  signupButtonText: {
    color: "#000000",
    fontWeight: "700",
  },

  footerText: {
    textAlign: "center",
    marginTop: 12,
    color: "#bfbfbf",
  },
  loginLink: {
    color: "#ffffff",
    fontWeight: "700",
  },
});