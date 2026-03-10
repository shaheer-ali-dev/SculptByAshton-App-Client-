import { useFonts } from "expo-font";
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuthStore } from "../store/auth";
import { Storage } from "../utils/storage";

export default function RootLayout() {
  const router = useRouter();
  const { user, loadUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // ✅ _layout.tsx is at app/_layout.tsx so ../assets points to root /assets
  const [loaded] = useFonts({
    "Lato-Regular": require("../assets/CanvaSans-Bold.otf"),
  });

  useEffect(() => {
    const init = async () => {
      try {
        const token = await Storage.get("token");
        if (!token) { setLoading(false); return; }
        await loadUser();
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/pages/login");
    }
  }, [loading, user]);

  if (loading || !loaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
});