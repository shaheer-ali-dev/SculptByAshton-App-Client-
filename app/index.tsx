"use client";

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/auth";
import useProgramStore from "../store/useProgramStore";
import { useClientMealPlanStore } from "../store/mealPlanStore";

/* ─── constants ─────────────────────────────────────────────── */
const BASE_URL = "http://localhost:5000";
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
   BOTTOM NAV CONFIGS
   Client: 8 tabs (scrollable) — Overview, Chat, Activities,
           Library, Feed, Habits, Subscription, You
   Coach:  7 tabs (scrollable) — Dashboard, Messages, Programs,
           Habits, CRM, Meal Plans, Profile
───────────────────────────────────────────────────────────── */
const CLIENT_NAV = [
  { emoji:"🗂️", label:"Overview",      route:"/" },
  { emoji:"💬", label:"Chat",           route:"/pages/client/clientChat" },
  { emoji:"❤️", label:"Activities",    route:"/pages/client/workoutScreen" },
  { emoji:"📋", label:"Library",        route:"/pages/client/meal-plans" },
  { emoji:"📰", label:"Feed",           route:"/pages/client/feedScreen" },
  { emoji:"💳", label:"Subscription",   route:"/pages/client/UpgradePlanScreen" },
];

const COACH_NAV = [
  { emoji:"🗂️", label:"Dashboard",    route:"/" },
  { emoji:"💬", label:"Messages",      route:"/pages/coach/coachChat" },
  { emoji:"📋", label:"Programs",      route:"/pages/coach/programs" },
  { emoji:"✅", label:"Habits",         route:"/pages/coach/CoachHabitsScreen" },
  { emoji:"📊", label:"CRM",            route:"/pages/coach/crm" },
  { emoji:"🥗", label:"Meal Plans",    route:"/pages/coach/meal-plans" },
];

