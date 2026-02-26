import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { usePostStore, Post } from "../../../store/usePostStore";
import PostItem from "./postItem";
import { useRouter } from "expo-router";

const BASE_URL = "http://localhost:5000";

/* ── build full image URL from imageUrl field ─────────────── */
const buildImageUri = (imageUrl?: string) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${BASE_URL}${imageUrl}`;
};

/* ── build avatar URL from user.avatar field ──────────────── */
const buildAvatarUri = (post: Post) => {
  if (post.user?.avatar) {
    const av = post.user.avatar;
    return av.startsWith("http") ? av : `${BASE_URL}${av}`;
  }
  const name = encodeURIComponent(
    [post.user?.firstName, post.user?.lastName].filter(Boolean).join(" ") || "U"
  );
  return `https://ui-avatars.com/api/?name=${name}&background=111111&color=ffffff&size=100`;
};

/* ── time ago helper ──────────────────────────────────────── */
const timeAgo = (dateStr?: string): string => {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* ════════════════════════════════════════════════════════════
   FULLSCREEN POST MODAL
   Uses exact Post model fields: user, imageUrl, title, description, likes
════════════════════════════════════════════════════════════ */
function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  /* Reactive dimensions inside modal */
  const { width: W, height: H } = useWindowDimensions();
  const imageHeight = Math.round(H * 0.45);
  const noImgHeight = Math.round(H * 0.4);
  const sheetMinH   = Math.round(H * 0.5);

  const imageUri   = buildImageUri(post.imageUrl);
  const avatarUri  = buildAvatarUri(post);
  const authorName =
    [post.user?.firstName, post.user?.lastName].filter(Boolean).join(" ") || "User";

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={m.container}>

        {/* ── Floating close button ── */}
        <TouchableOpacity style={m.closeBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={m.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

          {/* ── Full-width image (post.imageUrl) ── */}
          {imageUri ? (
            <View style={[m.imageWrapper, { height: imageHeight }]}>
              <Image
                source={{ uri: imageUri }}
                style={m.fullImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={[m.noImagePlaceholder, { width: W, height: noImgHeight }]}>
              <Text style={m.noImageEmoji}>📝</Text>
            </View>
          )}

          {/* ── White sheet slides up over image ── */}
          <View style={[m.sheet, { minHeight: sheetMinH }]}>

            {/* Author row */}
            <View style={m.authorRow}>
              <Image source={{ uri: avatarUri }} style={m.authorAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={m.authorName}>{authorName}</Text>
                <Text style={m.postTime}>{timeAgo(post.createdAt)}</Text>
              </View>
              {/* Likes count from post.likes array */}
              {post.likes && post.likes.length > 0 && (
                <View style={m.likesBadge}>
                  <Text style={m.likesBadgeText}>❤️ {post.likes.length}</Text>
                </View>
              )}
            </View>

            {/* Title (post.title) */}
            {post.title ? (
              <Text style={m.postTitle}>{post.title}</Text>
            ) : null}

            {/* Description (post.description) */}
            {post.description ? (
              <Text style={m.postDescription}>{post.description}</Text>
            ) : null}

            <View style={{ height: 60 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════
   FEED SCREEN
════════════════════════════════════════════════════════════ */
export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  /* Reactive dimensions */
  const { width } = useWindowDimensions();
  const isWide  = width >= 640;
  const hPad    = isWide ? Math.max(16, (width - 680) / 2) : 0;

  /* ── Real API via usePostStore (unchanged) ── */
  const posts     = usePostStore(s => s.posts);
  const loading   = usePostStore(s => s.loading);
  const fetchFeed = usePostStore(s => s.fetchFeed);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  /* Loading */
  if (loading && posts.length === 0) {
    return (
      <LinearGradient
        colors={["#d6d6d6","#f0f0f0","#ffffff","#f0f0f0","#d6d6d6"]}
        locations={[0,0.2,0.5,0.8,1]}
        start={{x:0.5,y:0}} end={{x:0.5,y:1}}
        style={s.container}
      >
        <View style={s.center}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#d6d6d6","#f0f0f0","#ffffff","#f0f0f0","#d6d6d6"]}
      locations={[0,0.2,0.5,0.8,1]}
      start={{x:0.5,y:0}} end={{x:0.5,y:1}}
      style={s.container}
    >
      <SafeAreaView style={s.safe}>

        {/* Top bar */}
        <View style={[s.topBar, { paddingHorizontal: isWide ? hPad + 16 : 16 }]}>
          <Text style={s.topBarTitle}>Feed</Text>
          <TouchableOpacity
            style={s.newPostBtn}
            onPress={() => router.push("/pages/client/createPostScreen")}
            activeOpacity={0.85}
          >
            <Text style={s.newPostBtnText}>＋ Post</Text>
          </TouchableOpacity>
        </View>

        {/* Posts list — PostItem renders the card row */}
        <FlatList
          data={posts}
          extraData={posts}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <PostItem
              post={item}
              onPress={() => setSelectedPost(item)}  // open modal on tap
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchFeed}
              tintColor="#111"
              colors={["#111"]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.listContent, { paddingHorizontal: isWide ? hPad : 0 }]}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>📸</Text>
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Be the first to share something!</Text>
            </View>
          }
        />

      </SafeAreaView>

      {/* Fullscreen modal — shown when a post is tapped */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}

    </LinearGradient>
  );
}

/* ─── Feed styles ─────────────────────────────────────────── */
const WHITE   = "#ffffff";
const BLACK   = "#111111";
const GRAY200 = "#e8e8e8";
const GRAY500 = "#737373";

const s = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
    /* paddingHorizontal set inline */
  },
  topBarTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: BLACK,
    letterSpacing: -0.5,
    fontFamily: "System",
  },
  newPostBtn: {
    backgroundColor: BLACK,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newPostBtnText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "System",
  },

  separator:   { height: 1, backgroundColor: GRAY200 },
  listContent: { paddingBottom: 40 },
  /* paddingHorizontal set inline */

  emptyWrap:  { paddingTop: 80, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: BLACK, fontFamily: "System" },
  emptySub:   { fontSize: 14, color: GRAY500, fontFamily: "System" },
});

/* ─── Modal styles ────────────────────────────────────────── */
const m = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
  },

  /* Floating ✕ close button over image */
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 18,
    zIndex: 99,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: { color: WHITE, fontSize: 15, fontWeight: "700" },

  /* imageWrapper / noImagePlaceholder heights set inline via useWindowDimensions */
  noImagePlaceholder: {
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageEmoji: { fontSize: 52 },

  imageWrapper: {
    width: "100%",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },

  /* White rounded sheet over image */
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -26,
    paddingTop: 24,
    paddingHorizontal: 20,
    /* minHeight set inline */
  },

  /* Author row */
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  authorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#e5e5e5",
    borderWidth: 2,
    borderColor: "#ebebeb",
  },
  authorName: {
    fontSize: 15,
    fontWeight: "700",
    color: BLACK,
    fontFamily: "System",
  },
  postTime: {
    fontSize: 12,
    color: GRAY500,
    marginTop: 2,
    fontFamily: "System",
  },
  likesBadge: {
    backgroundColor: "#fff0f3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  likesBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e11d48",
  },

  /* post.title */
  postTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: BLACK,
    letterSpacing: -0.4,
    fontFamily: "System",
    marginBottom: 10,
    lineHeight: 28,
  },

  /* post.description */
  postDescription: {
    fontSize: 15,
    color: "#333333",
    lineHeight: 24,
    fontFamily: "System",
  },
});