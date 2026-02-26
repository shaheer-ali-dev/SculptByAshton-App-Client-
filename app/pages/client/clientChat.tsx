import React, { useEffect, useState, useRef } from "react";
import { Audio } from "expo-av";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useChatStore, Message } from "../../../store/useMessagingStore";
import api from "../../../utils/api";

/**
 * ClientChatScreen (updated)
 *
 * - Preserves recording / playback behavior.
 * - Uses expo-router's useRouter for navigation (push to VideoCall screen).
 * - Emits call:init when user presses Video button and navigates caller to VideoCall screen.
 * - Listens for incomingCall from the store and navigates to VideoCall screen as callee.
 *
 * Notes:
 * - Expects a route file at /pages/VideoCallScreen (or a matching route in your file-based routing).
 * - Passes partnerId, isCaller and partnerName as params to the route.
 */

export default function ClientChatScreen() {
  const router = useRouter();

  const initSocket = useChatStore((s) => s.initSocket);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const fetchCoachProfile = useChatStore((s) => s.fetchCoachProfile);
  const sendVoiceMessage = useChatStore((s) => s.sendVoiceMessage);

  // call signaling helpers & state from store
  const emitCallInit = useChatStore((s) => (s as any).emitCallInit);
  const incomingCall = useChatStore((s) => (s as any).incomingCall);
  const clearCallSignals = useChatStore((s) => (s as any).clearCallSignals);

  const messagesMap = useChatStore((s) => s.messages);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const coachProfile = useChatStore((s) => s.coachProfile);
  const currentUserId = useChatStore((s) => s.currentUserId);

  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);

  const windowWidth = Dimensions.get("window").width;
  const showLeftPane = windowWidth >= 720; // responsive

  // Recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const webChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceUri, setVoiceUri] = useState<string | null>(null); // preview object URL or mobile file uri
  const [voiceDuration, setVoiceDuration] = useState<number>(0);

  // Live timer while recording
  const startTsRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const elapsedIntervalRef = useRef<number | null>(null);

  // Playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null); // message _id or "preview"
  const [playPosition, setPlayPosition] = useState<number>(0);
  const [playDuration, setPlayDuration] = useState<number>(0);
  const audioRef = useRef<any>(null); // HTMLAudio or expo Sound
  const rafRef = useRef<number | null>(null);
  const [animTick, setAnimTick] = useState<number>(0);

  // Helper to safely extract an ID string from possible shapes:
  const normalizeId = (idLike: any): string => {
    if (!idLike && idLike !== 0) return "";
    if (typeof idLike === "string") return idLike;
    if (idLike._id && typeof idLike._id === "string") return idLike._id;
    try {
      if (typeof idLike.toString === "function") {
        const s = idLike.toString();
        if (s && s !== "[object Object]") return s;
      }
    } catch (e) {}
    return JSON.stringify(idLike);
  };

  useEffect(() => {
    let mounted = true;

    const initChat = async () => {
      try {
        await initSocket();
        await fetchCoachProfile();

        // once we have coach, fetch messages
        const coachId = useChatStore.getState().coachProfile?.coachId;
        if (coachId) {
          await fetchMessages(coachId);
        }

        if (mounted) setLoading(false);

        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);

        // Attach onlineUsers listener
        const socket = useChatStore.getState().socket;
        if (socket) {
          socket.on("onlineUsers", (users: string[]) => {
            useChatStore.getState().setOnlineUsers(users);
          });
        }
      } catch (err) {
        console.error("initChat error:", err);
        if (mounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      mounted = false;
      const s2 = useChatStore.getState().socket;
      if (s2) s2.off("onlineUsers");
      clearElapsedInterval();
      stopPlayback().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initSocket, fetchCoachProfile, fetchMessages]);

  // If an incoming call arrives for this user, navigate to VideoCall screen to answer
  useEffect(() => {
    if (!incomingCall || !coachProfile) return;

    // incomingCall.from is the caller userId
    // For client screen, a call from coachProfile.coachId means the coach is calling the client
    if (incomingCall.from === coachProfile.coachId) {
      try {
        // navigate to VideoCall screen as callee
        // Use router.push with pathname + params (expo-router supports object form)
        router.push({
          pathname: "/pages/VideoCallScreen",
          params: {
            partnerId: incomingCall.from,
            isCaller: false,
            partnerName: coachProfile.name,
          },
        } as any);
      } catch (e) {
        console.warn("Navigation to VideoCall failed", e);
      } finally {
        clearCallSignals();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCall, coachProfile]);

  // Recording timer helpers
  const startElapsedInterval = () => {
    startTsRef.current = Date.now();
    setElapsed(0);
    if (elapsedIntervalRef.current) window.clearInterval(elapsedIntervalRef.current);
    elapsedIntervalRef.current = window.setInterval(() => {
      if (!startTsRef.current) return;
      const s = Math.floor((Date.now() - startTsRef.current) / 1000);
      setElapsed(s);
    }, 250) as unknown as number;
  };

  const clearElapsedInterval = () => {
    if (elapsedIntervalRef.current) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    startTsRef.current = null;
    setElapsed(0);
  };

  // compute duration for a web blob
  const computeBlobDuration = (blob: Blob) =>
    new Promise<number>((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(0);
        }, 3500);
        audio.addEventListener("loadedmetadata", () => {
          clearTimeout(timeout);
          const d = audio.duration || 0;
          URL.revokeObjectURL(url);
          resolve(Number.isFinite(d) ? d : 0);
        });
        audio.src = url;
      } catch (e) {
        resolve(0);
      }
    });

  // Start recording (web & mobile)
  const startRecording = async () => {
    if (isRecording) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (e) {
      console.warn("setAudioModeAsync failed:", e);
    }

    if (Platform.OS === "web") {
      if (!(navigator.mediaDevices && (window as any).MediaRecorder)) {
        alert("Your browser doesn't support MediaRecorder. Try Chrome or Firefox.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const MR = (window as any).MediaRecorder;
        try {
          const mr = new MR(stream);
          webChunksRef.current = [];
          mr.ondataavailable = (ev: BlobEvent) => {
            if (ev.data && ev.data.size > 0) webChunksRef.current.push(ev.data);
          };
          mr.onstart = () => {
            setIsRecording(true);
            setVoiceUri(null);
            setVoiceDuration(0);
            startElapsedInterval();
          };
          mr.onstop = async () => {
            setIsRecording(false);
            clearElapsedInterval();
            const blob = new Blob(webChunksRef.current, { type: webChunksRef.current[0]?.type || "audio/webm" });
            webChunksRef.current = [];
            const url = URL.createObjectURL(blob);
            const computed = await computeBlobDuration(blob);
            const dur = computed > 0 ? computed : elapsed;
            setVoiceUri(url);
            setVoiceDuration(dur);
            (mediaRecorderRef as any).lastBlob = blob;
            try {
              stream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
          };
          mediaRecorderRef.current = mr;
          mr.start();
        } catch (err) {
          console.error("Failed to create MediaRecorder instance:", err);
          alert("Recording not available in this browser.");
        }
      } catch (err) {
        console.error("getUserMedia error:", err);
        alert("Microphone permission required or no mic available.");
      }
      return;
    }

    // Mobile (expo-av)
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Microphone permission is required!");
        return;
      }

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await rec.startAsync();

      setRecording(rec);
      setIsRecording(true);
      setVoiceUri(null);
      setVoiceDuration(0);
      startElapsedInterval();
    } catch (err) {
      console.error("Failed to start mobile recording:", err);
      alert("Recording failed on this device.");
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!isRecording) return;

    if (Platform.OS === "web") {
      const mr = mediaRecorderRef.current;
      if (!mr) {
        setIsRecording(false);
        clearElapsedInterval();
        return;
      }
      try {
        if (mr.state !== "inactive") mr.stop();
        else {
          setIsRecording(false);
          clearElapsedInterval();
        }
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
        setIsRecording(false);
        clearElapsedInterval();
      }
      return;
    }

    if (!recording) {
      setIsRecording(false);
      clearElapsedInterval();
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const dur = (status.durationMillis || 0) / 1000;
      setVoiceUri(uri || null);
      setVoiceDuration(dur || elapsed || 0);
      setRecording(null);
      setIsRecording(false);
      clearElapsedInterval();
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setRecording(null);
      setIsRecording(false);
      clearElapsedInterval();
    }
  };

  const deleteRecording = () => {
    setVoiceUri(null);
    setVoiceDuration(0);
    setIsRecording(false);
    clearElapsedInterval();
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
        const lastBlob = (mediaRecorderRef as any).lastBlob;
        if (lastBlob) {
          try {
            const tempUrl = URL.createObjectURL(lastBlob);
            URL.revokeObjectURL(tempUrl);
          } catch (e) {}
          (mediaRecorderRef as any).lastBlob = null;
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    webChunksRef.current = [];
  };

  // Send voice: web uploads directly, mobile uses store helper
  const handleSendVoice = async () => {
    if (!coachProfile?.coachId) {
      alert("No coach selected");
      return;
    }

    try {
      if (Platform.OS === "web") {
        const lastBlob: Blob | null = (mediaRecorderRef as any)?.lastBlob || null;
        if (!lastBlob) {
          alert("No recorded audio to send.");
          return;
        }
        const filename = `voice_${Date.now()}.webm`;
        const file = new File([lastBlob], filename, { type: lastBlob.type || "audio/webm" });

        const fd = new FormData();
        fd.append("voice", file); // server expects "voice"
        fd.append("receiver", coachProfile.coachId);
        fd.append("duration", String(voiceDuration || elapsed || 0));

        const res = await api.post("/messages/send-voice", fd);
        console.log("send-voice response:", res.data);

        if (voiceUri) {
          try {
            URL.revokeObjectURL(voiceUri);
          } catch (e) {}
        }
      } else {
        if (!voiceUri) {
          alert("No recorded audio to send.");
          return;
        }
        await sendVoiceMessage(coachProfile.coachId, voiceUri, voiceDuration || elapsed || 0);
      }

      await fetchMessages(coachProfile.coachId);
      setVoiceUri(null);
      setVoiceDuration(0);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      console.error("sendVoiceMessage error: ", err?.response?.data || err);
      const msg = err?.response?.data?.msg || err?.message || "Failed to send voice message";
      alert(msg);
    }
  };

  // Playback helpers (shared with Coach)
  const makePlaybackUri = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    try {
      const baseURL: string | undefined = (api as any).defaults?.baseURL;
      if (baseURL) {
        const stripped = baseURL.replace(/\/api\/?$/, "").replace(/\/$/, "");
        return stripped + path;
      }
    } catch (e) {}
    if (typeof window !== "undefined" && window.location && window.location.origin) {
      return window.location.origin + path;
    }
    return path;
  };

  const startRaf = () => {
    if (rafRef.current) return;
    const loop = () => {
      setAnimTick(Date.now());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };
  const cancelRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setAnimTick(0);
  };

  const stopPlayback = async () => {
    try {
      if (audioRef.current) {
        if (Platform.OS === "web") {
          try {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = "";
          } catch (e) {}
          audioRef.current = null;
        } else {
          try {
            await audioRef.current.unloadAsync();
          } catch (e) {}
          audioRef.current = null;
        }
      }
    } catch (e) {
      console.warn("stopPlayback error:", e);
    } finally {
      setPlayingMessageId(null);
      setPlayPosition(0);
      setPlayDuration(0);
      cancelRaf();
    }
  };

  const playMessage = async (m: Message, isPreview = false) => {
    const id = isPreview ? "preview" : m._id || `${m.sender}_${Date.now()}`;

    if (playingMessageId === id) {
      await stopPlayback();
      return;
    }

    await stopPlayback();

    let uri = "";
    let knownDuration = m.audio?.duration || 0;
    if (isPreview) {
      if (!voiceUri) return;
      uri = voiceUri;
      knownDuration = voiceDuration || knownDuration || elapsed || 0;
    } else {
      uri = makePlaybackUri(m.audio?.filePath);
      knownDuration = m.audio?.duration || knownDuration;
    }

    try {
      if (Platform.OS === "web") {
        const a = new window.Audio(uri);
        audioRef.current = a;
        a.preload = "auto";
        a.addEventListener("loadedmetadata", () => {
          const d = a.duration || knownDuration || 0;
          setPlayDuration(d);
        });
        a.addEventListener("timeupdate", () => {
          setPlayPosition(a.currentTime || 0);
        });
        a.addEventListener("ended", async () => {
          await stopPlayback();
        });
        await a.play();
        setPlayingMessageId(id);
        setPlayPosition(0);
        setPlayDuration(knownDuration || 0);
        startRaf();
      } else {
        const sound = new Audio.Sound();
        audioRef.current = sound;
        await sound.loadAsync({ uri });
        const status = await sound.getStatusAsync();
        const dur = (status.durationMillis || (knownDuration * 1000) || 0) / 1000;
        setPlayDuration(dur);
        sound.setOnPlaybackStatusUpdate((st) => {
          if (!st.isLoaded) return;
          setPlayPosition((st.positionMillis || 0) / 1000);
          if (st.didJustFinish) {
            stopPlayback().catch(() => {});
          }
        });
        await sound.playAsync();
        setPlayingMessageId(id);
        startRaf();
      }
    } catch (err) {
      console.error("Playback error:", err);
      await stopPlayback();
    }
  };

  // Animated equalizer bars style generator
  const getBarHeight = (index: number) => {
    if (!playingMessageId) return 4;
    const t = animTick / 150 + index * 0.7;
    const h = 6 + Math.abs(Math.sin(t)) * 18; // 6..24
    return h;
  };

  const convoMessages: Message[] = coachProfile?.coachId
    ? messagesMap[coachProfile.coachId] || []
    : [];

  // Text send
  const handleSend = async () => {
    if (!text.trim() || !coachProfile?.coachId) return;

    try {
      const res = await api.post("/messages/send", {
        receiver: coachProfile.coachId,
        text: text.trim(),
      });
      const savedMessage: Message = res.data;

      // Emit via socket
      const socket = useChatStore.getState().socket;
      socket?.emit("sendMessage", savedMessage);

      // Refresh conversation
      await fetchMessages(coachProfile.coachId);

      setText("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    } catch (err: any) {
      console.error("Send message error:", err);
    }
  };

  // Initiate video call (caller/client) -> notify coach and navigate to VideoCall screen
  const initiateVideoCall = async () => {
    if (!coachProfile?.coachId) {
      alert("No coach available to call");
      return;
    }

    try {
      // Notify remote via signaling (this emits call:init -> server relays to callee)
      emitCallInit(coachProfile.coachId, {
        callerName: "Client", // optional metadata; adjust as needed
      });

      // Navigate to VideoCall screen as caller using expo-router
      router.push({
        pathname: "/pages/VideoCallScreen",
        params: {
          partnerId: coachProfile.coachId,
          isCaller: true,
          partnerName: coachProfile.name,
        },
      } as any);
    } catch (e) {
      console.error("initiateVideoCall error:", e);
      alert("Failed to start call");
    }
  };
console.log("COACH NAME" , coachProfile?.name)

  // format seconds to mm:ss
  const fmtTime = (s: number) => {
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: styles.tokens.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* LEFT PANE */}
        {/* <View style={[styles.leftPane, !showLeftPane && styles.leftPaneCollapsed]}>
          <Text style={styles.heading}>Contacts</Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={styles.tokens.accent} />
            </View>
          ) : coachProfile ? (
            <TouchableOpacity
              style={styles.userCard}
              onPress={async () => {
                if (!coachProfile?.coachId) return;
                await fetchMessages(coachProfile.coachId);
              }}
              activeOpacity={0.9}
            >
              <View style={styles.userRow}>
                <View>
                  <Text style={styles.userName}>{coachProfile.name}</Text>
                  <Text style={styles.userRole}>{(coachProfile as any).role || "Coach"}</Text>
                </View>

                <View style={styles.userRight}>
                  <View
                    style={[
                      styles.onlineDot,
                      { backgroundColor: onlineUsers.includes(coachProfile.coachId) ? styles.tokens.accent : "#444" },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.emptyText}>No coach assigned</Text>
          )}
        </View> */}

        {/* RIGHT PANE */}
        <View style={styles.rightPane}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={styles.tokens.accent} />
            </View>
          ) : !coachProfile ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No coach assigned</Text>
            </View>
          ) : (
            <>
              <View style={styles.chatHeader}>
                <View>
                  
                 <Text style={styles.headerName}>
  {coachProfile?.name || "Coach"}
</Text>
                  
                  <Text style={styles.chatStatus}>
                    {onlineUsers.includes(coachProfile.coachId) ? "Online" : "Offline"}
                  </Text>
                </View>

                <View>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!coachProfile?.coachId) return;
                      await fetchMessages(coachProfile.coachId);
                    }}
                    style={styles.refreshBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.refreshText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                ref={(r) => (scrollRef.current = r)}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
              >
                {convoMessages.length === 0 && (
                  <View style={styles.noMessages}>
                    <Text style={styles.noMessagesText}>No messages yet. Say hello 👋</Text>
                  </View>
                )}

                {convoMessages.map((m, idx) => {
                  const senderId = normalizeId((m as any).sender);
                  const fromMe = senderId === currentUserId;
                  const key = (m as any)._id || `${senderId}_${idx}`;

                  return (
                    <View
                      key={key}
                      style={[
                        styles.msgWrapper,
                        fromMe ? styles.msgWrapperRight : styles.msgWrapperLeft,
                      ]}
                    >
                      <View style={[styles.msgBubble, fromMe ? styles.msgRight : styles.msgLeft]}>
                        {/* Voice message */}
                        {m.type === "voice" && m.audio?.filePath ? (
                          <View style={{ marginBottom: 6 }}>
                          <TouchableOpacity
  onPress={async () => {
    await playMessage(m, false);
  }}
  activeOpacity={0.8}
  style={{
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: fromMe ? "#cfe8f7" : "#f1f0f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    height: 40,
    minWidth: 180,
  }}
>
  {/* Play Button */}
  <TouchableOpacity
    onPress={async () => {
      await playMessage(m, false);
    }}
    style={{
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    }}
  >
    <Text style={{ fontSize: 13, color: "#000" }}>
      {playingMessageId === (m._id || `${senderId}_${idx}`) ? "❚❚" : "▶"}
    </Text>
  </TouchableOpacity>

  {/* Progress Bar */}
  <View style={{ flex: 1 }}>
    <View
      style={{
        height: 3,
        backgroundColor: "#ddd",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width:
            playingMessageId === (m._id || `${senderId}_${idx}`) &&
            playDuration > 0
              ? `${(playPosition / playDuration) * 100}%`
              : "0%",
          height: 3,
          backgroundColor: "#000",
        }}
      />
    </View>

    <Text
      style={{
        fontSize: 10,
        color: "#777",
        marginTop: 3,
        textAlign: "right",
      }}
    >
      {playingMessageId === (m._id || `${senderId}_${idx}`)
        ? fmtTime(playPosition)
        : m.audio?.duration
        ? fmtTime(m.audio.duration)
        : "00:00"}
    </Text>
  </View>
</TouchableOpacity>

                          </View>
                        ) : null}

                        {/* Text */}
                        {m.text ? <Text style={fromMe ? styles.msgTextRight : styles.msgTextLeft}>{m.text}</Text> : null}

                        <Text style={styles.msgTime}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor={styles.tokens.muted}
                  value={text}
                  onChangeText={setText}
                  multiline
                />

                {isRecording ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: "#FF3333", marginRight: 6 }} />
                      <Text style={{ color: "#fff", fontWeight: "700" }}>{`Recording ${fmtTime(elapsed)}`}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: "#FFAA00" }]}
                      onPress={stopRecording}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendBtnText}>Done</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: "#FF5555" }]}
                      onPress={deleteRecording}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : voiceUri ? (
                  <>
                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: "#1E90FF" }]}
                      onPress={handleSendVoice}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendBtnText}>Deliver</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: "#FF5555" }]}
                      onPress={deleteRecording}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendBtnText}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: "#666" }]}
                      onPress={async () => {
                        const fakeMsg: Message = {
                          _id: "preview",
                          sender: currentUserId || "me",
                          receiver: coachProfile.coachId,
                          type: "voice",
                        } as any;
                        if (!voiceUri) return;
                        await playMessage(fakeMsg, true);
                      }}
                    >
                      <Text style={styles.sendBtnText}>{playingMessageId === "preview" ? (playDuration ? `${fmtTime(playPosition)}` : "Playing") : (voiceDuration ? `${voiceDuration.toFixed(1)}s` : "Play")}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: isRecording ? "#CFE8F7" : "#000000" }]}
                      onPress={isRecording ? stopRecording : startRecording}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendBtnText}>
                        {isRecording ? "Stop 🎤" : "Voice 🎤"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.9}>
                      <Text style={styles.sendBtnText}>Send</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tokens: {
    bg: "#ffffff",
    surface: "#0b0b0b",
    surfaceAlt: "#111111",
    border: "#151515",
    muted: "#9a9a9a",
    text: "#ffffff",
    accent: "#000000",
  },

  kav: {
    flex: 1,
  },

  container: {
  flex: 1,
  flexDirection: "row",
  backgroundColor: "#ffffff",
},


  /* LEFT PANE */
  leftPane: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: "#151515",
    padding: 12,
    backgroundColor: "#0b0b0b",
  },
  leftPaneCollapsed: {
    width: 84,
    alignItems: "center",
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: "#111111",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#151515",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userName: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  userRole: {
    color: "#9a9a9a",
    fontSize: 12,
    marginTop: 4,
  },
  userRight: {
    marginLeft: 12,
    alignItems: "flex-end",
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
  },

  emptyText: {
    color: "#9a9a9a",
  },

  /* RIGHT PANE / CHAT */
 rightPane: {
  flex: 1,
  paddingHorizontal: 12,
  paddingTop: 8,
  backgroundColor: "#ffffff",
},

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
      borderBottomColor: "#E5E5E5",
  },
  chatTitle: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "800",
  },
  chatStatus: {
    color: "#9a9a9a",
    fontSize: 12,
    marginTop: 4,
  },
  refreshBtn: {
    backgroundColor: "#0f0f0f",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#151515",
  },
  refreshText: {
    color: "#bfbfbf",
    fontWeight: "700",
  },

  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
    paddingHorizontal: 6,
  },

  noMessages: {
    padding: 20,
    alignItems: "center",
  },
  noMessagesText: {
    color: "#9a9a9a",
  },

  msgWrapper: {
    flexDirection: "row",
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  msgWrapperLeft: {
    justifyContent: "flex-start",
  },
  msgWrapperRight: {
    justifyContent: "flex-end",
  },

  msgBubble: {
  maxWidth: "80%",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
},
msgLeft: {
  backgroundColor: "#f1f0f0",
  borderTopLeftRadius: 6,
},
msgRight: {
  backgroundColor: "#cfe8f7",
  borderTopRightRadius: 6,
},


  msgTextLeft: {
    color: "#000000",
    fontSize: 14,
    lineHeight: 18,
  },
  msgTextRight: {
    color: "#000000",
    fontSize: 14,
    lineHeight: 18,
  },
  msgTime: {
    color: "#9a9a9a",
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
  },

 composer: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 2,
  borderTopWidth: 1,
  borderTopColor: "#eee",
},


input: {
  flex: 1,
  backgroundColor: "#f0f0f0",
  color: "#000",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  fontSize: 14,
  maxHeight: 100,
},


 sendBtn: {
  backgroundColor: "#3b7dd8",
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 20,
  marginLeft: 6,
},
sendBtnText: {
  color: "#fff",
  fontWeight: "600",
},


  center: {
    justifyContent: "center",
    alignItems: "center",
  },
});