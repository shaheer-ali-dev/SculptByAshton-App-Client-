import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import useSubscriptionStore from "@/store/useSubscriptionStore";

/* ─── helpers ─────────────────────────────────────────────── */
function getRemainingTime(endDateStr: string): { label: string; daysLeft: number } {
  const now = new Date();
  const end = new Date(endDateStr);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return { label: "Expired", daysLeft: 0 };

  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const monthsLeft = Math.floor(daysLeft / 30);
  const remainingDays = daysLeft % 30;

  if (monthsLeft > 0 && remainingDays > 0) {
    return {
      label: `${monthsLeft}mo ${remainingDays}d remaining`,
      daysLeft,
    };
  } else if (monthsLeft > 0) {
    return {
      label: `${monthsLeft} month${monthsLeft > 1 ? "s" : ""} remaining`,
      daysLeft,
    };
  } else {
    return {
      label: `${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining`,
      daysLeft,
    };
  }
}

function getProgressPercent(endDateStr: string, totalDays = 90): number {
  const now = new Date();
  const end = new Date(endDateStr);
  const diffMs = end.getTime() - now.getTime();
  const daysLeft = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  const elapsed = totalDays - daysLeft;
  return Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
}

/* ─── stripe link ─────────────────────────────────────────── */
const STRIPE_URL = "https://buy.stripe.com/00w9AVcg47W0bgf1ff8N20g";

