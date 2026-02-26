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
} from "react-native";
import { useRouter } from "expo-router";
import { useChatStore, Message } from "../../../store/useMessagingStore";
import api from "../../../utils/api";

/**
 * CoachChatScreen (updated)
 *
 * - Same functionality as before (recording, playback, send voice).
 * - Uses expo-router's useRouter for navigation (push to VideoCall screen).
 * - Adds Video button in the chat header to initiate a call to the selected client.
 * - Listens for incomingCall from the store and navigates to VideoCall screen as callee.
 *
 * Notes:
 * - Expects a route file at /pages/VideoCallScreen (expo-router file-based route).
 * - The store must expose emitCallInit, incomingCall and clearCallSignals (per earlier updates).
 */

export default function CoachChatScreen() {
  const router = useRouter();

  // store functions & state
  const initSocket = useChatStore((s) => s.initSocket);
  const fetchClients = useChatStore((s) => s.fetchClients);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const clients = useChatStore((s) => s.clients);
  const messagesMap = useChatStore((s) => s.messages);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const currentUserId = useChatStore((s) => s.currentUserId);
  const setOnlineUsers = useChatStore((s) => s.setOnlineUsers);

  const emitCallInit = useChatStore((s) => (s as any).emitCallInit);
  const incomingCall = useChatStore((s) => (s as any).incomingCall);
  const clearCallSignals = useChatStore((s) => (s as any).clearCallSignals);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loadingConv, setLoadingConv] = useState(false);
  const [tab, setTab] = useState<"clients" | "conversations">("clients");
  const [showChat, setShowChat] = useState(false); // false = left pane visible, true = right pane visible

  const scrollRef = useRef<ScrollView | null>(null);

  // Recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const webChunksRef = useRef<BlobPart[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);

  // Live timer while recording
  const startTsRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const elapsedIntervalRef = useRef<number | null>(null);

  // Playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playPosition, setPlayPosition] = useState<number>(0);
  const [playDuration, setPlayDuration] = useState<number>(0);
  const audioRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const [animTick, setAnimTick] = useState<number>(0);

  // Derived conversations list from messagesMap
  const conversations = Object.entries(messagesMap)
    .filter(([, msgs]) => msgs.length > 0)
    .map(([id, msgs]) => ({ id, lastMessage: msgs[msgs.length - 1] }));

  const convoMessages: Message[] = selectedClientId
    ? messagesMap[selectedClientId] || []
    : [];

  // init socket and clients
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initSocket();
        if (!mounted) return;
        await fetchClients();
        const s = useChatStore.getState().socket;
        if (s) {
          s.on("onlineUsers", (users: string[]) => {
            setOnlineUsers(users);
          });
        }
      } catch (err) {
        console.error("CoachChat init error:", err);
      }
    })();

    return () => {
      mounted = false;
      const s = useChatStore.getState().socket;
      if (s) s.off("onlineUsers");
      clearElapsedInterval();
      stopPlayback().catch(() => {});
    };
  }, [initSocket, fetchClients, setOnlineUsers]);

  // When incoming call arrives, navigate to VideoCall screen (callee)
  useEffect(() => {
    if (!incomingCall) return;
    const callerId = incomingCall.from;
    try {
      router.push({
        pathname: "/pages/VideoCallScreen",
        params: {
          partnerId: callerId,
          isCaller: false,
          partnerName: clients.find((c) => c._id === callerId)?.name || "Caller",
        },
      } as any);
    } catch (e) {
      console.warn("Navigation to VideoCall failed", e);
    } finally {
      clearCallSignals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCall]);

  // helpers for elapsed timer
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

  // compute duration for a web blob by loading it into audio element
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

  // Recording flows
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

    // Mobile (expo-av) flow
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
        if (mr.state !== "inactive") {
          mr.stop();
        } else {
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
      console.error("Failed to stop mobile recording:", err);
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

  const handleSendVoice = async () => {
    if (!selectedClientId) {
      alert("No client selected");
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
        fd.append("voice", file);
        fd.append("receiver", selectedClientId);
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
        await useChatStore.getState().sendVoiceMessage(selectedClientId, voiceUri, voiceDuration || elapsed || 0);
      }

      await fetchMessages(selectedClientId);
      setVoiceUri(null);
      setVoiceDuration(0);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      console.error("sendVoiceMessage error: ", err?.response?.data || err);
      const msg = err?.response?.data?.msg || err?.message || "Failed to send voice message";
      alert(msg);
    }
  };

  // Playback helpers
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

  // format elapsed seconds to mm:ss
  const fmtTime = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Initiate video call: emits call:init and navigates coach to VideoCall screen as caller
  const initiateVideoCall = async () => {
    if (!selectedClientId) {
      alert("Select a client to call");
      return;
    }
    try {
      emitCallInit(selectedClientId, { callerName: "Coach" });
      router.push({
        pathname: "/pages/VideoCallScreen",
        params: {
          partnerId: selectedClientId,
          isCaller: true,
          partnerName: clients.find((c) => c._id === selectedClientId)?.name || "Client",
        },
      } as any);
    } catch (e) {
      console.error("initiateVideoCall error:", e);
      alert("Failed to start call");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>

        {/* LEFT PANE — hidden when chat is open */}
        {!showChat && (
        <View style={styles.leftPane}>
          <Text style={styles.heading}>Contacts</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "clients" && styles.tabActive]}
              onPress={() => setTab("clients")}
            >
              <Text style={tab === "clients" ? styles.tabTextActive : styles.tabText}>
                Clients
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === "conversations" && styles.tabActive]}
              onPress={() => setTab("conversations")}
            >
              <Text style={tab === "conversations" ? styles.tabTextActive : styles.tabText}>
                Chats
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {tab === "clients" &&
              clients.map((c) => {
                const isOnline = onlineUsers.includes(c._id);
                const isSelected = selectedClientId === c._id;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.userCard, isSelected && styles.userSelected]}
                    onPress={() => {
                      setSelectedClientId(c._id);
                      setShowChat(true);
                      (async () => {
                        setLoadingConv(true);
                        try {
                          await fetchMessages(c._id);
                          setLoadingConv(false);
                          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
                        } catch (err) {
                          setLoadingConv(false);
                        }
                      })();
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.userRow}>
                      <View>
                        <Text style={styles.userName}>{c.name}</Text>
                        <Text style={styles.userRole}>Client</Text>
                      </View>
                      <View style={styles.userRight}>
                        <View
                          style={[
                            styles.onlineDot,
                            { backgroundColor: isOnline ? "#4ade80" : "#444" },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

            {tab === "conversations" &&
              (conversations.length ? (
                conversations.map((conv) => {
                  const client = clients.find((c) => c._id === conv.id);
                  const isSelected = selectedClientId === conv.id;
                  return (
                    <TouchableOpacity
                      key={conv.id}
                      style={[styles.userCard, isSelected && styles.userSelected]}
                      onPress={() => {
                        setSelectedClientId(conv.id);
                        setShowChat(true);
                        (async () => {
                          setLoadingConv(true);
                          try {
                            await fetchMessages(conv.id);
                            setLoadingConv(false);
                            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
                          } catch (err) {
                            setLoadingConv(false);
                          }
                        })();
                      }}
                      activeOpacity={0.9}
                    >
                      <View style={styles.userRow}>
                        <View>
                          <Text style={styles.userName}>{client?.name || conv.id}</Text>
                          <Text style={styles.userRole}>
                            {conv.lastMessage?.text || "Voice message"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ padding: 12 }}>
                  <Text style={styles.emptyText}>No conversations yet</Text>
                </View>
              ))}
          </ScrollView>
        </View>
        )}

        {/* RIGHT PANE — hidden when showChat=false */}
        {showChat && (
        <View style={styles.rightPane}>
          {!selectedClientId ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Select a client to start chatting</Text>
            </View>
          ) : loadingConv ? (
            <View style={styles.center}>
              <ActivityIndicator color="#000" />
            </View>
          ) : (
            <>
              {/* Chat Header */}
              <View style={styles.chatHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {/* Back button */}
                  <TouchableOpacity
                    onPress={() => setShowChat(false)}
                    style={styles.backBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.backBtnText}>← Back</Text>
                  </TouchableOpacity>

                  <View>
                    <Text style={styles.chatTitle}>
                      {clients.find((c) => c._id === selectedClientId)?.name || "Conversation"}
                    </Text>
                    <Text style={styles.chatStatus}>
                      {onlineUsers.includes(selectedClientId) ? "Online" : "Offline"}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {/* Refresh */}
                  <TouchableOpacity
                    onPress={async () => {
                      if (!selectedClientId) return;
                      await fetchMessages(selectedClientId);
                    }}
                    style={styles.refreshBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.refreshText}>Refresh</Text>
                  </TouchableOpacity>

                  {/* Video Call */}
                  <TouchableOpacity
                    onPress={initiateVideoCall}
                    style={styles.refreshBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.refreshText}>Video 📹</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Messages */}
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
                  const fromMe = m.sender.toString() === currentUserId;
                  const msgId = m._id || `${m.sender}_${idx}`;

                  return (
                    <View
                      key={msgId}
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
                              onPress={async () => { await playMessage(m, false); }}
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
                              {/* Play button */}
                              <TouchableOpacity
                                onPress={async () => { await playMessage(m, false); }}
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
                                  {playingMessageId === msgId ? "❚❚" : "▶"}
                                </Text>
                              </TouchableOpacity>

                              {/* Progress bar */}
                              <View style={{ flex: 1 }}>
                                <View style={{ height: 3, backgroundColor: "#ddd", borderRadius: 3, overflow: "hidden" }}>
                                  <View
                                    style={{
                                      width: playingMessageId === msgId && playDuration > 0
                                        ? `${(playPosition / playDuration) * 100}%`
                                        : "0%",
                                      height: 3,
                                      backgroundColor: "#000",
                                    }}
                                  />
                                </View>
                                <Text style={{ fontSize: 10, color: "#777", marginTop: 3, textAlign: "right" }}>
                                  {playingMessageId === msgId
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
                        {m.text ? (
                          <Text style={fromMe ? styles.msgTextRight : styles.msgTextLeft}>
                            {m.text}
                          </Text>
                        ) : null}

                        <Text style={styles.msgTime}>
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Composer */}
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#9a9a9a"
                  value={text}
                  onChangeText={setText}
                  multiline
                />

                {isRecording ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: "#FF3333", marginRight: 6 }} />
                      <Text style={{ color: "#000", fontWeight: "700" }}>{`Recording ${fmtTime(elapsed)}`}</Text>
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
                          receiver: selectedClientId || "",
                          type: "voice",
                        } as any;
                        if (!voiceUri) return;
                        await playMessage(fakeMsg, true);
                      }}
                    >
                      <Text style={styles.sendBtnText}>
                        {playingMessageId === "preview"
                          ? (playDuration ? `${fmtTime(playPosition)}` : "Playing")
                          : (voiceDuration ? `${voiceDuration.toFixed(1)}s` : "Play")}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: "#000000" }]}
                      onPress={startRecording}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendBtnText}>Voice 🎤</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sendBtn}
                      onPress={async () => {
                        if (!text.trim() || !selectedClientId) return;
                        const trimmed = text.trim();
                        setText("");
                        try {
                          const res = await api.post("/messages/send", {
                            receiver: selectedClientId,
                            text: trimmed,
                          });
                          const savedMessage: Message = res.data;
                          const s = useChatStore.getState().socket;
                          s?.emit("sendMessage", savedMessage);
                          await fetchMessages(selectedClientId);
                          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                        } catch (err: any) {
                          console.error("Send message error:", err?.response?.data || err);
                        }
                      }}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendBtnText}>Send</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ffffff",
  },

  /* ── LEFT PANE ── */
  leftPane: {
    flex: 1,
    borderRightWidth: 0,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 12,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 6,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  tabActive: {
    backgroundColor: "#000000",
  },
  tabText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  userCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ebebeb",
    marginBottom: 8,
  },
  userSelected: {
    borderColor: "#000000",
    backgroundColor: "#f0f0f0",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userName: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
  userRole: {
    color: "#9a9a9a",
    fontSize: 12,
    marginTop: 3,
  },
  userRight: {
    marginLeft: 12,
    alignItems: "flex-end",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  emptyText: {
    color: "#9a9a9a",
    fontSize: 13,
  },

  /* ── RIGHT PANE ── */
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
    borderBottomColor: "#E5E5E5",
    paddingBottom: 12,
    marginBottom: 12,
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
  backBtn: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  backBtnText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 13,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