/* ════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const { user, loadUser } = useAuthStore();
  const { programs, getClientPrograms, loading: progLoading } = useProgramStore();
  const { mealPlans, fetchMealPlans, loading: mealLoading }   = useClientMealPlanStore();
  const isCoach = user?.role === "coach";

  const [greeting, setGreeting] = useState("Hey");
  const [activeNav, setActiveNav] = useState(0);

  useEffect(() => {
    loadUser();
    const h = new Date().getHours();
    if (h < 12)       setGreeting("Good morning");
    else if (h < 17)  setGreeting("Good afternoon");
    else              setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (user?._id && !isCoach) {
      getClientPrograms(user._id);
      fetchMealPlans();
    }
  }, [user?._id]);

  /* derived */
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
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  /* ──────────────────────────────────────────────────────────
     SHARED LAYOUT HELPERS
  ────────────────────────────────────────────────────────── */

  const Header = ({ sub }: { sub: string }) => {
  console.log("Coach avatar:", avatar);

  return (
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
              <Text style={s.avatarFallbackText}>
                {firstName?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
          )
        }
      </TouchableOpacity>
    </View>
  );
};

  /* Check-in / hero card — identical structure, different copy */
  const HeroCard = ({ title, sub, btnText, onPress }) => {
  console.log("Hero avatar:", avatar);

  return (
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
};

  /* Quick tiles grid — reused by both */
  const QuickGrid = ({ items }: { items: { emoji:string; label:string; route:string }[] }) => (
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

  /* Stats / Streak card — same shell */
  const TriStatCard = ({ items }: {
    items: [{ label:string; value:string }, { label:string; value:string }, { label:string; value:string }]
  }) => (
    <View style={s.streakCard}>
      <View style={s.streakRow}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={s.statDivider} />}
            <View style={s.streakItem}>
              <Text style={s.streakLabel}>{item.label}</Text>
              <Text style={s.streakValue}>{item.value}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  /* Bottom nav — same scrollable bar for both */
  const BottomNav = () => (
    <View style={s.bottomNav}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.bottomNavInner}
      >
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
     CLIENT DASHBOARD
  ════════════════════════════════════════════════════════════ */
  if (!isCoach) return (
    <LinearGradient
      colors={["#d6d6d6","#f0f0f0","#ffffff","#f0f0f0","#d6d6d6"]}
      locations={[0,0.2,0.5,0.8,1]}
      start={{x:0.5,y:0}} end={{x:0.5,y:1}}
      style={s.container}
    >
      <Header sub={user?.weight
        ? `Week ${Math.ceil((user.streak||1)/7)} of your journey`
        : "Let's crush today 💪"}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* hero */}
        <HeroCard
          title="Your check-in is ready 💪"
          sub="Share your progress and latest status"
          btnText="Start check-in"
          onPress={() => router.push("/pages/client/workoutScreen")}
        />

        {/* today tasks */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Today's tasks</Text>
            <TouchableOpacity onPress={() => router.push("/pages/client/workoutScreen")}>
              <Text style={s.sectionLink}>View planner</Text>
            </TouchableOpacity>
          </View>
          {progLoading ? (
            <View style={s.taskCard}><ActivityIndicator color="#111" /></View>
          ) : todayPrograms.length === 0 ? (
            <View style={s.taskCard}>
              <View style={s.emptyTask}>
                <View>
                  <Text style={s.emptyTaskTitle}>No scheduled tasks</Text>
                  <Text style={s.emptyTaskSub}>Press + to add a task</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/pages/client/workoutScreen")}>
                  <Text style={s.plusBtn}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : todayPrograms.map((prog: any) => (
            <TouchableOpacity
              key={prog._id}
              style={s.taskCard}
              onPress={() => router.push("/pages/client/workoutScreen")}
              activeOpacity={0.85}
            >
              <View style={s.taskRow}>
                <View style={s.taskIconWrap}>
                  {prog.coverImage
                    ? <Image source={{ uri: avatarUri(prog.coverImage) || "" }} style={s.taskIcon} />
                    : <Text style={s.taskEmoji}>🏋️</Text>
                  }
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.taskTitle}>{prog.title}</Text>
                  <Text style={s.taskSub}>{prog.difficulty} · {prog.exercises?.length||0} exercises</Text>
                </View>
                <View style={s.taskBadge}>
                  <Text style={s.taskBadgeText}>Today</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* weight stats */}
        {user?.weight && (
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Start</Text>
              <Text style={s.statValue}>{user.weight} kg</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>Current</Text>
              <Text style={s.statValue}>{user.weight} kg</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>Goal weight</Text>
              <Text style={s.statValue}>⭐ {user.weight > 70 ? user.weight-10 : user.weight} kg</Text>
            </View>
          </View>
        )}

        {/* meal */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{mealSlotLabel[timeSlot]}</Text>
            <TouchableOpacity onPress={() => router.push("/pages/client/meal-plans")}>
              <Text style={s.sectionLink}>View full plan</Text>
            </TouchableOpacity>
          </View>
          {mealLoading ? (
            <View style={s.mealCard}><ActivityIndicator color="#111" /></View>
          ) : mealItems.length > 0 ? (
            <View style={s.mealCard}>
              <View style={s.mealHeader}>
                <Image
                  source={{ uri:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=80&q=80" }}
                  style={s.mealThumb}
                />
                <View style={{ flex:1, marginLeft:12 }}>
                  <Text style={s.mealPlanName}>{mealPlanTitle||"Today's Plan"}</Text>
                  <Text style={s.mealDay}>{todayKey.charAt(0).toUpperCase()+todayKey.slice(1)} · {mealSlotLabel[timeSlot]}</Text>
                </View>
              </View>
              {mealItems.slice(0,3).map((item:string,i:number) => (
                <View key={i} style={s.mealItem}>
                  <Text style={s.mealDot}>●</Text>
                  <Text style={s.mealItemText}>{item}</Text>
                </View>
              ))}
              {mealItems.length > 3 && (
                <TouchableOpacity onPress={() => router.push("/pages/client/meal-plans")}>
                  <Text style={s.mealMore}>+{mealItems.length-3} more items →</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={s.mealCard}>
              <Image
                source={{ uri:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" }}
                style={s.mealEmptyImage}
              />
              <Text style={s.emptyMealText}>
                {!mealPlans?.length ? "No meal plan assigned yet 🥗" : `No ${timeSlot} items for today`}
              </Text>
              <TouchableOpacity onPress={() => router.push("/pages/client/meal-plans")}>
                <Text style={s.sectionLink}>See full meal plan →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* quick access — includes Feed, Habits, Subscription */}
        <View style={s.section}>
          <Text style={[s.sectionTitle,{ marginBottom:12 }]}>Quick Access</Text>
          <QuickGrid items={[
            { emoji:"📰", label:"Feed",         route:"/pages/client/feedScreen" },
            { emoji:"✅", label:"Habits",        route:"/pages/client/HabitsScreen" },
            { emoji:"💳", label:"Subscription",  route:"/pages/client/UpgradePlanScreen" },
            { emoji:"🍽️", label:"Recipes",      route:"/pages/client/RecipesScreen" },
            { emoji:"📸", label:"Post",          route:"/pages/client/createPostScreen" },
            { emoji:"👤", label:"You",            route:"/pages/client/profile" },

          ]} />
        </View>

        {/* streak */}
        
        <View style={{ height:110 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push("/pages/client/workoutScreen")}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>＋</Text>
      </TouchableOpacity>

      <BottomNav />
    </LinearGradient>
  );

  /* ════════════════════════════════════════════════════════════
     COACH DASHBOARD  — exact same visual structure as client
  ════════════════════════════════════════════════════════════ */
  return (
    <LinearGradient
      colors={["#d6d6d6","#f0f0f0","#ffffff","#f0f0f0","#d6d6d6"]}
      locations={[0,0.2,0.5,0.8,1]}
      start={{x:0.5,y:0}} end={{x:0.5,y:1}}
      style={s.container}
    >
      <Header sub="Here's your coaching overview" />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* hero — same card, coach copy */}
        <HeroCard
          title="Manage your clients 🏋️"
          sub="View progress, assign programs and meal plans"
          btnText="Open CRM"
          onPress={() => router.push("/pages/coach/crm")}
        />

        {/* coach tools — same QuickGrid tile layout */}
        <View style={s.section}>
          <Text style={[s.sectionTitle,{ marginBottom:12 }]}>Coach Tools</Text>
          <QuickGrid items={[
            { emoji:"📋", label:"Programs",    route:"/pages/coach/programs" },
            { emoji:"🥗", label:"Meal Plans",  route:"/pages/coach/meal-plans" },
            { emoji:"📊", label:"CRM",          route:"/pages/coach/crm" },
            { emoji:"💬", label:"Messages",    route:"/pages/coach/coachChat" },
            { emoji:"✅", label:"Habits",       route:"/pages/coach/CoachHabitsScreen" },
            { emoji:"👤", label:"Profile",      route:"/pages/coach/profile" },
          ]} />
        </View>

     

        

        <View style={{ height:110 }} />
      </ScrollView>

      {/* No FAB on coach (not needed) */}

      <BottomNav />
    </LinearGradient>
  );
}

/* ─── styles ─────────────────────────────────────────────────── */
const WHITE    = "#ffffff";
const BLACK    = "#111111";
const GRAY100  = "#f5f5f5";
const GRAY300  = "#d4d4d4";
const GRAY500  = "#737373";
const GRAY700  = "#404040";
const PINK_FAB = "#ec4899";

const s = StyleSheet.create({

  loadingScreen: { flex:1, justifyContent:"center", alignItems:"center", backgroundColor:WHITE },
  container:     { flex:1, backgroundColor:"#e8e8e8" },

  /* ── HEADER ── */
  header: {
    paddingTop:54, paddingBottom:14, paddingHorizontal:22,
    flexDirection:"row", alignItems:"center", justifyContent:"space-between",
  },
  headerLeft:         { flex:1 },
  greetingText:       { fontSize:16, fontWeight:"400", color:"#1a1a1a", lineHeight:21, fontFamily:"System" },
  greetingName:       { fontSize:28, fontWeight:"700", color:"#000", lineHeight:34, fontFamily:"System", letterSpacing:-0.5 },
  greetingSub:        { fontSize:14, color:"#555", marginTop:2, fontFamily:"System" },
  avatar:             { width:56, height:56, borderRadius:28, borderWidth:3, borderColor:WHITE },
  avatarFallback:     { width:56, height:56, borderRadius:28, backgroundColor:GRAY700, justifyContent:"center", alignItems:"center", borderWidth:3, borderColor:WHITE },
  avatarFallbackText: { color:WHITE, fontWeight:"800", fontSize:20 },

  /* ── SCROLL ── */
  scroll:        { flex:1 },
  scrollContent: { paddingHorizontal:16, paddingTop:16, paddingBottom:16 },

  /* ── HERO / CHECK-IN CARD ── */
  checkinCard: {
    backgroundColor:"rgba(255,255,255,0.92)", borderRadius:20,
    paddingVertical:22, paddingHorizontal:20, alignItems:"center", marginBottom:16,
    shadowColor:"#000", shadowOpacity:0.08, shadowRadius:14, elevation:3,
  },
  checkinAvatar:         { width:80, height:80, borderRadius:40, marginBottom:12, borderWidth:3, borderColor:GRAY300 },
  checkinAvatarFallback: { backgroundColor:GRAY700, justifyContent:"center", alignItems:"center" },
  checkinAvatarText:     { color:WHITE, fontWeight:"800", fontSize:28 },
  checkinTitle:          { fontSize:16, fontWeight:"700", color:BLACK, marginBottom:4, textAlign:"center" },
  checkinSub:            { fontSize:12, color:GRAY500, marginBottom:14, textAlign:"center" },
  checkinBtn:            { backgroundColor:GRAY100, paddingVertical:11, borderRadius:12, width:"100%", alignItems:"center", borderWidth:1, borderColor:GRAY300 },
  checkinBtnText:        { fontSize:14, fontWeight:"600", color:BLACK },

  /* ── SECTIONS ── */
  section:       { marginBottom:16 },
  sectionHeader: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  sectionTitle:  { fontSize:17, fontWeight:"800", color:BLACK },
  sectionLink:   { fontSize:13, fontWeight:"600", color:GRAY500 },

  /* ── TASK / ACTIVITY CARDS ── */
  taskCard:      { backgroundColor:"rgba(255,255,255,0.92)", borderRadius:14, padding:14, marginBottom:8, shadowColor:"#000", shadowOpacity:0.06, shadowRadius:8, elevation:1 },
  emptyTask:     { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  emptyTaskTitle:{ fontSize:13, color:GRAY500, fontWeight:"500" },
  emptyTaskSub:  { fontSize:11, color:GRAY300, marginTop:2 },
  plusBtn:       { fontSize:26, color:GRAY300 },
  taskRow:       { flexDirection:"row", alignItems:"center", gap:12 },
  taskIconWrap:  { width:40, height:40, borderRadius:10, backgroundColor:GRAY100, justifyContent:"center", alignItems:"center", overflow:"hidden" },
  taskIcon:      { width:40, height:40, borderRadius:10 },
  taskEmoji:     { fontSize:20 },
  taskTitle:     { fontSize:14, fontWeight:"700", color:BLACK, marginBottom:2 },
  taskSub:       { fontSize:11, color:GRAY500, textTransform:"capitalize" },
  taskBadge:     { backgroundColor:GRAY100, paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  taskBadgeText: { fontSize:10, fontWeight:"700", color:GRAY700 },

  /* ── WEIGHT STATS ── */
  statsCard:   { backgroundColor:"rgba(255,255,255,0.92)", borderRadius:14, padding:16, flexDirection:"row", justifyContent:"space-around", alignItems:"center", marginBottom:16, shadowColor:"#000", shadowOpacity:0.06, shadowRadius:8, elevation:1 },
  statItem:    { alignItems:"center" },
  statLabel:   { fontSize:11, color:GRAY500, marginBottom:4, fontWeight:"500" },
  statValue:   { fontSize:16, fontWeight:"800", color:BLACK },
  statDivider: { width:1, height:30, backgroundColor:GRAY300 },

  /* ── MEAL CARD ── */
  mealCard:      { backgroundColor:"rgba(255,255,255,0.92)", borderRadius:14, padding:14, shadowColor:"#000", shadowOpacity:0.06, shadowRadius:8, elevation:1 },
  mealHeader:    { flexDirection:"row", alignItems:"center", marginBottom:10 },
  mealThumb:     { width:46, height:46, borderRadius:10 },
  mealPlanName:  { fontSize:14, fontWeight:"700", color:BLACK, marginBottom:2 },
  mealDay:       { fontSize:11, color:GRAY500 },
  mealItem:      { flexDirection:"row", alignItems:"center", marginBottom:5, gap:8 },
  mealDot:       { color:GRAY500, fontSize:7 },
  mealItemText:  { fontSize:13, color:GRAY700 },
  mealMore:      { fontSize:12, color:GRAY500, fontWeight:"600", marginTop:4 },
  mealEmptyImage:{ width:"100%", height:90, borderRadius:10, marginBottom:10 },
  emptyMealText: { textAlign:"center", color:GRAY500, fontSize:13, marginBottom:8 },

  /* ── QUICK TILES GRID ── */
  quickGrid: { flexDirection:"row", flexWrap:"wrap", gap:10 },
  quickTile: {
    backgroundColor:"rgba(255,255,255,0.92)",
    borderRadius:14,
    width:(SCREEN_W - 32 - 20) / 3,
    paddingVertical:16, alignItems:"center", justifyContent:"center",
    shadowColor:"#000", shadowOpacity:0.06, shadowRadius:8, elevation:1, gap:6,
  },
  quickTileEmoji: { fontSize:22 },
  quickTileLabel: { fontSize:11, fontWeight:"700", color:GRAY700 },

  /* ── STREAK / STAT CARD ── */
  streakCard:  { backgroundColor:"rgba(255,255,255,0.92)", borderRadius:14, padding:16, marginBottom:8, shadowColor:"#000", shadowOpacity:0.06, shadowRadius:8, elevation:1 },
  streakRow:   { flexDirection:"row", justifyContent:"space-around", alignItems:"center" },
  streakItem:  { alignItems:"center" },
  streakLabel: { fontSize:11, color:GRAY500, textAlign:"center", marginBottom:4, fontWeight:"500" },
  streakValue: { fontSize:15, fontWeight:"800", color:BLACK, textAlign:"center" },

  /* ── FAB ── */
  fab: {
    position:"absolute", bottom:80, alignSelf:"center",
    width:50, height:50, borderRadius:25,
    backgroundColor:BLACK,
    justifyContent:"center", alignItems:"center",
    shadowColor:BLACK, shadowOpacity:0.4, shadowRadius:10, elevation:8, zIndex:20,
  },
  fabText: { color:WHITE, fontSize:26, fontWeight:"300", lineHeight:32 },

  /* ── BOTTOM NAV — horizontal scroll ── */
  bottomNav: {
    backgroundColor:"rgba(255,255,255,0.97)",
    borderTopWidth:1, borderTopColor:"rgba(0,0,0,0.08)",
    paddingTop:8, paddingBottom:24,
  },
  bottomNavInner: { paddingHorizontal:6, gap:2 ,flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  flexGrow: 1,},
  navItem: {
    alignItems:"center", justifyContent:"center",
    paddingVertical:4, paddingHorizontal:11, gap:2,
    minWidth:62,
  },
  navEmoji:       { fontSize:19, opacity:0.35 },
  navEmojiActive: { opacity:1 },
  navLabel:       { fontSize:10, color:GRAY500, fontWeight:"500" },
  navLabelActive: { color:BLACK, fontWeight:"700" },
});
