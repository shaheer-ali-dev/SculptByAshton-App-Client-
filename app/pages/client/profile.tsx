"use client";

import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useClientProfileStore, UserProfile } from "../../../store/useClientProfileStore";

export default function ClientProfileScreen() {
  const { profile, fetchProfile, updateProfile, deleteProfile, loading, error } =
    useClientProfileStore();

  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);

  /* ── Reactive dimensions ── */
  const { width } = useWindowDimensions();
  const isWide  = width >= 640;
  const maxW    = Math.min(width, 640);

  useEffect(() => { fetchProfile(); }, []);
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const handleChange = (key: keyof UserProfile, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedAvatar(result.assets[0]);
      handleChange("avatar", result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      Object.keys(form).forEach(key => {
        const value = (form as any)[key];
        if (value !== undefined && value !== null) {
          if (typeof value === "object" && !Array.isArray(value)) {
            data.append(key, JSON.stringify(value));
          } else {
            data.append(key, String(value));
          }
        }
      });
      if (selectedAvatar) {
        if (Platform.OS === "web") {
          const response = await fetch(selectedAvatar.uri);
          const blob = await response.blob();
          const fileType = selectedAvatar.uri.split(".").pop();
          data.append("avatar", new File([blob], `avatar.${fileType}`, { type: blob.type }));
        } else {
          const uriParts = selectedAvatar.uri.split(".");
          const fileType = uriParts[uriParts.length - 1];
          data.append("avatar", { uri: selectedAvatar.uri, name: `avatar.${fileType}`, type: `image/${fileType}` } as any);
        }
      }
      await updateProfile(data);
      Alert.alert("Saved ✓", "Your profile has been updated.");
    } catch {
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Profile", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteProfile();
          Alert.alert("Deleted", "Your profile has been removed.");
        },
      },
    ]);
  };

  if (!profile && loading) {
    return (
      <LinearGradient
       colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
        style={s.container}
      >
        <View style={s.center}>
          <ActivityIndicator size="large" color="#111" />
          <Text style={s.loadingText}>Loading profile…</Text>
        </View>
      </LinearGradient>
    );
  }

  const avatarUri = form.avatar
    ? form.avatar.startsWith("http") ? form.avatar : `http://sculptbyashton.com:5000${form.avatar}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(form.firstName || "U")}&background=111111&color=ffffff&size=200`;

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "Your Name";

  return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={[s.scrollContent, { alignItems: isWide ? "center" : undefined }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Constrained inner wrapper */}
        <View style={{ width: "100%", maxWidth: maxW }}>

          {/* ── PAGE TITLE ── */}
          <Text style={s.pageTitle}>Profile</Text>

          {/* ── ERROR ── */}
          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* ── AVATAR HERO CARD ── */}
          <View style={s.heroCard}>
            <TouchableOpacity onPress={handleAvatarPick} style={s.avatarWrap} activeOpacity={0.85}>
              <Image source={{ uri: avatarUri }} style={s.avatar} />
              <View style={s.avatarOverlay}>
                <Text style={s.avatarOverlayText}>Change</Text>
              </View>
            </TouchableOpacity>
            <Text style={s.heroName}>{displayName}</Text>
            <Text style={s.heroSub}>{form.email || "Tap photo to update"}</Text>
          </View>

          {/* ── PERSONAL INFO ── */}
          <Text style={s.sectionLabel}>Personal Info</Text>

          <View style={s.card}>
            <View style={s.row}>
              <View style={s.halfField}>
                <Text style={s.label}>First Name</Text>
                <TextInput
                  value={form.firstName}
                  onChangeText={t => handleChange("firstName", t)}
                  style={s.input}
                  placeholder="First name"
                  placeholderTextColor="#bbb"
                />
              </View>
              <View style={s.halfField}>
                <Text style={s.label}>Last Name</Text>
                <TextInput
                  value={form.lastName}
                  onChangeText={t => handleChange("lastName", t)}
                  style={s.input}
                  placeholder="Last name"
                  placeholderTextColor="#bbb"
                />
              </View>
            </View>

            <Text style={s.label}>Email</Text>
            <TextInput
              value={form.email}
              editable={false}
              style={[s.input, s.disabledInput]}
            />

            <Text style={s.label}>Phone Number</Text>
            <TextInput
              value={form.phoneNumber}
              onChangeText={t => handleChange("phoneNumber", t)}
              style={s.input}
              placeholder="+1 555 000 0000"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
            />

            <Text style={s.label}>Bio</Text>
            <TextInput
              value={form.bio}
              onChangeText={t => handleChange("bio", t)}
              style={[s.input, s.textarea]}
              multiline
              placeholder="Tell something about yourself…"
              placeholderTextColor="#bbb"
              textAlignVertical="top"
            />

            {form.note ? (
              <>
                <Text style={s.label}>Note from Coach</Text>
                <View style={s.noteBox}>
                  <Text style={s.noteText}>{form.note}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* ── BODY STATS ── */}
          <Text style={s.sectionLabel}>Body Stats</Text>

          <View style={s.card}>
            <View style={s.row}>
              <View style={s.halfField}>
                <Text style={s.label}>Gender</Text>
                <TextInput
                  value={form.gender}
                  onChangeText={t => handleChange("gender", t)}
                  style={s.input}
                  placeholder="Male / Female / Other"
                  placeholderTextColor="#bbb"
                />
              </View>
              <View style={s.halfField}>
                <Text style={s.label}>Age</Text>
                <TextInput
                  value={form.age?.toString() || ""}
                  onChangeText={t => handleChange("age", Number(t))}
                  style={s.input}
                  keyboardType="numeric"
                  placeholder="e.g. 25"
                  placeholderTextColor="#bbb"
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={s.halfField}>
                <Text style={s.label}>Height (cm)</Text>
                <TextInput
                  value={form.height?.toString() || ""}
                  onChangeText={t => handleChange("height", Number(t))}
                  style={s.input}
                  keyboardType="numeric"
                  placeholder="e.g. 165"
                  placeholderTextColor="#bbb"
                />
              </View>
              <View style={s.halfField}>
                <Text style={s.label}>Weight (kg)</Text>
                <TextInput
                  value={form.weight?.toString() || ""}
                  onChangeText={t => handleChange("weight", Number(t))}
                  style={s.input}
                  keyboardType="numeric"
                  placeholder="e.g. 60"
                  placeholderTextColor="#bbb"
                />
              </View>
            </View>
          </View>

          {/* ── SAVE BUTTON ── */}
          <TouchableOpacity
            style={[s.saveBtn, loading && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>

          {/* ── DELETE BUTTON ── */}
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.88}
          >
            <Text style={s.deleteBtnText}>Delete Profile</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

/* ─── styles ─────────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#ebebeb";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex:1, justifyContent:"center", alignItems:"center" },
  loadingText: { marginTop: 10, color: GRAY500, fontSize: 14, fontFamily: "System" },

  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  /* ── TITLE ── */
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: BLACK,
    letterSpacing: -0.5,
    fontFamily: "Lato-Regular",
    marginBottom: 20,
  },

  /* ── ERROR ── */
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { color: "#ef4444", fontSize: 13 },

  /* ── HERO CARD ── */
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: GRAY200,
  },
  avatar: { width: "100%", height: "100%" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOverlayText: { color: WHITE, fontSize: 13, fontWeight: "700" },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: BLACK,
    fontFamily: "Lato-Regular",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: GRAY500,
    marginTop: 4,
    fontFamily: "Lato-Regular",
  },

  /* ── SECTION LABELS ── */
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: GRAY500,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Lato-Regular",
    marginBottom: 8,
    marginLeft: 2,
  },

  /* ── CARD ── */
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  /* ── FORM FIELDS ── */
  row: { flexDirection: "row", gap: 10 },
  halfField: { flex: 1 },

  label: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY500,
    marginBottom: 5,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Lato-Regular",
  },
  input: {
    backgroundColor: GRAY100,
    color: BLACK,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
    fontFamily: "Lato-Regular",
    borderWidth: 1,
    borderColor: GRAY200,
  },
  textarea: { height: 90, paddingTop: 11 },
  disabledInput: { opacity: 0.5 },

  noteBox: {
    backgroundColor: GRAY100,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: GRAY300,
  },
  noteText: { fontSize: 13, color: GRAY500, lineHeight: 20 },

  /* ── BUTTONS ── */
  saveBtn: {
    backgroundColor: BLACK,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 16,
    fontFamily: "Lato-Regular",
    letterSpacing: -0.2,
  },
  deleteBtn: {
    backgroundColor: "rgba(239,68,68,0.07)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
  },
  deleteBtnText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 15,
    fontFamily: "Lato-Regular",
  },
});