/* ════════════════════════════════════════════════════════════ */
export default function SubscriptionScreen() {
  const { subscription, loading, fetchMySubscription } = useSubscriptionStore();
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchMySubscription();
  }, []);

  const handleSubscribe = async () => {
    setPurchasing(true);
    try {
      const supported = await Linking.canOpenURL(STRIPE_URL);
      if (supported) {
        await Linking.openURL(STRIPE_URL);
      } else {
        Alert.alert("Error", "Unable to open payment link.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setPurchasing(false);
    }
  };

  const hasActive =
    subscription?.status === "active" &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) > new Date();

  const remaining = hasActive ? getRemainingTime(subscription!.currentPeriodEnd) : null;
  const progress = hasActive ? getProgressPercent(subscription!.currentPeriodEnd) : 0;

  /* ─── features list ────────────────────────────────────── */
  const FEATURES = [
    { icon: "🏋️", text: "Unlimited personalized workout programs" },
    { icon: "📊", text: "Full progress tracking & analytics" },
    { icon: "💬", text: "Direct messaging with your coach" },
    { icon: "🥗", text: "Custom nutrition plans & habits" },
    { icon: "🔔", text: "Smart reminders & daily check-ins" },
    { icon: "📁", text: "Unlimited exercise library access" },
  ];

  return (
    <LinearGradient
     colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}}
      style={st.container}
    >
      <SafeAreaView style={st.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scrollContent}
        >
          {/* ── PAGE TITLE ── */}
          <Text style={st.pageTitle}>Subscription</Text>
          <Text style={st.pageSubtitle}>Unlock your full coaching experience</Text>

          {/* ── CURRENT STATUS CARD (only if active) ── */}
          {loading ? (
            <View style={st.loadingCard}>
              <ActivityIndicator color="#111" />
            </View>
          ) : hasActive && remaining ? (
            <View style={st.statusCard}>
              {/* Header row */}
              <View style={st.statusTopRow}>
                <View style={st.activeBadge}>
                  <View style={st.activeDot} />
                  <Text style={st.activeBadgeText}>Active</Text>
                </View>
                <Text style={st.statusPlanLabel}>3-Month Plan</Text>
              </View>

              {/* Remaining time big display */}
              <Text style={st.remainingBig}>{remaining.label}</Text>
              <Text style={st.remainingExpiry}>
                Expires{" "}
                {new Date(subscription!.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>

              {/* Progress bar */}
              <View style={st.progressTrack}>
                <View style={[st.progressFill, { width: `${progress}%` as any }]} />
              </View>
              <View style={st.progressLabels}>
                <Text style={st.progressLabelText}>Start</Text>
                <Text style={st.progressLabelText}>{Math.round(100 - progress)}% left</Text>
                <Text style={st.progressLabelText}>End</Text>
              </View>
            </View>
          ) : (
            /* No active sub — small notice */
            <View style={st.inactiveCard}>
              <Text style={st.inactiveEmoji}>⚡</Text>
              <View style={st.inactiveTextWrap}>
                <Text style={st.inactiveTitle}>No active plan</Text>
                <Text style={st.inactiveSub}>Subscribe below to get started</Text>
              </View>
            </View>
          )}

          {/* ── PLAN CARD ── */}
          <View style={st.planCard}>
            {/* Top accent bar */}
            <View style={st.planAccentBar} />

            <View style={st.planHeaderRow}>
              <View>
                <Text style={st.planBadgeText}>BEST VALUE</Text>
                <Text style={st.planTitle}>3-Month Plan</Text>
              </View>
              <View style={st.planPriceWrap}>
                <Text style={st.planPrice}>$750</Text>
                <Text style={st.planPricePer}>/ 3 months</Text>
              </View>
            </View>

            <Text style={st.planBreakdown}>~$250 / month</Text>

            {/* Divider */}
            <View style={st.divider} />

            {/* Features */}
            <View style={st.featuresWrap}>
              {FEATURES.map((f, i) => (
                <View key={i} style={st.featureRow}>
                  <Text style={st.featureIcon}>{f.icon}</Text>
                  <Text style={st.featureText}>{f.text}</Text>
                  <Text style={st.featureCheck}>✓</Text>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={[st.ctaBtn, purchasing && st.ctaBtnDisabled]}
              onPress={handleSubscribe}
              disabled={purchasing}
              activeOpacity={0.88}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={st.ctaBtnText}>
                    {hasActive ? "Extend Plan →" : "Get Started →"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {hasActive && (
              <Text style={st.extendNote}>
                Extending will add 3 months to your current plan end date
              </Text>
            )}

            <Text style={st.secureNote}>🔒 Secure payment via Stripe</Text>
          </View>

          {/* ── FAQ / NOTE ── */}
          <View style={st.faqCard}>
            <Text style={st.faqTitle}>How does billing work?</Text>
            <Text style={st.faqText}>
              You're billed once for a full 3-month period. There are no recurring charges —
              you'll need to manually renew when your plan expires. Extending your plan stacks
              on top of your remaining time.
            </Text>
          </View>

          <View style={{ height: 60 }} />
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

const st = StyleSheet.create({
  container:     { flex: 1 },
  safe:          { flex: 1 },
  scrollContent: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 20 },

  /* ── TITLE ── */
  pageTitle: {
    fontSize: 28, fontWeight: "800", color: WHITE,
    letterSpacing: -0.5, fontFamily: "Lato-Regular", marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14, color: GRAY500, fontFamily: "Lato-Regular", marginBottom: 20,
  },

  /* ── LOADING ── */
  loadingCard: {
    backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18,
    padding: 24, alignItems: "center", marginBottom: 16,
  },

  /* ── STATUS CARD ── */
  statusCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  statusTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#d1fae5", paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#059669" },
  activeBadgeText: { fontSize: 12, fontWeight: "700", color: "#065f46", fontFamily: "System" },
  statusPlanLabel: { fontSize: 12, fontWeight: "700", color: GRAY500, textTransform: "uppercase", letterSpacing: 0.5 },

  remainingBig: {
    fontSize: 26, fontWeight: "800", color: BLACK,
    fontFamily: "Lato-Regular", letterSpacing: -0.5, marginBottom: 4,
  },
  remainingExpiry: { fontSize: 13, color: GRAY500, fontFamily: "Lato-Regular", marginBottom: 16 },

  progressTrack: {
    height: 8, backgroundColor: GRAY200, borderRadius: 4, overflow: "hidden", marginBottom: 6,
  },
  progressFill: {
    height: "100%", backgroundColor: BLACK, borderRadius: 4,
  },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabelText: { fontSize: 10, color: GRAY500, fontFamily: "System" },

  /* ── INACTIVE CARD ── */
  inactiveCard: {
    backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 16,
    padding: 16, marginBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  inactiveEmoji: { fontSize: 32 },
  inactiveTextWrap: {},
  inactiveTitle: { fontSize: 15, fontWeight: "700", color: BLACK, fontFamily: "System" },
  inactiveSub:   { fontSize: 12, color: GRAY500, marginTop: 2, fontFamily: "System" },

  /* ── PLAN CARD ── */
  planCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22, overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 18, elevation: 5,
  },
  planAccentBar: {
    height: 5, backgroundColor: BLACK, width: "100%",
  },
  planHeaderRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", padding: 20, paddingBottom: 8,
  },
  planBadgeText: {
    fontSize: 10, fontWeight: "800", color: GRAY500,
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4,
  },
  planTitle: {
    fontSize: 22, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular", letterSpacing: -0.4,
  },
  planPriceWrap: { alignItems: "flex-end" },
  planPrice: {
    fontSize: 34, fontWeight: "800", color: BLACK, fontFamily: "Lato-Regular", letterSpacing: -1,
  },
  planPricePer: { fontSize: 12, color: GRAY500, fontFamily: "Lato-Regular", marginTop: -2 },
  planBreakdown: {
    fontSize: 13, color: GRAY500, fontFamily: "Lato-Regular",
    paddingHorizontal: 20, marginBottom: 16,
  },

  divider: { height: 1, backgroundColor: GRAY200, marginHorizontal: 20, marginBottom: 16 },

  /* ── FEATURES ── */
  featuresWrap: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  featureIcon: { fontSize: 18, width: 28 },
  featureText: { flex: 1, fontSize: 14, color: BLACK, fontFamily: "Lato-Regular", fontWeight: "500" },
  featureCheck: { fontSize: 14, fontWeight: "800", color: "#059669" },

  /* ── CTA ── */
  ctaBtn: {
    backgroundColor: BLACK, marginHorizontal: 20, paddingVertical: 16,
    borderRadius: 14, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    marginBottom: 10,
  },
  ctaBtnDisabled: { opacity: 0.55 },
  ctaBtnText: { color: WHITE, fontWeight: "800", fontSize: 16, fontFamily: "Lato-Regular", letterSpacing: -0.2 },

  extendNote: {
    fontSize: 11, color: GRAY500, textAlign: "center",
    paddingHorizontal: 20, marginBottom: 6, fontFamily: "Lato-Regular",
  },
  secureNote: {
    fontSize: 12, color: GRAY500, textAlign: "center",
    paddingBottom: 20, fontFamily: "Lato-Regular",
  },

  /* ── FAQ CARD ── */
  faqCard: {
    backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 16, padding: 18,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    marginBottom: 10,
  },
  faqTitle: { fontSize: 14, fontWeight: "800", color: BLACK, marginBottom: 8, fontFamily: "System" },
  faqText:  { fontSize: 13, color: GRAY500, lineHeight: 20, fontFamily: "System" },
});
