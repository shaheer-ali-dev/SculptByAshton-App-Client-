import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { UserCRM, useUserCRMStore } from "../../../store/useUserCRMStore";

/* ─── role badge colors (kept from original) ─────────────────── */
const ROLE_COLORS: Record<string, string> = {
  client: "#6EE7B7",
  coach:  "#93C5FD",
  admin:  "#FECACA",
  user:   "#E9D5FF",
};

/* ════════════════════════════════════════════════════════════ */
export default function UserCRMScreen() {
  /* ── ALL STORE SELECTORS & STATE UNCHANGED ── */
  const users        = useUserCRMStore(s => s.users);
  const loading      = useUserCRMStore(s => s.loading);
  const error        = useUserCRMStore(s => s.error);
  const selectedUser = useUserCRMStore(s => s.selectedUser);
  const fetchUsers   = useUserCRMStore(s => s.fetchUsers);
  const fetchUserById = useUserCRMStore(s => s.fetchUserById);
  const updateUser   = useUserCRMStore(s => s.updateUser);

  const [search, setSearch]               = useState("");
  const [detailVisible, setDetailVisible] = useState(false);
  const [editing, setEditing]             = useState(false);
  const [localEdit, setLocalEdit]         = useState<Partial<UserCRM> | null>(null);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (selectedUser) {
      setLocalEdit({
        ...selectedUser,
        favoriteFoodsByCategory: selectedUser.favoriteFoodsByCategory || {},
      });
    }
  }, [selectedUser]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => {
      const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phoneNumber || "").toLowerCase().includes(q)
      );
    });
  }, [search, users]);

  async function openDetail(userId: string) {
    setDetailVisible(true);
    setEditing(false);
    await fetchUserById(userId);
  }

  function closeDetail() {
    setDetailVisible(false);
    setEditing(false);
    setLocalEdit(null);
  }

  /* ── renderAvatar (logic unchanged) ── */
  function renderAvatar(u: UserCRM, size = 64) {
    if (u.avatar) {
      return (
        <Image
          source={{ uri: u.avatar.startsWith("http") ? u.avatar : "http://sculptbyashton.com:5000" + u.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      );
    }
    const initials = `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
    const bg = ROLE_COLORS[u.role] || "#e5e5e5";
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: bg, alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ color: "#111", fontSize: size * 0.34, fontWeight: "700" }}>
          {initials || "?"}
        </Text>
      </View>
    );
  }

  /* ── handleSave (logic completely unchanged) ── */
  async function handleSave() {
    if (!localEdit || !localEdit._id) { Alert.alert("Error","No user to save."); return; }
    const payload: any = { ...localEdit };
    ["age","height","weight","weightTrainingDaysPerWeek","streak","xp"].forEach(k => {
      const v = payload[k];
      if (v === "" || v === null || v === undefined) { delete payload[k]; }
      else if (typeof v === "string") { const n = Number(v); if (!Number.isNaN(n)) payload[k] = n; }
    });
    ["mealPrep","physicalActivity","workedWithCoachBefore","hasBodyWeightScale","caffeine","smoking","alcohol"].forEach(k => {
      const v = payload[k];
      if (v === "" || v === null || v === undefined) { delete payload[k]; }
      else if (typeof v === "string") {
        const lower = v.toLowerCase();
        if (lower === "true" || lower === "yes" || lower === "1") payload[k] = true;
        else if (lower === "false" || lower === "no" || lower === "0") payload[k] = false;
      }
    });
    if (payload.favoriteFoodsByCategory && typeof payload.favoriteFoodsByCategory === "string") {
      try { payload.favoriteFoodsByCategory = JSON.parse(payload.favoriteFoodsByCategory); } catch {}
    }
    console.log("handleSave: sending update for id=", localEdit._id, "payload=", payload);
    console.log("handleSave: calling updateUser with id=", localEdit._id, "payload=", payload);
    await updateUser(localEdit._id, payload);
    Alert.alert("Saved","User updated successfully.");
    setEditing(false);
  }

  /* ── USER CARD ── */
  function renderCard({ item }: { item: UserCRM }) {
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.88}
        onPress={() => openDetail(item._id)}
      >
        <View style={s.cardRow}>
          {renderAvatar(item, 56)}
          <View style={s.cardInfo}>
            <Text style={s.cardName}>{item.firstName} {item.lastName}</Text>
            <Text style={s.cardEmail}>{item.email}</Text>
            <View style={s.metaRow}>
              <View style={[s.roleBadge, { backgroundColor: ROLE_COLORS[item.role] || "#e5e5e5" }]}>
                <Text style={s.roleText}>{item.role.toUpperCase()}</Text>
              </View>
              <Text style={s.xpText}>⭐ {item.xp ?? 0}</Text>
              <Text style={s.streakText}>🔥 {item.streak ?? 0}</Text>
            </View>
          </View>
          <Text style={s.cardChevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  /* ════════════ RENDER ════════════ */
  return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>

        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <Text style={s.pageTitle}>CRM</Text>
          {loading && <ActivityIndicator color="#111" size="small" />}
        </View>

        {/* ── SEARCH ── */}
        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search by name, email or phone…"
              placeholderTextColor="#bbb"
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* ── ERROR ── */}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── USER LIST ── */}
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={renderCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? null : (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>👤</Text>
                <Text style={s.emptyText}>No users found</Text>
              </View>
            )
          }
        />

      </SafeAreaView>

      {/* ════════ DETAIL / EDIT MODAL (logic 100% unchanged) ════════ */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        onRequestClose={closeDetail}
        transparent={false}
      >
        <LinearGradient
         colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1 }}>

            {/* Modal header */}
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={closeDetail} style={s.backBtn}>
                <Text style={s.backBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>
                {selectedUser ? `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}` : "User"}
              </Text>
              <TouchableOpacity onPress={() => setEditing(e => !e)} style={s.editBtn}>
                <Text style={s.editBtnText}>{editing ? "Cancel" : "Edit"}</Text>
              </TouchableOpacity>
            </View>

            {loading && !selectedUser ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color="#111" />
              </View>
            ) : (
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={s.modalContent} showsVerticalScrollIndicator={false}>

                  {/* User hero card */}
                  <View style={s.heroCard}>
                    {selectedUser ? renderAvatar(selectedUser, 80) : null}
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={s.heroName}>
                        {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : ""}
                      </Text>
                      <Text style={s.heroEmail}>{selectedUser?.email}</Text>
                      {selectedUser?.role && (
                        <View style={[s.roleBadge, { backgroundColor: ROLE_COLORS[selectedUser.role] || "#e5e5e5", marginTop: 8, alignSelf: "flex-start" }]}>
                          <Text style={s.roleText}>{selectedUser.role.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* ── EDIT FORM (unchanged logic) ── */}
                  {editing ? (
                    <View style={s.formCard}>
                      <LabeledInput label="First name"    value={localEdit?.firstName ?? ""}       onChangeText={v => setLocalEdit(p => ({ ...(p||{}), firstName: v }))} />
                      <LabeledInput label="Last name"     value={localEdit?.lastName ?? ""}        onChangeText={v => setLocalEdit(p => ({ ...(p||{}), lastName: v }))} />
                      <LabeledInput label="Email"         value={localEdit?.email ?? ""}           onChangeText={v => setLocalEdit(p => ({ ...(p||{}), email: v }))} keyboardType="email-address" />
                      <LabeledInput label="Role"          value={localEdit?.role ?? ""}            onChangeText={v => setLocalEdit(p => ({ ...(p||{}), role: v as any }))} placeholder="client / coach / admin / user" />
                      <LabeledInput label="Bio"           value={localEdit?.bio ?? ""}             onChangeText={v => setLocalEdit(p => ({ ...(p||{}), bio: v }))} multiline numberOfLines={3} />
                      <LabeledInput label="Note (visible to client)" value={localEdit?.note ?? ""} onChangeText={v => setLocalEdit(p => ({ ...(p||{}), note: v }))} multiline numberOfLines={3} />
                      <LabeledInput label="Phone"         value={localEdit?.phoneNumber ?? ""}     onChangeText={v => setLocalEdit(p => ({ ...(p||{}), phoneNumber: v }))} keyboardType="phone-pad" />
                      <LabeledInput label="Gender"        value={localEdit?.gender ?? ""}          onChangeText={v => setLocalEdit(p => ({ ...(p||{}), gender: v }))} />

                      <View style={s.rowFields}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <LabeledInput label="Age"        value={localEdit?.age?.toString() ?? ""}    onChangeText={v => setLocalEdit(p => ({ ...(p||{}), age: v ? Number(v) : undefined }))} keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <LabeledInput label="Height (cm)" value={localEdit?.height?.toString() ?? ""} onChangeText={v => setLocalEdit(p => ({ ...(p||{}), height: v ? Number(v) : undefined }))} keyboardType="numeric" />
                        </View>
                      </View>

                      <LabeledInput label="Weight (kg)"             value={localEdit?.weight?.toString() ?? ""}                     onChangeText={v => setLocalEdit(p => ({ ...(p||{}), weight: v ? Number(v) : undefined }))} keyboardType="numeric" />
                      <LabeledInput label="Monthly food budget"     value={localEdit?.monthlyFoodBudget ?? ""}                      onChangeText={v => setLocalEdit(p => ({ ...(p||{}), monthlyFoodBudget: v }))} />
                      <LabeledInput label="Meal prep (true/false)"  value={String(localEdit?.mealPrep ?? "")}                       onChangeText={v => setLocalEdit(p => ({ ...(p||{}), mealPrep: v }))} />
                      <LabeledInput label="Weight training days/wk" value={localEdit?.weightTrainingDaysPerWeek?.toString() ?? ""}  onChangeText={v => setLocalEdit(p => ({ ...(p||{}), weightTrainingDaysPerWeek: v ? Number(v) : undefined }))} keyboardType="numeric" />
                      <LabeledInput label="Food allergens"          value={localEdit?.foodAllergens ?? ""}                          onChangeText={v => setLocalEdit(p => ({ ...(p||{}), foodAllergens: v }))} />
                      <LabeledInput label="Food restrictions"       value={localEdit?.foodRestrictions ?? ""}                       onChangeText={v => setLocalEdit(p => ({ ...(p||{}), foodRestrictions: v }))} multiline />
                      <LabeledInput label="Favorite whole foods"    value={localEdit?.favoriteWholeFoods ?? ""}                     onChangeText={v => setLocalEdit(p => ({ ...(p||{}), favoriteWholeFoods: v }))} />
                      <LabeledInput label="Favorite meals"          value={localEdit?.favoriteMeals ?? ""}                         onChangeText={v => setLocalEdit(p => ({ ...(p||{}), favoriteMeals: v }))} />

                      <Text style={s.sectionLabel}>Favorite foods by category</Text>
                      <LabeledInput label="Fruits"     value={localEdit?.favoriteFoodsByCategory?.fruits ?? ""}     onChangeText={v => setLocalEdit(p => ({ ...(p||{}), favoriteFoodsByCategory: { ...(p?.favoriteFoodsByCategory||{}), fruits: v } }))} />
                      <LabeledInput label="Vegetables" value={localEdit?.favoriteFoodsByCategory?.vegetables ?? ""} onChangeText={v => setLocalEdit(p => ({ ...(p||{}), favoriteFoodsByCategory: { ...(p?.favoriteFoodsByCategory||{}), vegetables: v } }))} />
                      <LabeledInput label="Grains"     value={localEdit?.favoriteFoodsByCategory?.grains ?? ""}     onChangeText={v => setLocalEdit(p => ({ ...(p||{}), favoriteFoodsByCategory: { ...(p?.favoriteFoodsByCategory||{}), grains: v } }))} />
                      <LabeledInput label="Dairy"      value={localEdit?.favoriteFoodsByCategory?.dairy ?? ""}      onChangeText={v => setLocalEdit(p => ({ ...(p||{}), favoriteFoodsByCategory: { ...(p?.favoriteFoodsByCategory||{}), dairy: v } }))} />
                      <LabeledInput label="Meat"       value={localEdit?.favoriteFoodsByCategory?.meat ?? ""}       onChangeText={v => setLocalEdit(p => ({ ...(p||{}), favoriteFoodsByCategory: { ...(p?.favoriteFoodsByCategory||{}), meat: v } }))} />

                      <Text style={s.sectionLabel}>Lifestyle & medical</Text>
                      <LabeledInput label="Caffeine (true/false)"   value={String(localEdit?.caffeine ?? "")}             onChangeText={v => setLocalEdit(p => ({ ...(p||{}), caffeine: v }))} />
                      <LabeledInput label="Smoking (true/false)"    value={String(localEdit?.smoking ?? "")}              onChangeText={v => setLocalEdit(p => ({ ...(p||{}), smoking: v }))} />
                      <LabeledInput label="Alcohol (true/false)"    value={String(localEdit?.alcohol ?? "")}              onChangeText={v => setLocalEdit(p => ({ ...(p||{}), alcohol: v }))} />
                      <LabeledInput label="Injuries or surgeries"   value={localEdit?.injuriesOrSurgeries ?? ""}          onChangeText={v => setLocalEdit(p => ({ ...(p||{}), injuriesOrSurgeries: v }))} />
                      <LabeledInput label="Medical conditions"      value={localEdit?.medicalConditions ?? ""}            onChangeText={v => setLocalEdit(p => ({ ...(p||{}), medicalConditions: v }))} multiline />
                      <LabeledInput label="Medications"             value={localEdit?.medications ?? ""}                  onChangeText={v => setLocalEdit(p => ({ ...(p||{}), medications: v }))} />

                      <TouchableOpacity
                        style={s.saveBtn}
                        onPress={() => { console.log("CONFIRM CLICKED — calling handleSave DIRECTLY"); handleSave(); }}
                      >
                        <Text style={s.saveBtnText}>Save changes</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* ── DETAIL VIEW ── */
                    <View style={s.detailCard}>
                      <DetailRow label="Email"                value={selectedUser?.email} />
                      <DetailRow label="Role"                 value={selectedUser?.role} />
                      <DetailRow label="Phone"                value={selectedUser?.phoneNumber ?? "—"} />
                      <DetailRow label="Bio"                  value={selectedUser?.bio ?? "—"} />
                      <DetailRow label="Note"                 value={selectedUser?.note ?? "—"} />
                      <DetailRow label="Coach notes"          value={selectedUser?.coachNotes ?? "—"} />
                      <DetailRow label="Age"                  value={selectedUser?.age?.toString() ?? "—"} />
                      <DetailRow label="Height (cm)"          value={selectedUser?.height?.toString() ?? "—"} />
                      <DetailRow label="Weight (kg)"          value={selectedUser?.weight?.toString() ?? "—"} />
                      <DetailRow label="Monthly budget"       value={selectedUser?.monthlyFoodBudget ?? "—"} />
                      <DetailRow label="Meal prep"            value={selectedUser?.mealPrep ? "Yes" : "No"} />
                      <DetailRow label="Weight training days/wk" value={selectedUser?.weightTrainingDaysPerWeek?.toString() ?? "—"} />
                      <DetailRow label="Favorite whole foods" value={selectedUser?.favoriteWholeFoods ?? "—"} />
                      <DetailRow label="Favorite meals"       value={selectedUser?.favoriteMeals ?? "—"} />

                      <Text style={[s.sectionLabel, { marginTop: 16 }]}>Favorite foods by category</Text>
                      <DetailRow label="Fruits"      value={selectedUser?.favoriteFoodsByCategory?.fruits ?? "—"} />
                      <DetailRow label="Vegetables"  value={selectedUser?.favoriteFoodsByCategory?.vegetables ?? "—"} />
                      <DetailRow label="Grains"      value={selectedUser?.favoriteFoodsByCategory?.grains ?? "—"} />
                      <DetailRow label="Dairy"       value={selectedUser?.favoriteFoodsByCategory?.dairy ?? "—"} />
                      <DetailRow label="Meat"        value={selectedUser?.favoriteFoodsByCategory?.meat ?? "—"} />

                      <Text style={[s.sectionLabel, { marginTop: 16 }]}>Lifestyle & medical</Text>
                      <DetailRow label="Caffeine"              value={selectedUser?.caffeine ? "Yes" : "No"} />
                      <DetailRow label="Smoking"               value={selectedUser?.smoking ? "Yes" : "No"} />
                      <DetailRow label="Alcohol"               value={selectedUser?.alcohol ? "Yes" : "No"} />
                      <DetailRow label="Injuries/Surgeries"    value={selectedUser?.injuriesOrSurgeries ?? "—"} />
                      <DetailRow label="Medical conditions"    value={selectedUser?.medicalConditions ?? "—"} />
                      <DetailRow label="Medications"           value={selectedUser?.medications ?? "—"} />
                      <DetailRow label="Occupation"            value={selectedUser?.occupation ?? "—"} />
                      <DetailRow label="Stress level"          value={selectedUser?.stressLevel ?? "—"} />
                      <DetailRow label="Eating habits rating"  value={selectedUser?.eatingHabitsRating ?? "—"} />
                      <DetailRow label="Fitness level"         value={selectedUser?.fitnessLevel ?? "—"} />
                      <DetailRow label="Physical activity"     value={selectedUser?.physicalActivity ? "Yes" : "No"} />
                      <DetailRow label="Worked with coach"     value={selectedUser?.workedWithCoachBefore ? "Yes" : "No"} />
                      <DetailRow label="Has body weight scale" value={selectedUser?.hasBodyWeightScale ? "Yes" : "No"} />
                      <DetailRow label="Daily routine"         value={selectedUser?.dailyRoutine ?? "—"} />
                      <DetailRow label="Weekly workout split"  value={selectedUser?.weeklyWorkoutSplit ?? "—"} />
                      <DetailRow label="Motivation"            value={selectedUser?.motivation ?? "—"} />
                      <DetailRow label="Past challenges"       value={selectedUser?.pastChallenges ?? "—"} />
                      <DetailRow label="Streak"                value={selectedUser?.streak?.toString() ?? "0"} />
                      <DetailRow label="XP"                    value={selectedUser?.xp?.toString() ?? "0"} />
                      <DetailRow label="Created at"            value={selectedUser?.createdAt ?? "—"} />
                    </View>
                  )}

                  <View style={{ height: 60 }} />
                </ScrollView>
              </KeyboardAvoidingView>
            )}
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

/* ─── Helper components ──────────────────────────────────────── */
function LabeledInput({ label, value, onChangeText, placeholder, keyboardType, multiline, numberOfLines }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; numberOfLines?: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        style={[f.input, multiline && { height: Math.max(80, (numberOfLines || 1) * 20), textAlignVertical: "top", paddingTop: 10 }]}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={f.detailRow}>
      <Text style={f.detailLabel}>{label}</Text>
      <Text style={f.detailValue} numberOfLines={3}>{value ?? "—"}</Text>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY200 = "#ebebeb";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";

const s = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },

  /* TOP BAR */
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  pageTitle: {
    fontSize: 28, fontWeight: "800", color: BLACK,
    letterSpacing: -0.5, fontFamily: "Lato-Regular",
  },

  /* SEARCH */
  searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: GRAY200,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  searchIcon:  { fontSize: 16, marginRight: 8, color: GRAY500 },
  searchInput: {
    flex: 1, paddingVertical: 12, fontSize: 15,
    color: BLACK, fontFamily: "Lato-Regular",
  },

  /* ERROR */
  errorBox: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { color: "#ef4444", fontSize: 13 },

  /* LIST */
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  /* USER CARD */
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  cardRow:    { flexDirection: "row", alignItems: "center", gap: 12 },
  cardInfo:   { flex: 1 },
  cardName:   { fontSize: 16, fontWeight: "700", color: BLACK, fontFamily: "System" },
  cardEmail:  { fontSize: 13, color: GRAY500, marginTop: 2, fontFamily: "System" },
  metaRow:    { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
  roleBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText:   { fontSize: 11, color: BLACK, fontWeight: "700", fontFamily: "System" },
  xpText:     { fontSize: 12, fontWeight: "700", color: "#d97706" },
  streakText: { fontSize: 12, fontWeight: "700", color: "#ef4444" },
  cardChevron:{ fontSize: 24, color: GRAY300, fontWeight: "300" },

  /* EMPTY */
  emptyWrap:  { paddingTop: 80, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyText:  { fontSize: 15, color: GRAY500, fontFamily: "System" },

  /* MODAL HEADER */
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: GRAY200,
  },
  backBtn:     { width: 40, justifyContent: "center" },
  backBtnText: { fontSize: 28, color: BLACK, fontWeight: "300", lineHeight: 34 },
  modalTitle:  { fontSize: 17, fontWeight: "700", color: BLACK, fontFamily: "Lato-Regular", flex: 1, textAlign: "center" },
  editBtn:     { padding: 6 },
  editBtnText: { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System" },

  /* MODAL CONTENT */
  modalContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  loadingWrap:  { flex: 1, justifyContent: "center", alignItems: "center" },

  /* HERO CARD */
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 18, marginBottom: 16,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  heroName:  { fontSize: 20, fontWeight: "800", color: BLACK, fontFamily: "System" },
  heroEmail: { fontSize: 13, color: GRAY500, marginTop: 3, fontFamily: "System" },

  /* FORM CARD */
  formCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  rowFields:  { flexDirection: "row" },
  sectionLabel: {
    fontSize: 12, fontWeight: "700", color: GRAY500,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: 10, marginTop: 4, fontFamily: "Lato-Regular",
  },
  saveBtn: {
    backgroundColor: BLACK, paddingVertical: 15,
    borderRadius: 14, alignItems: "center", marginTop: 16,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "System" },

  /* DETAIL CARD */
  detailCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
});

/* ─── Form field styles ──────────────────────────────────────── */
const f = StyleSheet.create({
  label: {
    fontSize: 11, fontWeight: "700", color: GRAY500,
    textTransform: "uppercase", letterSpacing: 0.5,
    marginBottom: 6, fontFamily: "Lato-Regular",
  },
  input: {
    backgroundColor: GRAY100, color: BLACK, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    fontFamily: "Lato-Regular", borderWidth: 1, borderColor: GRAY200, marginBottom: 0,
  },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: GRAY200,
  },
  detailLabel: { fontSize: 13, color: GRAY500, fontWeight: "600", fontFamily: "Lato-Regular", flex: 1 },
  detailValue: { fontSize: 13, color: BLACK, fontFamily: "Lato-Regular", maxWidth: "55%", textAlign: "right" },
});
