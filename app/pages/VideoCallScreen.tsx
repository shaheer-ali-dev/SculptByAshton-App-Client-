import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useChatStore } from "../../store/useMessagingStore";

/**
 * VideoCallScreen (robust; avoids re-render loops)
 *
 * - Resolves params once on mount and keeps them in state.
 * - Buffers ICE candidates until PC is ready.
 * - Uses refs to prevent repeated start/teardown.
 */

type RouteParams = {
  partnerId?: string;
  isCaller?: string | boolean;
  partnerName?: string;
};

export default function VideoCallScreen(props: any) {
  const router = useRouter();
  const route = props?.route;

const emitOffer = useChatStore(s => s.emitOffer);
const emitAnswer = useChatStore(s => s.emitAnswer);
const emitIce = useChatStore(s => s.emitIce);
const emitCallEnd = useChatStore(s => s.emitCallEnd);
const clearCallSignals = useChatStore(s => s.clearCallSignals);

const lastOffer = useChatStore(s => s.lastOffer);
const lastAnswer = useChatStore(s => s.lastAnswer);
const lastIce = useChatStore(s => s.lastIce);
const incomingCall = useChatStore(s => s.incomingCall);


  // --- Resolve params once on mount ---
  const [partnerId, setPartnerId] = useState<string>("");
  const [isCaller, setIsCaller] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>("");

  useEffect(() => {
    // Try route props first
    const supplied = (route && route.params) || (props && (props as any).params) || {};
    let pid = supplied.partnerId;
    let isc = supplied.isCaller;
    let pname = supplied.partnerName;

    // Fallback to query string (web)
    if (!pid && typeof window !== "undefined") {
      try {
        const u = new URL(window.location.href);
        pid = pid || u.searchParams.get("partnerId") || undefined;
        const qsIs = u.searchParams.get("isCaller");
        isc = isc === undefined && qsIs !== null ? qsIs === "true" : isc;
        pname = pname || u.searchParams.get("partnerName") || undefined;
      } catch (e) {}
    }

    // Final fallback: incomingCall.from (callee)
    if (!pid && incomingCall?.from) pid = incomingCall.from;

    setPartnerId(pid || "");
    setIsCaller(isc === true || isc === "true");
    setPartnerName(pname || "");

    // Do not re-run; resolve once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- WebRTC state/refs ---
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);

  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const pendingIceRef = useRef<any[]>([]);

  const [localFacing, setLocalFacing] = useState<"user" | "environment">("user");
  const [connected, setConnected] = useState(false);
  const [ringing, setRinging] = useState(false);

  const isWeb = Platform.OS === "web";
  const pcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    if (isWeb) {
      const s = await (navigator.mediaDevices as any).getUserMedia({
        audio: true,
        video: { facingMode: localFacing === "user" ? "user" : "environment" },
      });
      localStreamRef.current = s;
      if (localVideoRef.current) {
        try {
          (localVideoRef.current as any).srcObject = s;
          (localVideoRef.current as any).play().catch(() => {});
        } catch {}
      }
      return s;
    } else {
      // native: react-native-webrtc required
      // @ts-ignore
      const { mediaDevices } = require("react-native-webrtc");
      const s = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: localFacing === "user" ? "user" : "environment" },
      });
      localStreamRef.current = s;
      return s;
    }
  };

  const ensurePC = async () => {
    if (pcRef.current) return pcRef.current;

    if (isWeb) {
      const pc = new RTCPeerConnection(pcConfig);
      pc.onicecandidate = (e: any) => {
        if (e.candidate && partnerId) emitIce(partnerId, e.candidate);
      };
      pc.ontrack = (ev: any) => {
        remoteStreamRef.current = ev.streams?.[0];
        if (remoteVideoRef.current) {
          try {
            (remoteVideoRef.current as any).srcObject = remoteStreamRef.current;
            (remoteVideoRef.current as any).play().catch(() => {});
          } catch {}
        }
      };

      const local = await getLocalStream();
      local.getTracks().forEach((t: any) => pc.addTrack(t, local));
      pcRef.current = pc;

      // drain pending ICE candidates
      if (pendingIceRef.current.length) {
        pendingIceRef.current.forEach((c) => {
          try {
            pc.addIceCandidate(new (window as any).RTCIceCandidate(c)).catch(() => {});
          } catch {}
        });
        pendingIceRef.current = [];
      }

      return pc;
    } else {
      // native
      // @ts-ignore
      const { RTCPeerConnection } = require("react-native-webrtc");
      const pc = new RTCPeerConnection(pcConfig);
      pc.onicecandidate = (e: any) => {
        if (e.candidate && partnerId) emitIce(partnerId, e.candidate);
      };
      pc.onaddstream = (ev: any) => {
        remoteStreamRef.current = ev.stream;
      };
      const local = await getLocalStream();
      try {
        pc.addStream(local);
      } catch {
        local.getTracks().forEach((t: any) => pc.addTrack(t, local));
      }
      pcRef.current = pc;

      // drain pending ICE
      pendingIceRef.current.forEach((c) => {
        try {
          pc.addIceCandidate(c).catch(() => {});
        } catch {}
      });
      pendingIceRef.current = [];
      return pc;
    }
  };

  // Start a call (caller)
  const startCall = async () => {
    if (!partnerId) {
      Alert.alert("Call error", "No partner specified");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      await getLocalStream();
      const pc = await ensurePC();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emitOffer(partnerId, offer);
      setRinging(true);
    } catch (e) {
      console.error("startCall error", e);
      Alert.alert("Call error", "Could not start call (camera/mic?)");
    }
  };

 const endedRef = useRef(false);
const answeredRef = useRef(false);

