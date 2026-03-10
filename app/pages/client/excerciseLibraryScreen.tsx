import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const H_PAD   = Math.round(SCREEN_W * 0.045);
const isSmall = SCREEN_W < 375;
const COL_W   = (SCREEN_W - H_PAD * 2 - 12) / 2;

/* ─── RapidAPI config ─────────────────────────────────────── */
// 🔑 Replace with your actual RapidAPI key
const RAPID_API_KEY  = "YOUR_RAPIDAPI_KEY_HERE";
const RAPID_API_HOST = "exercisedb.p.rapidapi.com";
const BASE_URL       = "https://exercisedb.p.rapidapi.com";

const API_HEADERS = {
  "X-RapidAPI-Key":  RAPID_API_KEY,
  "X-RapidAPI-Host": RAPID_API_HOST,
};

/* ─── Body part filter chips ──────────────────────────────── */
const BODY_PARTS = [
  { label: "All",       value: "all",         emoji: "⚡" },
  { label: "Chest",     value: "chest",        emoji: "💪" },
  { label: "Back",      value: "back",         emoji: "🔙" },
  { label: "Legs",      value: "upper legs",   emoji: "🦵" },
  { label: "Arms",      value: "upper arms",   emoji: "💪" },
  { label: "Shoulders", value: "shoulders",    emoji: "🏋️" },
  { label: "Core",      value: "waist",        emoji: "🎯" },
  { label: "Cardio",    value: "cardio",       emoji: "❤️" },
];

/* ─── types ───────────────────────────────────────────────── */
interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

