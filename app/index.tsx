import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../store/auth";
import { useClientMealPlanStore } from "../store/mealPlanStore";
import useProgramStore from "../store/useProgramStore";
import { useWeightStore } from "../store/useWeightstore";

/* ─── constants ─────────────────────────────────────────────── */
const BASE_URL = "http://sculptbyashton.com:5000";
const { width: SCREEN_W } = Dimensions.get("window");

/* ─── helpers ───────────────────────────────────────────────── */
const avatarUri = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
};

const getDayKey = () => {
  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  return days[new Date().getDay()] as any;
};

const getMealTimeSlot = () => {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 12) return "brunch";
  if (h < 15) return "lunch";
  if (h < 18) return "eveningSnack";
  return "dinner";
};

const mealSlotLabel: Record<string, string> = {
  breakfast:    "Breakfast 🍳",
  brunch:       "Brunch 🥑",
  lunch:        "Lunch 🥗",
  eveningSnack: "Evening Snack 🍎",
  dinner:       "Dinner 🍽️",
};

/* ─────────────────────────────────────────────────────────────
   ✅ FIXED: Bottom nav routes verified against actual file paths
───────────────────────────────────────────────────────────── */
const CLIENT_NAV = [
  { emoji: "🗂️", label: "Overview",     route: "/" },
  { emoji: "💬", label: "Chat",          route: "/pages/client/clientChat" },
  { emoji: "🏋️", label: "Workout",      route: "/pages/client/workoutScreen" },
  { emoji: "🥗", label: "Meal Plans",   route: "/pages/client/meal-plans" },
  { emoji: "📰", label: "Feed",          route: "/pages/client/feedScreen" },
  { emoji: "💳", label: "Subscription", route: "/pages/client/UpgradePlanScreen" },
];

const COACH_NAV = [
  { emoji: "🗂️", label: "Dashboard",  route: "/" },
  { emoji: "💬", label: "Messages",    route: "/pages/coach/coachChat" },
  { emoji: "📋", label: "Programs",    route: "/pages/coach/programs" },
  { emoji: "✅", label: "Habits",       route: "/pages/coach/CoachHabitsScreen" },
  { emoji: "📊", label: "CRM",          route: "/pages/coach/crm" },
  { emoji: "🥗", label: "Meal Plans",  route: "/pages/coach/meal-plans" },
];

/* ════════════════════════════════════════════════════════════
   WEIGHT CHART
════════════════════════════════════════════════════════════ */
const CHART_H = 90;