const teardown = async (notify = true) => {
  if (endedRef.current) return;
  endedRef.current = true;

  try {
    if (notify && partnerId) emitCallEnd(partnerId);
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t: any) => t.stop());
    }
  } catch {}
  finally {
    clearCallSignals();
    router.back();
  }
};


  // Answer incoming offers
  useEffect(() => {
  if (!lastOffer) return;
  if (answeredRef.current) return;
  if (lastOffer.from !== partnerId) return;

  answeredRef.current = true;

  (async () => {
    await getLocalStream();
    const pc = await ensurePC();
    await pc.setRemoteDescription(
      new (window as any).RTCSessionDescription(lastOffer.offer)
    );
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    emitAnswer(lastOffer.from, ans);
    setConnected(true);
  })();
}, [lastOffer]);

  // Handle answer (caller)
  useEffect(() => {
    if (!lastAnswer) return;
    if (!partnerId) return;
    if (lastAnswer.from !== partnerId) return;
    (async () => {
      try {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new (window as any).RTCSessionDescription(lastAnswer.answer));
        setRinging(false);
        setConnected(true);
      } catch (e) {
        console.error("process answer", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAnswer]);

  // ICE candidates (buffer if pc not ready)
  useEffect(() => {
    if (!lastIce) return;
    if (!partnerId) return;
    if (lastIce.from !== partnerId) return;

    (async () => {
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new (window as any).RTCIceCandidate(lastIce.candidate));
        } else {
          pendingIceRef.current.push(lastIce.candidate);
        }
      } catch (e) {
        console.warn("addIce failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastIce]);

  useEffect(() => {
  return () => {
    // unmount ONLY
    try {
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t: any) => t.stop());
      }
    } catch {}
  };
}, []);

  const flipCamera = async () => {
    if (isWeb) {
      try {
        setLocalFacing((p) => (p === "user" ? "environment" : "user"));
        if (localStreamRef.current) {
          try { localStreamRef.current.getTracks().forEach((t: any) => t.stop()); } catch {}
          localStreamRef.current = null;
        }
        const s = await getLocalStream();
        if (pcRef.current) {
          const senders = pcRef.current.getSenders ? pcRef.current.getSenders() : [];
          const videoTrack = s.getVideoTracks()[0];
          const sender = senders.find((s: any) => s.track && s.track.kind === "video");
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
          else if (videoTrack) pcRef.current.addTrack(videoTrack, s);
        }
      } catch (e) {
        console.warn("flip failed", e);
      }
    } else {
      try {
        const local = localStreamRef.current;
        if (!local) return;
        const videoTrack = local.getVideoTracks && local.getVideoTracks()[0];
        if (videoTrack && typeof (videoTrack as any)._switchCamera === "function") {
          (videoTrack as any)._switchCamera();
        } else {
          setLocalFacing((p) => (p === "user" ? "environment" : "user"));
          if (localStreamRef.current) {
            try { localStreamRef.current.getTracks().forEach((t: any) => t.stop()); } catch {}
            localStreamRef.current = null;
          }
          const s = await getLocalStream();
          if (pcRef.current) {
            try {
              pcRef.current.getSenders().forEach((sd: any) => {
                if (sd.track && sd.track.kind === "video") sd.replaceTrack(s.getVideoTracks()[0]);
              });
            } catch {}
          }
        }
      } catch (e) {
        console.warn("flip native failed", e);
      }
    }
  };

  const endCall = async () => {
    await teardown(true);
  };

  const acceptCall = async () => {
    // nothing to do here because lastOffer effect will answer when offer arrives
    try {
      await getLocalStream();
      setRinging(false);
    } catch (e) {
      console.error("accept error", e);
    }
  };

  const rejectCall = async () => {
    if (partnerId) emitCallEnd(partnerId);
    await teardown(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {isWeb ? (
          <video ref={remoteVideoRef as any} autoPlay playsInline style={styles.remoteVideo as any} />
        ) : (
          <View style={[styles.remoteVideo, styles.centerFallback]}>
            <Text style={{ color: "#fff" }}>Native RTCView required</Text>
          </View>
        )}

        {isWeb ? (
          <video ref={localVideoRef as any} muted playsInline autoPlay style={styles.localVideo as any} />
        ) : (
          <View style={[styles.localVideo, styles.centerFallback]}>
            <Text style={{ color: "#fff" }}>Local preview</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={flipCamera}>
          <Text style={styles.controlText}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: "#ff5555" }]} onPress={endCall}>
          <Text style={[styles.controlText, { color: "#fff" }]}>End</Text>
        </TouchableOpacity>
      </View>

      {!isCaller && incomingCall && incomingCall.from === partnerId && (
        <View style={styles.incomingOverlay}>
          <Text style={styles.incomingText}>{partnerName || "Incoming call"}</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity style={[styles.acceptBtn]} onPress={acceptCall}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rejectBtn]} onPress={rejectCall}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  videoContainer: { flex: 1, width: "100%", backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  remoteVideo: { width: "100%", height: "100%", backgroundColor: "#111" },
  localVideo: { position: "absolute", width: 140, height: 200, right: 12, top: 24, borderRadius: 8, overflow: "hidden", backgroundColor: "#222" },
  controls: { position: "absolute", bottom: 30, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  controlBtn: { backgroundColor: "#ddd", padding: 12, borderRadius: 32, marginHorizontal: 8 },
  controlText: { color: "#000", fontWeight: "700" },
  incomingOverlay: { position: "absolute", top: 40, alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 8 },
  incomingText: { color: "#fff", fontSize: 16, marginBottom: 8 },
  acceptBtn: { backgroundColor: "#4ade80", padding: 10, borderRadius: 8, marginRight: 8 },
  rejectBtn: { backgroundColor: "#ff5555", padding: 10, borderRadius: 8 },
  centerFallback: { alignItems: "center", justifyContent: "center" },
});