/* ════════════════════════════════════════════════════════════ */
export default function ExerciseLibraryScreen() {
  const router = useRouter();

  /* ── state ── */
  const [query, setQuery]               = useState("");
  const [exercises, setExercises]       = useState<Exercise[]>([]);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [activeBodyPart, setActiveBodyPart] = useState("all");

  /* ── detail modal ── */
  const [selected, setSelected]         = useState<Exercise | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [gifLoaded, setGifLoaded]       = useState(false);

  /* ── animated values ── */
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(60)).current;

  /* ── search by name ── */
  const searchExercises = useCallback(async (text: string) => {
    if (!text.trim()) { setExercises([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `${BASE_URL}/exercises/name/${encodeURIComponent(text.toLowerCase().trim())}?limit=20&offset=0`,
        { headers: API_HEADERS }
      );
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("ExerciseDB fetch error", e);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── filter by body part ── */
  const filterByBodyPart = useCallback(async (bodyPart: string) => {
    setActiveBodyPart(bodyPart);
    setQuery("");
    if (bodyPart === "all") { setExercises([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `${BASE_URL}/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=20&offset=0`,
        { headers: API_HEADERS }
      );
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("BodyPart fetch error", e);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── open detail ── */
  const openDetail = (ex: Exercise) => {
    setSelected(ex);
    setGifLoaded(false);
    setModalVisible(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(60);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  };

  /* ── close detail ── */
  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 60, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
      setSelected(null);
    });
  };

  /* ── debounce search ── */
  const searchTimer = useRef<any>(null);
  const handleSearchChange = (text: string) => {
    setQuery(text);
    setActiveBodyPart("all");
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchExercises(text), 600);
  };

  /* ── tag colour ── */
  const tagColor = (str: string) => {
    const map: Record<string, string> = {
      chest: "#ef4444", back: "#3b82f6", "upper legs": "#8b5cf6",
      "upper arms": "#f59e0b", shoulders: "#10b981", waist: "#ec4899",
      cardio: "#f97316", "lower legs": "#06b6d4", "lower arms": "#84cc16",
    };
    return map[str.toLowerCase()] ?? "#6b7280";
  };

  /* ── render exercise card ── */
  const renderCard = ({ item, index }: { item: Exercise; index: number }) => (
    <TouchableOpacity
      style={[st.card, { width: COL_W, marginLeft: index % 2 === 0 ? 0 : 12 }]}
      onPress={() => openDetail(item)}
      activeOpacity={0.88}
    >
      {/* GIF thumbnail */}
      <View style={st.cardImgWrap}>
        <Image
          source={{ uri: item.gifUrl }}
          style={st.cardImg}
          resizeMode="cover"
        />
        {/* Play overlay */}
        <View style={st.playOverlay}>
          <View style={st.playBtn}>
            <Text style={st.playIcon}>▶</Text>
          </View>
        </View>
      </View>

      {/* Card body */}
      <View style={st.cardBody}>
        <Text style={st.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={st.cardTags}>
          <View style={[st.tag, { backgroundColor: tagColor(item.bodyPart) + "22", borderColor: tagColor(item.bodyPart) + "55" }]}>
            <Text style={[st.tagText, { color: tagColor(item.bodyPart) }]}>
              {item.bodyPart}
            </Text>
          </View>
          <View style={st.equipTag}>
            <Text style={st.equipTagText} numberOfLines={1}>{item.equipment}</Text>
          </View>
        </View>
        <Text style={st.cardTarget}>🎯 {item.target}</Text>
      </View>
    </TouchableOpacity>
  );

  /* ════════════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={st.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={st.safe}>

        {/* ── TOP BAR ── */}
        <View style={[st.topBar, { paddingHorizontal: H_PAD }]}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Text style={st.backText}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.pageTitle}>Exercise Library</Text>
            <Text style={st.pageSub}>Search · Learn · Perfect your form</Text>
          </View>
        </View>

        {/* ── SEARCH BAR ── */}
        <View style={[st.searchWrap, { marginHorizontal: H_PAD }]}>
          <Text style={st.searchIcon}>🔍</Text>
          <TextInput
            style={st.searchInput}
            placeholder="Search exercises… e.g. bench press"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={query}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => searchExercises(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setExercises([]); setSearched(false); }}>
              <Text style={st.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── BODY PART FILTER CHIPS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.chipsScroll}
          contentContainerStyle={[st.chipsContent, { paddingHorizontal: H_PAD }]}
        >
          {BODY_PARTS.map(bp => (
            <TouchableOpacity
              key={bp.value}
              style={[st.chip, activeBodyPart === bp.value && st.chipActive]}
              onPress={() => filterByBodyPart(bp.value)}
              activeOpacity={0.8}
            >
              <Text style={st.chipEmoji}>{bp.emoji}</Text>
              <Text style={[st.chipText, activeBodyPart === bp.value && st.chipTextActive]}>
                {bp.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── RESULTS ── */}
        {loading ? (
          <View style={st.centerPad}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={st.loadingText}>Finding exercises…</Text>
          </View>
        ) : !searched ? (
          /* Hero state — nothing searched yet */
          <View style={st.heroWrap}>
            <Text style={st.heroEmoji}>🏋️</Text>
            <Text style={st.heroTitle}>Find Any Exercise</Text>
            <Text style={st.heroSub}>
              Search by name or tap a muscle group above.{"\n"}
              Tap any result to see the animated form guide.
            </Text>
            {/* Hint tiles */}
            <View style={st.hintRow}>
              {["Squat", "Push up", "Deadlift", "Plank"].map(hint => (
                <TouchableOpacity
                  key={hint}
                  style={st.hintChip}
                  onPress={() => { setQuery(hint); searchExercises(hint); }}
                  activeOpacity={0.8}
                >
                  <Text style={st.hintChipText}>{hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : exercises.length === 0 ? (
          <View style={st.centerPad}>
            <Text style={st.emptyEmoji}>😔</Text>
            <Text style={st.emptyTitle}>No exercises found</Text>
            <Text style={st.emptySub}>Try a different name or muscle group</Text>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            numColumns={2}
            contentContainerStyle={[st.grid, { paddingHorizontal: H_PAD }]}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ marginBottom: 12 }}
            ListHeaderComponent={
              <Text style={st.resultsCount}>
                {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} found
              </Text>
            }
          />
        )}
      </SafeAreaView>

      {/* ══════════════════════════════════════════════════════
          EXERCISE DETAIL MODAL — with blur + animation
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDetail}
      >
        <Animated.View style={[st.modalBackdrop, { opacity: fadeAnim }]}>

          {/* Blur background */}
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

          {/* Tap outside to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeDetail}
            activeOpacity={1}
          />

          {/* ── DETAIL SHEET ── */}
          <Animated.View style={[
            st.detailSheet,
            { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
          ]}>

            {/* Drag handle */}
            <View style={st.sheetHandle} />

            {/* Close button */}
            <TouchableOpacity style={st.closeBtn} onPress={closeDetail} activeOpacity={0.8}>
              <Text style={st.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces
              contentContainerStyle={st.detailScroll}
            >
              {selected && (
                <>
                  {/* ── GIF ANIMATION HERO ── */}
                  <View style={st.gifHero}>
                    {!gifLoaded && (
                      <View style={st.gifPlaceholder}>
                        <ActivityIndicator color="#fff" size="large" />
                        <Text style={st.gifLoadingText}>Loading animation…</Text>
                      </View>
                    )}
                    <Image
                      source={{ uri: selected.gifUrl }}
                      style={[st.gifImage, !gifLoaded && { opacity: 0, position: "absolute" }]}
                      resizeMode="contain"
                      onLoad={() => setGifLoaded(true)}
                    />
                    {/* Gradient overlay at bottom of GIF */}
                    <LinearGradient
                      colors={["transparent", "rgba(15,15,15,0.95)"]}
                      style={st.gifGradient}
                    />
                    {/* Live badge */}
                    <View style={st.liveBadge}>
                      <View style={st.liveDot} />
                      <Text style={st.liveText}>LIVE DEMO</Text>
                    </View>
                  </View>

                  {/* ── EXERCISE NAME ── */}
                  <Text style={st.detailName}>{selected.name}</Text>

                  {/* ── MUSCLE TAGS ROW ── */}
                  <View style={st.detailTagsRow}>
                    <View style={[st.detailTag, { backgroundColor: tagColor(selected.bodyPart) + "25", borderColor: tagColor(selected.bodyPart) + "60" }]}>
                      <Text style={[st.detailTagText, { color: tagColor(selected.bodyPart) }]}>
                        💪 {selected.bodyPart}
                      </Text>
                    </View>
                    <View style={st.detailTagNeutral}>
                      <Text style={st.detailTagNeutralText}>🎯 {selected.target}</Text>
                    </View>
                    <View style={st.detailTagNeutral}>
                      <Text style={st.detailTagNeutralText}>🏋️ {selected.equipment}</Text>
                    </View>
                  </View>

                  {/* ── SECONDARY MUSCLES ── */}
                  {selected.secondaryMuscles?.length > 0 && (
                    <View style={st.section}>
                      <Text style={st.sectionLabel}>Secondary Muscles</Text>
                      <View style={st.secondaryRow}>
                        {selected.secondaryMuscles.map((m, i) => (
                          <View key={i} style={st.secondaryChip}>
                            <Text style={st.secondaryChipText}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* ── HOW TO PERFORM ── */}
                  {selected.instructions?.length > 0 && (
                    <View style={st.section}>
                      <Text style={st.sectionLabel}>How to Perform</Text>
                      {selected.instructions.map((step, i) => (
                        <View key={i} style={st.stepRow}>
                          <View style={st.stepNumWrap}>
                            <Text style={st.stepNum}>{i + 1}</Text>
                          </View>
                          <Text style={st.stepText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* ── TIPS CARD ── */}
                  <View style={st.tipCard}>
                    <Text style={st.tipIcon}>💡</Text>
                    <Text style={st.tipText}>
                      Watch the animation above to understand the movement path and tempo before performing this exercise.
                    </Text>
                  </View>

                  <View style={{ height: 40 }} />
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

    </LinearGradient>
  );
}

/* ─── palette ─────────────────────────────────────────────── */
const WHITE     = "#ffffff";
const BLACK     = "#0f0f0f";
const DARK      = "#1a1a1a";
const DARK2     = "#242424";
const GRAY400   = "#9ca3af";
const GRAY600   = "#4b5563";
const WHITE15   = "rgba(255,255,255,0.15)";
const WHITE25   = "rgba(255,255,255,0.25)";
const WHITE60   = "rgba(255,255,255,0.60)";

/* ─── styles ──────────────────────────────────────────────── */
const st = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },

  /* TOP BAR */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  backBtn:   { width: 36, height: 36, justifyContent: "center" },
  backText:  { fontSize: 30, color: WHITE, fontWeight: "300", lineHeight: 36 },
  pageTitle: {
    fontSize: isSmall ? 20 : 24,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.5,
    fontFamily: "Lato-Regular",
  },
  pageSub: { fontSize: 12, color: WHITE60, fontFamily: "Lato-Regular", marginTop: 2 },

  /* SEARCH */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE15,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: WHITE25,
    gap: 10,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: WHITE, fontFamily: "System" },
  clearText:   { fontSize: 13, color: WHITE60, paddingHorizontal: 4 },

  /* CHIPS */
  chipsScroll:  { maxHeight: 50, marginBottom: 16 },
  chipsContent: { gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: WHITE15,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive:     { backgroundColor: WHITE, borderColor: WHITE },
  chipEmoji:      { fontSize: 13 },
  chipText:       { fontSize: 13, fontWeight: "600", color: WHITE60, fontFamily: "System" },
  chipTextActive: { color: BLACK, fontWeight: "800" },

  /* RESULTS COUNT */
  resultsCount: {
    fontSize: 12,
    fontWeight: "700",
    color: WHITE60,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
    fontFamily: "Lato-Regular",
  },

  /* GRID */
  grid: { paddingBottom: 40, paddingTop: 4 },

  /* EXERCISE CARD */
  card: {
    backgroundColor: DARK2,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardImgWrap: {
    width: "100%",
    height: COL_W * 0.9,
    backgroundColor: "#111",
    position: "relative",
  },
  cardImg: { width: "100%", height: "100%" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: { fontSize: 13, color: WHITE, marginLeft: 2 },

  cardBody: { padding: 12 },
  cardName: {
    fontSize: isSmall ? 12 : 13,
    fontWeight: "700",
    color: WHITE,
    fontFamily: "Lato-Regular",
    marginBottom: 8,
    lineHeight: 18,
    textTransform: "capitalize",
  },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText:      { fontSize: 10, fontWeight: "700", textTransform: "capitalize", fontFamily: "System" },
  equipTag:     { backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  equipTagText: { fontSize: 10, color: WHITE60, fontFamily: "Lato-Regular", textTransform: "capitalize" },
  cardTarget:   { fontSize: 11, color: GRAY400, fontFamily: "Lato-Regular", textTransform: "capitalize" },

  /* HERO / EMPTY STATES */
  centerPad: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingBottom: 60 },
  loadingText: { fontSize: 14, color: WHITE60, fontFamily: "Lato-Regular", marginTop: 12 },
  emptyEmoji:  { fontSize: 44 },
  emptyTitle:  { fontSize: 17, fontWeight: "700", color: WHITE, fontFamily: "System" },
  emptySub:    { fontSize: 13, color: WHITE60, fontFamily: "Lato-Regular", textAlign: "center", paddingHorizontal: 40 },

  heroWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingBottom: 80,
    gap: 10,
  },
  heroEmoji: { fontSize: 60, marginBottom: 8 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "Lato-Regular",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    color: WHITE60,
    fontFamily: "Lato-Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  hintRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 10,
  },
  hintChip: {
    backgroundColor: WHITE15,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WHITE25,
  },
  hintChipText: { fontSize: 13, fontWeight: "600", color: WHITE, fontFamily: "System" },

  /* ── MODAL BACKDROP ── */
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },

  /* ── DETAIL SHEET ── */
  detailSheet: {
    backgroundColor: BLACK,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: SCREEN_H * 0.92,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 30,
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  closeBtnText: { fontSize: 13, fontWeight: "700", color: WHITE },

  detailScroll: { paddingBottom: 20 },

  /* GIF HERO */
  gifHero: {
    width: "100%",
    height: SCREEN_H * 0.36,
    backgroundColor: "#111",
    position: "relative",
    overflow: "hidden",
  },
  gifPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#111",
  },
  gifLoadingText: { fontSize: 13, color: WHITE60, fontFamily: "System" },
  gifImage:  { width: "100%", height: "100%" },
  gifGradient: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 80,
  },
  liveBadge: {
    position: "absolute",
    top: 56,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  liveText: { fontSize: 10, fontWeight: "800", color: WHITE, letterSpacing: 1, fontFamily: "System" },

  /* DETAIL CONTENT */
  detailName: {
    fontSize: isSmall ? 20 : 24,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "Lato-Regular",
    paddingHorizontal: H_PAD,
    paddingTop: 18,
    paddingBottom: 12,
    textTransform: "capitalize",
    letterSpacing: -0.4,
  },

  detailTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: H_PAD,
    marginBottom: 20,
  },
  detailTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  detailTagText:        { fontSize: 12, fontWeight: "700", textTransform: "capitalize", fontFamily: "System" },
  detailTagNeutral:     { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  detailTagNeutralText: { fontSize: 12, fontWeight: "600", color: WHITE60, fontFamily: "Lato-Regular", textTransform: "capitalize" },

  /* SECTIONS */
  section: { paddingHorizontal: H_PAD, marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: WHITE60,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Lato-Regular",
    marginBottom: 12,
  },

  /* SECONDARY MUSCLES */
  secondaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  secondaryChipText: {
    fontSize: 13,
    color: WHITE60,
    fontFamily: "Lato-Regular",
    textTransform: "capitalize",
    fontWeight: "600",
  },

  /* STEPS */
  stepRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  stepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WHITE,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum:  { fontSize: 13, fontWeight: "800", color: BLACK, fontFamily: "System" },
  stepText: { flex: 1, fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: "Lato-Regular", lineHeight: 22 },

  /* TIP CARD */
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: H_PAD,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, fontSize: 13, color: WHITE60, fontFamily: "Lato-Regular", lineHeight: 20 },
});