import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import Loader from "../../components/common/Loader";
import { useAuthStore } from "../../store/auth";
import { Storage } from "../../utils/storage";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loadUser, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkToken = async () => {
      const token = await Storage.get("token");
      if (token) loadUser();
    };
    checkToken();
  }, []);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter Email and Password");
      return;
    }
    try {
      await login(email, password);
      router.replace("/");
    } catch (err: any) {
      // ✅ Log the REAL error so we can see exactly what's happening
      const status   = err?.response?.status;
      const msg      = err?.response?.data?.msg;
      const code     = err?.code;
      const errMsg   = err?.message;

      console.error("❌ Login error:", { status, msg, code, errMsg });

      // Show the actual server message if available, otherwise the raw error
      const displayMsg = msg || `${code || ""} ${errMsg || "Unknown error"}`.trim();
      Alert.alert("Login Failed", displayMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#a8a8a8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#a8a8a8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCorrect={false}
          style={styles.input}
        />
        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          disabled={loading}
        >
          {loading ? <Loader /> : <Text style={styles.loginButtonText}>Login</Text>}
        </TouchableOpacity>
        <Text style={styles.signupText}>
          Don't have an account?{" "}
          <Text style={styles.signupLink} onPress={() => router.push("/pages/signup")}>
            Sign Up
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: "center", padding: 20, backgroundColor: "#000000" },
  card: { backgroundColor: "#0b0b0b", borderRadius: 12, padding: 25, borderWidth: 1, borderColor: "#151515", shadowColor: "#000", shadowOpacity: 0.7, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 20, textAlign: "center", color: "#ffffff" },
  input: { width: "100%", padding: 12, marginBottom: 15, borderWidth: 1, borderColor: "#202020", borderRadius: 8, backgroundColor: "#111111", color: "#ffffff" },
  loginButton: { backgroundColor: "#ffffff", padding: 15, borderRadius: 10, alignItems: "center", marginBottom: 10 },
  loginButtonDisabled: { opacity: 0.8 },
  loginButtonText: { color: "#000000", fontWeight: "600" },
  signupText: { textAlign: "center", marginTop: 15, color: "#bfbfbf" },
  signupLink: { color: "#ffffff", fontWeight: "600" },
});