function WeightChartCard() {
  const { entries, stats, loading, fetchMyHistory } = useWeightStore();

  useEffect(() => { fetchMyHistory(); }, []);

  const display = [...entries].reverse().slice(-6);
  const hasData = display.length >= 2;
  const weights = display.map(e => e.weight);
  const minW    = Math.min(...weights) - 2;
  const maxW    = Math.max(...weights) + 2;
  const range   = maxW - minW || 1;
  const norm    = (w: number) => (w - minW) / range;

  const chartW  = SCREEN_W - 32 - 32;
  const BAR_GAP = 8;

  const changeAbs  = stats.totalChange ?? 0;
  const isLoss     = changeAbs < 0;
  const isGain     = changeAbs > 0;
  const dotColor   = isLoss ? "#22c55e" : isGain ? "#ef4444" : "#aaa";
  const changeText = isLoss
    ? `↓ ${Math.abs(changeAbs)} kg`
    : isGain ? `↑ ${changeAbs} kg` : "No change";

  return (
    <View style={wc.card}>
      <View style={wc.topRow}>
        <View>
          <Text style={wc.cardTitle}>Weight Progress</Text>
          <Text style={wc.cardSub}>
            {stats.totalEntries
              ? `${stats.totalEntries} check-in${stats.totalEntries !== 1 ? "s" : ""} recorded`
              : "No entries yet"}
          </Text>
        </View>
        <View style={[wc.changeBadge, { backgroundColor: isLoss ? "#dcfce7" : isGain ? "#fee2e2" : "#f5f5f5" }]}>
          <Text style={[wc.changeText, { color: dotColor }]}>{changeText}</Text>
        </View>
      </View>

      <View style={wc.pillRow}>
        {[
          { label: "Starting", value: stats.starting },
          { label: "Current",  value: stats.current,  accent: true },
          { label: "Lowest",   value: stats.lowest },
          { label: "Highest",  value: stats.highest },
        ].map(({ label, value, accent }) => (
          <View key={label} style={[wc.pill, accent && wc.pillAccent]}>
            <Text style={wc.pillLabel}>{label}</Text>
            <Text style={[wc.pillValue, accent && { color: "#fff" }]}>
              {value != null ? `${value} kg` : "—"}
            </Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={wc.placeholder}><ActivityIndicator color="#111" /></View>
      ) : !hasData ? (
        <View style={wc.placeholder}>
          <Text style={wc.placeholderText}>Log 2+ weigh-ins to see your chart</Text>
        </View>
      ) : (
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_H }}>
            <View style={{ width: 34, height: CHART_H, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 6 }}>
              <Text style={wc.yLabel}>{Math.round(maxW)}</Text>
              <Text style={wc.yLabel}>{Math.round((maxW + minW) / 2)}</Text>
              <Text style={wc.yLabel}>{Math.round(minW)}</Text>
            </View>
            <View style={{ flex: 1, height: CHART_H, position: "relative" }}>
              {[0, 0.5, 1].map(pct => (
                <View key={pct} style={{ position: "absolute", left: 0, right: 0, top: CHART_H - pct * CHART_H, height: 1, backgroundColor: "#ebebeb" }} />
              ))}
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_H, gap: BAR_GAP }}>
                {display.map((entry, i) => {
                  const barH   = Math.max(6, norm(entry.weight) * CHART_H);
                  const isLast = i === display.length - 1;
                  return (
                    <View key={entry._id} style={{ flex: 1, alignItems: "center", height: CHART_H, justifyContent: "flex-end" }}>
                      <Text style={wc.barTopLabel}>{entry.weight}</Text>
                      <View style={{ width: "100%", height: barH, backgroundColor: isLast ? "#111" : "#d4d4d4", borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
                    </View>
                  );
                })}
              </View>
              {display.map((entry, i) => {
                const barH = Math.max(6, norm(entry.weight) * CHART_H);
                const segW = (chartW - 34) / display.length;
                const cx   = i * segW + segW / 2;
                return (
                  <View key={`dot-${entry._id}`} style={{ position: "absolute", left: cx - 4, bottom: barH - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: i === display.length - 1 ? "#111" : "#737373", borderWidth: 2, borderColor: "#fff", zIndex: 2 }} />
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: "row", marginLeft: 34, marginTop: 5, gap: BAR_GAP }}>
            {display.map((entry, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text style={wc.xLabel}>{entry.date.slice(5)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={wc.logBtn} activeOpacity={0.85}>
        <Text style={wc.logBtnText}>＋ Log today's weight</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router   = useRouter();
  const { user, loadUser } = useAuthStore();
  const { programs, getClientPrograms, loading: progLoading } = useProgramStore();
  const { mealPlans, fetchMealPlans, loading: mealLoading }   = useClientMealPlanStore();
  const isCoach  = user?.role === "coach";

  const [greeting,  setGreeting]  = useState("Hey");
  const [activeNav, setActiveNav] = useState(0);

  useEffect(() => {
    loadUser();
    const h = new Date().getHours();
    if (h < 12)      setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else             setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (user?._id && !isCoach) {
      getClientPrograms(user._id);
      fetchMealPlans();
    }
  }, [user?._id]);

  const todayKey      = getDayKey();
  const timeSlot      = getMealTimeSlot();
  const todayMeal     = mealPlans?.[0]?.days?.[todayKey];
  const mealItems: string[] = todayMeal?.[timeSlot] || [];
  const mealPlanTitle = mealPlans?.[0]?.title;
  const todayPrograms = programs?.slice(0, 2) || [];
  const firstName     = user?.firstName || user?.email?.split("@")[0] || "there";
  const avatar        = avatarUri(user?.avatar);
  const navItems      = isCoach ? COACH_NAV : CLIENT_NAV;
  const profileRoute  = isCoach ? "/pages/coach/profile" : "/pages/client/profile";

  if (!user) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  /* ── Shared sub-components ── */
  const Header = ({ sub }: { sub: string }) => (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <Text style={s.greetingText}>{greeting},</Text>
        <Text style={s.greetingName}>{firstName}</Text>
        <Text style={s.greetingSub}>{sub}</Text>
      </View>
      <TouchableOpacity onPress={() => router.push(profileRoute as any)}>
        {avatar
          ? <Image source={{ uri: avatar }} style={s.avatar} />
          : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarFallbackText}>{firstName?.[0]?.toUpperCase() || "U"}</Text>
            </View>
          )
        }
      </TouchableOpacity>
    </View>
  );

  const HeroCard = ({ title, sub, btnText, onPress }: any) => (
    <View style={s.checkinCard}>
      {avatar
        ? <Image source={{ uri: avatar }} style={s.checkinAvatar} />
        : <View style={[s.checkinAvatar, s.checkinAvatarFallback]}>
            <Text style={s.checkinAvatarText}>{firstName?.[0]?.toUpperCase()}</Text>
          </View>
      }
      <Text style={s.checkinTitle}>{title}</Text>
      <Text style={s.checkinSub}>{sub}</Text>
      <TouchableOpacity style={s.checkinBtn} onPress={onPress} activeOpacity={0.8}>
        <Text style={s.checkinBtnText}>{btnText}</Text>
      </TouchableOpacity>
    </View>
  );

  const QuickGrid = ({ items }: { items: { emoji: string; label: string; route: string }[] }) => (
    <View style={s.quickGrid}>
      {items.map(item => (
        <TouchableOpacity
          key={item.label}
          style={s.quickTile}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.8}
        >
          <Text style={s.quickTileEmoji}>{item.emoji}</Text>
          <Text style={s.quickTileLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const BottomNav = () => (
    <View style={s.bottomNav}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bottomNavInner}>
        {navItems.map((item, i) => {
          const active = activeNav === i;
          return (
            <TouchableOpacity
              key={item.label}
              style={s.navItem}
              onPress={() => { setActiveNav(i); router.push(item.route as any); }}
              activeOpacity={0.7}
            >
              <Text style={[s.navEmoji, active && s.navEmojiActive]}>{item.emoji}</Text>
              <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  /* ════════════════════════════════════════════════════════════
     ✅ UPDATED GRADIENT: black → grey → white
  ════════════════════════════════════════════════════════════ */

  /* ── CLIENT DASHBOARD ── */
  if (!isCoach) return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={s.container}
    >
      <Header sub={user?.weight
        ? `Week ${Math.ceil((user.streak || 1) / 7)} of your journey`
        : "Let's crush today 💪"}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <HeroCard
          title="Your check-in is ready 💪"
          sub="Share your progress and latest status"
          btnText="Start check-in"
          onPress={() => router.push("/pages/client/workoutScreen" as any)}
        />

        {/* ✅ FIXED: "Today's Exercise" → workoutScreen */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Today's Exercise</Text>
            <TouchableOpacity onPress={() => router.push("/pages/client/workoutScreen" as any)}>
              <Text style={s.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>
          {progLoading ? (
            <View style={s.taskCard}><ActivityIndicator color="#111" /></View>
          ) : todayPrograms.length === 0 ? (
            <View style={s.taskCard}>
              <View style={s.emptyTask}>
                <View>
                  <Text style={s.emptyTaskTitle}>No exercises scheduled</Text>
                  <Text style={s.emptyTaskSub}>Your coach will assign programs here</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/pages/client/workoutScreen" as any)}>
                  <Text style={s.plusBtn}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : todayPrograms.map((prog: any) => (
            <TouchableOpacity
              key={prog._id}
              style={s.taskCard}
              onPress={() => router.push("/pages/client/workoutScreen" as any)}
              activeOpacity={0.85}
            >
              <View style={s.taskRow}>
                <View style={s.taskIconWrap}>
                  {prog.coverImage
                    ? <Image source={{ uri: avatarUri(prog.coverImage) || "" }} style={s.taskIcon} />
                    : <Text style={s.taskEmoji}>🏋️</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.taskTitle}>{prog.title}</Text>
                  <Text style={s.taskSub}>{prog.difficulty} · {prog.exercises?.length || 0} exercises</Text>
                </View>
                <View style={s.taskBadge}>
                  <Text style={s.taskBadgeText}>Today</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weight Chart */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Weight Tracking</Text>
          </View>
          <WeightChartCard />
        </View>

        {/* Meal */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{mealSlotLabel[timeSlot]}</Text>
            <TouchableOpacity onPress={() => router.push("/pages/client/meal-plans" as any)}>
              <Text style={s.sectionLink}>View full plan</Text>
            </TouchableOpacity>
          </View>
          {mealLoading ? (
            <View style={s.mealCard}><ActivityIndicator color="#111" /></View>
          ) : mealItems.length > 0 ? (
            <View style={s.mealCard}>
              <View style={s.mealHeader}>
                <Image source={{ uri: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=80&q=80" }} style={s.mealThumb} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.mealPlanName}>{mealPlanTitle || "Today's Plan"}</Text>
                  <Text style={s.mealDay}>{todayKey.charAt(0).toUpperCase() + todayKey.slice(1)} · {mealSlotLabel[timeSlot]}</Text>
                </View>
              </View>
              {mealItems.slice(0, 3).map((item: string, i: number) => (
                <View key={i} style={s.mealItem}>
                  <Text style={s.mealDot}>●</Text>
                  <Text style={s.mealItemText}>{item}</Text>
                </View>
              ))}
              {mealItems.length > 3 && (
                <TouchableOpacity onPress={() => router.push("/pages/client/meal-plans" as any)}>
                  <Text style={s.mealMore}>+{mealItems.length - 3} more items →</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={s.mealCard}>
              <Image source={{ uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" }} style={s.mealEmptyImage} />
              <Text style={s.emptyMealText}>
                {!mealPlans?.length ? "No meal plan assigned yet 🥗" : `No ${timeSlot} items for today`}
              </Text>
              <TouchableOpacity onPress={() => router.push("/pages/client/meal-plans" as any)}>
                <Text style={s.sectionLink}>See full meal plan →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ✅ FIXED: Quick Access — all verified routes from provided file paths */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Quick Access</Text>
          <QuickGrid items={[
            { emoji: "🏋️", label: "Workout",      route: "/pages/client/workoutScreen" },
            { emoji: "✅", label: "Tasks",          route: "/pages/client/taskScreen" },
            { emoji: "🥗", label: "Meal Plans",    route: "/pages/client/meal-plans" },
            { emoji: "📰", label: "Feed",           route: "/pages/client/feedScreen" },
            { emoji: "✅", label: "Habits",         route: "/pages/client/HabitsScreen" },
            { emoji: "🍽️", label: "Recipes",       route: "/pages/client/RecipesScreen" },
            { emoji: "📸", label: "Post",           route: "/pages/client/createPostScreen" },
            { emoji: "💬", label: "Chat",           route: "/pages/client/clientChat" },
            { emoji: "💳", label: "Subscription",  route: "/pages/client/UpgradePlanScreen" },
            { emoji: "👤", label: "Profile",        route: "/pages/client/profile" },
          ]} />
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* FAB → taskScreen */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push("/pages/client/taskScreen" as any)}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>＋</Text>
      </TouchableOpacity>

      <BottomNav />
    </LinearGradient>
  );

  /* ── COACH DASHBOARD ── */
  return (
    <LinearGradient
      colors={["#000000", "#555555", "#ffffff"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={s.container}
    >
      <Header sub="Here's your coaching overview" />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <HeroCard
          title="Manage your clients 🏋️"
          sub="View progress, assign programs and meal plans"
          btnText="Open CRM"
          onPress={() => router.push("/pages/coach/crm" as any)}
        />

        {/* ✅ FIXED: Coach Quick Access — all verified routes */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Coach Tools</Text>
          <QuickGrid items={[
            { emoji: "📋", label: "Programs",    route: "/pages/coach/programs" },
            { emoji: "🥗", label: "Meal Plans",  route: "/pages/coach/meal-plans" },
            { emoji: "📊", label: "CRM",          route: "/pages/coach/crm" },
            { emoji: "💬", label: "Messages",     route: "/pages/coach/coachChat" },
            { emoji: "✅", label: "Habits",       route: "/pages/coach/CoachHabitsScreen" },
            { emoji: "🍱", label: "Foodies",      route: "/pages/coach/foodiesSection" },
            { emoji: "📖", label: "Recipes",      route: "/pages/coach/RecipesScreen" },
            { emoji: "✅", label: "Tasks",        route: "/pages/coach/taskScreen" },
            { emoji: "👤", label: "Profile",      route: "/pages/coach/profile" },
          ]} />
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <BottomNav />
    </LinearGradient>
  );
}

/* ════════════════════════════════════════════════════════════
   WEIGHT CARD STYLES
════════════════════════════════════════════════════════════ */
const wc = StyleSheet.create({
  card:           { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  topRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardTitle:      { fontSize: 15, fontWeight: "700", color: "#111" },
  cardSub:        { fontSize: 11, color: "#737373", marginTop: 2 },
  changeBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  changeText:     { fontSize: 13, fontWeight: "700" },
  pillRow:        { flexDirection: "row", gap: 6, marginBottom: 14 },
  pill:           { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 10, paddingVertical: 7, paddingHorizontal: 6, alignItems: "center", borderWidth: 1, borderColor: "#ebebeb" },
  pillAccent:     { backgroundColor: "#111", borderColor: "#111" },
  pillLabel:      { fontSize: 9, color: "#737373", fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.3 },
  pillValue:      { fontSize: 13, fontWeight: "700", color: "#737373", marginTop: 3 },
  placeholder:    { height: 90, backgroundColor: "#f5f5f5", borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  placeholderText:{ fontSize: 12, color: "#737373" },
  yLabel:         { fontSize: 9, color: "#aaa" },
  xLabel:         { fontSize: 8, color: "#aaa", textAlign: "center" },
  barTopLabel:    { fontSize: 8, color: "#737373", marginBottom: 2 },
  logBtn:         { backgroundColor: "#111", paddingVertical: 11, borderRadius: 12, alignItems: "center" },
  logBtnText:     { color: "#fff", fontWeight: "700", fontSize: 13 },
});

/* ════════════════════════════════════════════════════════════
   MAIN STYLES
════════════════════════════════════════════════════════════ */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY100 = "#f5f5f5";
const GRAY300 = "#d4d4d4";
const GRAY500 = "#737373";
const GRAY700 = "#404040";

const s = StyleSheet.create({
  loadingScreen:      { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  container:          { flex: 1 },

  header:             { paddingTop: 54, paddingBottom: 14, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft:         { flex: 1 },
  greetingText:       { fontSize: 16, fontWeight: "400", color: "#ffffff", lineHeight: 21 },
  greetingName:       { fontSize: 28, fontWeight: "700", color: "#ffffff", lineHeight: 34, letterSpacing: -0.5 },
  greetingSub:        { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  avatar:             { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: WHITE },
  avatarFallback:     { width: 56, height: 56, borderRadius: 28, backgroundColor: GRAY700, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: WHITE },
  avatarFallbackText: { color: WHITE, fontWeight: "800", fontSize: 20 },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },

  checkinCard:           { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, paddingVertical: 22, paddingHorizontal: 20, alignItems: "center", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  checkinAvatar:         { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3, borderColor: GRAY300 },
  checkinAvatarFallback: { backgroundColor: GRAY700, justifyContent: "center", alignItems: "center" },
  checkinAvatarText:     { color: WHITE, fontWeight: "800", fontSize: 28 },
  checkinTitle:          { fontSize: 16, fontWeight: "700", color: BLACK, marginBottom: 4, textAlign: "center" },
  checkinSub:            { fontSize: 12, color: GRAY500, marginBottom: 14, textAlign: "center" },
  checkinBtn:            { backgroundColor: GRAY100, paddingVertical: 11, borderRadius: 12, width: "100%", alignItems: "center", borderWidth: 1, borderColor: GRAY300 },
  checkinBtnText:        { fontSize: 14, fontWeight: "600", color: BLACK },

  section:       { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle:  { fontSize: 17, fontWeight: "800", color: BLACK },
  sectionLink:   { fontSize: 13, fontWeight: "600", color: GRAY500 },

  taskCard:       { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  emptyTask:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  emptyTaskTitle: { fontSize: 13, color: GRAY500, fontWeight: "500" },
  emptyTaskSub:   { fontSize: 11, color: GRAY300, marginTop: 2 },
  plusBtn:        { fontSize: 22, color: GRAY500 },
  taskRow:        { flexDirection: "row", alignItems: "center", gap: 12 },
  taskIconWrap:   { width: 40, height: 40, borderRadius: 10, backgroundColor: GRAY100, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  taskIcon:       { width: 40, height: 40, borderRadius: 10 },
  taskEmoji:      { fontSize: 20 },
  taskTitle:      { fontSize: 14, fontWeight: "700", color: BLACK, marginBottom: 2 },
  taskSub:        { fontSize: 11, color: GRAY500, textTransform: "capitalize" },
  taskBadge:      { backgroundColor: GRAY100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  taskBadgeText:  { fontSize: 10, fontWeight: "700", color: GRAY700 },

  mealCard:       { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  mealHeader:     { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  mealThumb:      { width: 46, height: 46, borderRadius: 10 },
  mealPlanName:   { fontSize: 14, fontWeight: "700", color: BLACK, marginBottom: 2 },
  mealDay:        { fontSize: 11, color: GRAY500 },
  mealItem:       { flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 8 },
  mealDot:        { color: GRAY500, fontSize: 7 },
  mealItemText:   { fontSize: 13, color: GRAY700 },
  mealMore:       { fontSize: 12, color: GRAY500, fontWeight: "600", marginTop: 4 },
  mealEmptyImage: { width: "100%", height: 90, borderRadius: 10, marginBottom: 10 },
  emptyMealText:  { textAlign: "center", color: GRAY500, fontSize: 13, marginBottom: 8 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickTile: {
    flexBasis: "18.5%",
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 3,
  },
  quickTileEmoji: { fontSize: 15 },
  quickTileLabel: { fontSize: 9, fontWeight: "400", color: GRAY700, textAlign: "center" },

  fab:     { position: "absolute", bottom: 80, alignSelf: "center", width: 50, height: 50, borderRadius: 25, backgroundColor: BLACK, justifyContent: "center", alignItems: "center", shadowColor: BLACK, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8, zIndex: 20 },
  fabText: { color: WHITE, fontSize: 26, fontWeight: "300", lineHeight: 32 },

  bottomNav:      { backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.08)", paddingTop: 8, paddingBottom: 24 },
  bottomNavInner: { paddingHorizontal: 6, gap: 2, flexDirection: "row", justifyContent: "space-around", alignItems: "center", flexGrow: 1 },
  navItem:        { alignItems: "center", justifyContent: "center", paddingVertical: 4, paddingHorizontal: 11, gap: 2, minWidth: 62 },
  navEmoji:       { fontSize: 19, opacity: 0.35 },
  navEmojiActive: { opacity: 1 },
  navLabel:       { fontSize: 10, color: GRAY500, fontWeight: "500" },
  navLabelActive: { color: BLACK, fontWeight: "700" },
});