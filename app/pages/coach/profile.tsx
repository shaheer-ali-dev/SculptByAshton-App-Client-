"use client";

import React, { useEffect, useState } from "react";
import {
  Platform,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useCoachProfileStore } from "../../../store/useCoachProfileStore";
import * as ImagePicker from "expo-image-picker";

/* ─── Color tokens (matching CRM / meal-plans) ───────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#ebebeb";
const GRAY500 = "#737373";

export default function CoachProfileScreen() {
  const { coach, fetchProfile, updateProfile, loading, error } =
    useCoachProfileStore();

  const [form, setForm] = useState({
    name: "",
    bio: "",
    avatar: "",
    instagram: "",
    youtube: "",
    tiktok: "",
    website: "",
  });

  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);

  /* =====================
     FETCH & POPULATE
  ===================== */
  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (coach) {
      setForm({
        name: coach.name || "",
        bio: coach.bio || "",
        avatar: coach.avatar || "",
        instagram: coach.socialLinks?.instagram || "",
        youtube: coach.socialLinks?.youtube || "",
        tiktok: coach.socialLinks?.tiktok || "",
        website: coach.socialLinks?.website || "",
      });
    }
  }, [coach]);

  /* =====================
     HANDLERS
  ===================== */
  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedAvatar(result.assets[0]);
      setForm((prev) => ({ ...prev, avatar: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    const data = new FormData();

    data.append("name", form.name);
    data.append("bio", form.bio);

    if (selectedAvatar) {
      if (Platform.OS === "web") {
        const response = await fetch(selectedAvatar.uri);
        const blob = await response.blob();
        const fileType = selectedAvatar.uri.split(".").pop();
        const file = new File([blob], `avatar.${fileType}`, { type: blob.type });
        data.append("avatar", file);
      } else {
        const uriParts = selectedAvatar.uri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        data.append("avatar", {
          uri: selectedAvatar.uri,
          name: `avatar.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }
    }

    data.append(
      "socialLinks",
      JSON.stringify({
        instagram: form.instagram,
        youtube: form.youtube,
        tiktok: form.tiktok,
        website: form.website,
      })
    );

    await updateProfile(data);
    Alert.alert("Saved", "Profile updated successfully.");
  };

  /* ── Loading state ── */
  if (!coach && loading) {
    return (
      <LinearGradient
        colors={["#d6d6d6", "#f0f0f0", "#ffffff", "#f0f0f0", "#d6d6d6"]}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={s.container}
      >
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BLACK} />
          <Text style={s.loadingText}>Loading profile…</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#d6d6d6", "#f0f0f0", "#ffffff", "#f0f0f0", "#d6d6d6"]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* ── TOP BAR ── */}
          <View style={s.topBar}>
            <Text style={s.pageTitle}>Coach Profile</Text>
            {loading && <ActivityIndicator color={BLACK} size="small" />}
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── ERROR ── */}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── HERO CARD (Avatar + Name) ── */}
            <View style={s.heroCard}>
              <TouchableOpacity onPress={handleAvatarPick} style={s.avatarWrapper}>
                <Image
                  source={{
                    uri: form.avatar
                      ? form.avatar.startsWith("http")
                        ? form.avatar
                        : `http://localhost:5000${form.avatar}`
                      : "https://ui-avatars.com/api/?name=Coach&background=111&color=fff",
                  }}
                  style={s.avatar}
                />
                <View style={s.avatarOverlay}>
                  <Text style={s.avatarOverlayText}>Change</Text>
                </View>
              </TouchableOpacity>

              <View style={s.heroMeta}>
                <Text style={s.heroName}>{form.name || "Your Name"}</Text>
                <Text style={s.heroSub}>Tap photo to update</Text>
              </View>
            </View>

            {/* ── PERSONAL INFO CARD ── */}
            <View style={s.formCard}>
              <Text style={s.sectionLabel}>Personal Info</Text>

              <LabeledInput
                label="Name"
                value={form.name}
                onChangeText={(t) => handleChange("name", t)}
                placeholder="Full name"
              />
              <LabeledInput
                label="Bio"
                value={form.bio}
                onChangeText={(t) => handleChange("bio", t)}
                placeholder="Tell people about yourself…"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* ── SOCIAL LINKS CARD ── */}
            <View style={[s.formCard, { marginTop: 12 }]}>
              <Text style={s.sectionLabel}>Social Links</Text>

              <LabeledInput
                label="Instagram"
                value={form.instagram}
                onChangeText={(t) => handleChange("instagram", t)}
                placeholder="https://instagram.com/…"
              />
              <LabeledInput
                label="YouTube"
                value={form.youtube}
                onChangeText={(t) => handleChange("youtube", t)}
                placeholder="https://youtube.com/…"
              />
              <LabeledInput
                label="TikTok"
                value={form.tiktok}
                onChangeText={(t) => handleChange("tiktok", t)}
                placeholder="https://tiktok.com/…"
              />
              <LabeledInput
                label="Website"
                value={form.website}
                onChangeText={(t) => handleChange("website", t)}
                placeholder="https://yoursite.com"
              />
            </View>

            {/* ── SAVE BUTTON ── */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={[s.saveBtn, loading && s.saveBtnDisabled]}
            >
              <Text style={s.saveBtnText}>
                {loading ? "Saving…" : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ─── LabeledInput helper ────────────────────────────────── */
function LabeledInput({
  label, value, onChangeText, placeholder, multiline, numberOfLines,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; numberOfLines?: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        style={[
          f.input,
          multiline && {
            height: Math.max(80, (numberOfLines || 1) * 22),
            textAlignVertical: "top",
            paddingTop: 10,
          },
        ]}
        multiline={multiline}
      />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: GRAY500, fontFamily: "System" },

  /* TOP BAR */
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  pageTitle: {
    fontSize: 28, fontWeight: "800", color: BLACK,
    letterSpacing: -0.5, fontFamily: "System",
  },

  /* SCROLL */
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  /* ERROR */
  errorBox: {
    marginBottom: 12,
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { color: "#ef4444", fontSize: 13 },

  /* HERO CARD */
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 18, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  avatarWrapper: {
    width: 72, height: 72, borderRadius: 36,
    overflow: "hidden", marginRight: 14,
    backgroundColor: GRAY200,
  },
  avatar: { width: "100%", height: "100%" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center", alignItems: "center",
  },
  avatarOverlayText: { color: WHITE, fontSize: 12, fontWeight: "700" },
  heroMeta: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  heroSub:  { fontSize: 13, color: GRAY500, marginTop: 3, fontFamily: "System" },

  /* FORM CARD */
  formCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: "700", color: GRAY500,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: 14, fontFamily: "System",
  },

  /* SAVE BUTTON */
  saveBtn: {
    backgroundColor: BLACK, paddingVertical: 15,
    borderRadius: 14, alignItems: "center", marginTop: 16,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },
});

/* ─── Form field styles ──────────────────────────────────── */
const f = StyleSheet.create({
  label: {
    fontSize: 11, fontWeight: "700", color: GRAY500,
    textTransform: "uppercase", letterSpacing: 0.5,
    marginBottom: 6, fontFamily: "System",
  },
  input: {
    backgroundColor: GRAY100, color: BLACK, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    fontFamily: "System", borderWidth: 1, borderColor: GRAY200,
  },
});
