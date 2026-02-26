import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { launchImageLibrary } from "react-native-image-picker";
import { usePostStore } from "../../../store/usePostStore";

export default function CreatePostScreen({ navigation }: any) {
  const createPost = usePostStore(s => s.createPost);
  const loading    = usePostStore(s => s.loading);

  const [image, setImage]             = useState<any>(null);
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");

  /* ── Reactive dimensions (updates on window resize) ── */
  const { width } = useWindowDimensions();
  const isWide     = width >= 640;
  const maxW       = Math.min(width, 600);
  const imageH     = isWide ? 340 : Math.round(width * 0.68);

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setImage(asset);
    } catch (err) {
      Alert.alert("Error", "Could not pick image");
    }
  };

  const submit = async () => {
    if (!image) return Alert.alert("Missing photo", "Please select an image first.");

    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      const file = new File([blob], image.fileName || `photo-${Date.now()}.jpg`, {
        type: image.type || "image/jpeg",
      });
      formData.append("image", file);
    } else {
      let uri = image.uri;
      if (!uri.startsWith("file://") && Platform.OS === "android") {
        uri = "file://" + uri;
      }
      formData.append("image", {
        uri,
        name: image.fileName || `photo-${Date.now()}.jpg`,
        type: image.type || "image/jpeg",
      } as any);
    }

    formData.append("title", title);
    formData.append("description", description);

    try {
      await createPost(formData);
      setTitle("");
      setDescription("");
      setImage(null);
      Alert.alert("Posted ✓", "Your post is live!");
      navigation?.goBack?.();
    } catch {
      Alert.alert("Error", "Failed to create post");
    }
  };

  return (
    <LinearGradient
      colors={["#d6d6d6","#f0f0f0","#ffffff","#f0f0f0","#d6d6d6"]}
      locations={[0,0.2,0.5,0.8,1]}
      start={{x:0.5,y:0}} end={{x:0.5,y:1}}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={s.scrollOuter}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Centered constrained content ── */}
          <View style={[s.inner, { maxWidth: maxW }]}>

            {/* ── Header ── */}
            <View style={s.topBar}>
              <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.backBtn}>
                <Text style={s.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <Text style={s.pageTitle}>New Post</Text>
              <View style={{ width: 60 }} />
            </View>

            {/* ── Image picker ── */}
            <TouchableOpacity
              style={[s.imagePicker, { height: imageH }]}
              onPress={pickImage}
              activeOpacity={0.88}
            >
              {image ? (
                <Image
                  source={{ uri: image.uri }}
                  style={s.imagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.imagePlaceholder}>
                  <Text style={[s.imagePlaceholderEmoji, isWide && { fontSize: 52 }]}>📷</Text>
                  <Text style={[s.imagePlaceholderTitle, isWide && { fontSize: 19 }]}>Add a photo</Text>
                  <Text style={s.imagePlaceholderSub}>Tap to choose from your library</Text>
                </View>
              )}

              {/* Change photo chip when image selected */}
              {image && (
                <View style={s.changePhotoChip}>
                  <Text style={s.changePhotoText}>Change photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ── Form card ── */}
            <View style={s.card}>

              <Text style={s.fieldLabel}>Title</Text>
              <TextInput
                placeholder="Give your post a title…"
                placeholderTextColor="#bbb"
                value={title}
                onChangeText={setTitle}
                style={s.input}
                maxLength={100}
              />

              <Text style={s.fieldLabel}>Description</Text>
              <TextInput
                placeholder="What's on your mind?"
                placeholderTextColor="#bbb"
                value={description}
                onChangeText={setDescription}
                style={[s.input, s.textArea]}
                maxLength={500}
                multiline
                textAlignVertical="top"
              />

              {/* Character count */}
              <Text style={s.charCount}>{description.length}/500</Text>
            </View>

            {/* ── Post button ── */}
            <TouchableOpacity
              style={[s.postBtn, loading && s.postBtnDisabled]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.postBtnText}>Share Post</Text>
              }
            </TouchableOpacity>

            {/* ── Cancel ── */}
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => navigation?.goBack?.()}
              activeOpacity={0.7}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
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
  safe:      { flex: 1 },

  /* Outer scroll centres the inner content block */
  scrollOuter: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },

  /* Inner block is width-constrained + fills available space */
  inner: {
    width: "100%",
  },

  /* ── TOP BAR ── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 4,
  },
  backBtn: {
    width: 60,
  },
  backBtnText: {
    fontSize: 14,
    color: GRAY500,
    fontWeight: "600",
    fontFamily: "System",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: BLACK,
    letterSpacing: -0.4,
    fontFamily: "System",
  },

  /* ── IMAGE PICKER ── */
  imagePicker: {
    width: "100%",
    /* height set inline via imageH */
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.88)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePlaceholderEmoji: { fontSize: 44, marginBottom: 4 },
  imagePlaceholderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: BLACK,
    fontFamily: "System",
  },
  imagePlaceholderSub: {
    fontSize: 13,
    color: GRAY500,
    fontFamily: "System",
  },
  changePhotoChip: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  changePhotoText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "System",
  },

  /* ── FORM CARD ── */
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY500,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 2,
    fontFamily: "System",
  },
  input: {
    backgroundColor: GRAY100,
    color: BLACK,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 14,
    fontFamily: "System",
    borderWidth: 1,
    borderColor: GRAY200,
  },
  textArea: {
    height: 110,
    paddingTop: 12,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    color: GRAY300,
    textAlign: "right",
    fontFamily: "System",
    marginBottom: 2,
  },

  /* ── BUTTONS ── */
  postBtn: {
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
  postBtnDisabled: { opacity: 0.55 },
  postBtnText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 16,
    fontFamily: "System",
    letterSpacing: -0.2,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: GRAY500,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "System",
  },
});
