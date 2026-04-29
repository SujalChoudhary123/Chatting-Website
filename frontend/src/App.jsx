import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./components/ChatHeader";
import { CallOverlay } from "./components/CallOverlay";
import { CallsPanel } from "./components/CallsPanel";
import { CommunitiesPanel } from "./components/CommunitiesPanel";
import { Composer } from "./components/Composer";
import { DetailsPanel } from "./components/DetailsPanel";
import { InboxPanel } from "./components/InboxPanel";
import { JoinOverlay } from "./components/JoinOverlay";
import { MediaPanel } from "./components/MediaPanel";
import { MessageList } from "./components/MessageList";
import { SettingsPanel } from "./components/SettingsPanel";
import { StarredPanel } from "./components/StarredPanel";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  supportsAvatarUploads,
  supportsCalls,
  supportsRealtime,
  supportsUploads,
  backendRuntime,
} from "./lib/backendRuntime";
import { getApiBaseUrl, getJavaEventsUrl, setSocketToken, socket } from "./lib/socket";
import { getInitials } from "./utils/initials";
import {
  acceptConnectionRequest,
  fetchCurrentUser,
  fetchConnectionRequests,
  fetchRoomMessages,
  fetchRooms,
  reactToMessage,
  completeRegistration,
  requestOtp,
  searchUsers,
  sendConnectionRequest,
  sendCallSignal,
  sendMessage,
  updateProfile,
  uploadFile,
  verifyOtp,
  loginWithPassword,
} from "./services/api";

export default function App() {
  const pollIntervalMs = 3000;
  const [authToken, setAuthToken] = useLocalStorage("pulsechat-token", "", "session");
  const [user, setUser] = useLocalStorage("pulsechat-user", null, "session");
  const [authMode, setAuthMode] = useState("login");
  const [authStep, setAuthStep] = useState("credentials");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    otp: "",
    handle: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState("chats");
  const [chatMode, setChatMode] = useState("messages");
  const [messageInput, setMessageInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState("Search for a user ID to start chatting.");
  const [isConnected, setIsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState([]);
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  const [connectionRequests, setConnectionRequests] = useState({ incoming: [], outgoing: [] });
  const [busyConnectHandle, setBusyConnectHandle] = useState("");
  const [acceptingRequestId, setAcceptingRequestId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [localCallStream, setLocalCallStream] = useState(null);
  const [remoteCallStream, setRemoteCallStream] = useState(null);
  const [isAcceptingCall, setIsAcceptingCall] = useState(false);
  const [callHistory, setCallHistory] = useLocalStorage("pulsechat-call-history", [], "session");
  const [starredRoomIds, setStarredRoomIds] = useLocalStorage("pulsechat-starred-room-ids", [], "session");
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const discoverTimeoutRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const sseRef = useRef(null);
  const activeCallRef = useRef(null);
  const activeRoomIdRef = useRef("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(discoverTimeoutRef.current);
      teardownCall();
    };
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!authToken) {
        setAuthReady(true);
        return;
      }

      try {
        const payload = await fetchCurrentUser(authToken);
        setUser(payload.user);
        setStatus("Authenticated. Loading conversations...");
      } catch {
        setAuthToken("");
        setUser(null);
        setStatus("Your session expired. Please log in again.");
      } finally {
        setAuthReady(true);
      }
    };

    bootstrapAuth();
  }, [authToken, setAuthToken, setUser]);

  useEffect(() => {
    let cancelled = false;

    const loadRooms = async () => {
      if (!authToken || !user) {
        return;
      }

      try {
        const payload = await fetchRooms(authToken);
        if (cancelled) {
          return;
        }

        setRooms(payload.rooms);
        setActiveRoomId((current) => {
          if (current && payload.rooms.some((room) => room.id === current)) {
            return current;
          }

          return payload.rooms[0]?.id ?? "";
        });
      } catch (error) {
        if (!cancelled) {
          setStatus(error.message);
        }
      }
    };

    loadRooms();

    if (supportsRealtime) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(loadRooms, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authToken, pollIntervalMs, user]);

  useEffect(() => {
    if (!authToken || !user) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      socket.disconnect();
      setSocketToken(null);
      setIsConnected(false);
      return;
    }

    if (!supportsRealtime) {
      if (sseRef.current) {
        sseRef.current.close();
      }

      const realtimeStream = new EventSource(getJavaEventsUrl(authToken));
      sseRef.current = realtimeStream;

      const handleJavaEvent = (eventName, payload) => {
        if (eventName === "connected") {
          setIsConnected(true);
          setStatus(`Connected to the ${backendRuntime} backend in live-update mode as @${user.handle ?? user.name}`);
          return;
        }

        if (eventName === "message:new") {
          const message = payload;
          if (message.roomId === activeRoomIdRef.current) {
            setMessages((current) =>
              current.some((item) => item.id === message.id) ? current : [...current, message]
            );
          } else {
            setUnreadCounts((current) => ({
              ...current,
              [message.roomId]: (current[message.roomId] ?? 0) + 1,
            }));
          }
          return;
        }

        if (eventName === "message:updated") {
          const message = payload;
          if (message.roomId !== activeRoomIdRef.current) {
            return;
          }

          setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
          return;
        }

        if (eventName === "rooms:update") {
          setRooms(payload.rooms);
          setActiveRoomId((current) => {
            if (current && payload.rooms.some((room) => room.id === current)) {
              return current;
            }

            return payload.rooms[0]?.id ?? "";
          });
          return;
        }

        if (eventName === "connection-requests:update") {
          setConnectionRequests(payload);
          return;
        }

        if (eventName === "call:incoming") {
          const { callId, roomId, mode, fromUser } = payload;
          const incomingCall = {
            callId,
            roomId,
            mode,
            phase: "incoming",
            participant: fromUser,
          };
          activeCallRef.current = incomingCall;
          setActiveCall(incomingCall);
          setIsAcceptingCall(false);
          resetRemoteStream();
          setStatus(`${mode === "video" ? "Video" : "Voice"} call incoming from @${fromUser.handle ?? fromUser.name}.`);
          return;
        }

        if (eventName === "call:accepted") {
          const { callId, roomId, mode, byUser } = payload;
          const currentCall = activeCallRef.current;
          if (!currentCall || currentCall.callId !== callId) {
            return;
          }

          const nextCall = {
            ...currentCall,
            roomId,
            mode,
            phase: "active",
            participant: byUser,
          };
          activeCallRef.current = nextCall;
          setActiveCall(nextCall);
          void createOfferForCall({
            callId,
            roomId,
            mode,
            participant: byUser,
          });
          setStatus(`${mode === "video" ? "Video" : "Voice"} call connected with @${byUser.handle ?? byUser.name}.`);
          return;
        }

        if (eventName === "call:declined") {
          const { callId, byUser } = payload;
          teardownCall();
          setIsAcceptingCall(false);
          if (activeCallRef.current?.callId === callId) {
            activeCallRef.current = null;
            setActiveCall(null);
          }
          setStatus(`Call declined by @${byUser.handle ?? byUser.name}.`);
          return;
        }

        if (eventName === "call:ended") {
          const { callId, byUser } = payload;
          teardownCall();
          setIsAcceptingCall(false);
          if (activeCallRef.current?.callId === callId) {
            activeCallRef.current = null;
            setActiveCall(null);
          }
          setStatus(`Call ended by @${byUser.handle ?? byUser.name}.`);
          return;
        }

        if (eventName === "call:offer") {
          const { callId, roomId, fromUserId, description } = payload;
          const currentCall = activeCallRef.current;
          if (!currentCall || currentCall.callId !== callId) {
            return;
          }

          void (async () => {
            try {
              await ensurePeerConnection({
                callId,
                roomId,
                mode: currentCall.mode,
                targetUserId: fromUserId,
                allowReceiveOnly: true,
              });

              const connection = peerConnectionRef.current;
              if (!connection) {
                return;
              }

              await connection.setRemoteDescription(new RTCSessionDescription(description));
              const answer = await connection.createAnswer();
              await connection.setLocalDescription(answer);

              await emitCallSignal({
                action: "call:answer",
                callId,
                roomId,
                targetUserId: fromUserId,
                description: answer,
              });
            } catch (error) {
              setStatus(error.message || "Could not accept the call media stream.");
            }
          })();
          return;
        }

        if (eventName === "call:answer") {
          const { callId, description } = payload;
          if (!activeCallRef.current || activeCallRef.current.callId !== callId || !peerConnectionRef.current) {
            return;
          }

          void peerConnectionRef.current
            .setRemoteDescription(new RTCSessionDescription(description))
            .catch((error) => setStatus(error.message || "Could not connect the call."));
          return;
        }

        if (eventName === "call:ice-candidate") {
          const { callId, candidate } = payload;
          if (!activeCallRef.current || activeCallRef.current.callId !== callId || !peerConnectionRef.current) {
            return;
          }

          void peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      };

      const javaEventNames = [
        "connected",
        "message:new",
        "message:updated",
        "rooms:update",
        "connection-requests:update",
        "call:incoming",
        "call:accepted",
        "call:declined",
        "call:ended",
        "call:offer",
        "call:answer",
        "call:ice-candidate",
      ];

      javaEventNames.forEach((eventName) => {
        realtimeStream.addEventListener(eventName, (event) => {
          try {
            handleJavaEvent(eventName, JSON.parse(event.data));
          } catch {
            // Ignore malformed realtime messages.
          }
        });
      });

      realtimeStream.addEventListener("open", () => {
        setIsConnected(true);
        setStatus(`Connected to the ${backendRuntime} backend in live-update mode as @${user.handle ?? user.name}`);
      });

      realtimeStream.addEventListener("error", () => {
        setIsConnected(false);
        setStatus(`Connection to the ${backendRuntime} backend was interrupted. Reconnecting...`);
      });

      socket.disconnect();
      setSocketToken(null);
      return () => {
        realtimeStream.close();
        if (sseRef.current === realtimeStream) {
          sseRef.current = null;
        }
      };
    }

    setSocketToken(authToken);

    const handleConnect = () => {
      setIsConnected(true);
      setStatus(`Connected as @${user.handle ?? user.name}`);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setStatus("Connection lost. Trying to reconnect...");
    };

    const handleConnectError = (error) => {
      setStatus(error.message || "Socket authentication failed.");
    };

    const handleRoomsUpdate = (payload) => {
      setRooms(payload.rooms);
      setActiveRoomId((current) => {
        if (current && payload.rooms.some((room) => room.id === current)) {
          return current;
        }

        return payload.rooms[0]?.id ?? "";
      });
    };

    const handleRoomHistory = ({ roomId, messages: roomMessages }) => {
      if (roomId === activeRoomIdRef.current) {
        setMessages(roomMessages);
      }
    };

    const handleMessage = (message) => {
      if (message.roomId === activeRoomIdRef.current) {
        setMessages((current) =>
          current.some((item) => item.id === message.id) ? current : [...current, message]
        );
        return;
      }

      setUnreadCounts((current) => ({
        ...current,
        [message.roomId]: (current[message.roomId] ?? 0) + 1,
      }));
    };

    const handleMessageUpdated = (message) => {
      if (message.roomId !== activeRoomIdRef.current) {
        return;
      }

      setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
    };

    const handlePresence = ({ roomId, members: roomMembers }) => {
      if (roomId === activeRoomIdRef.current) {
        setMembers(roomMembers);
      }
    };

    const handleTyping = ({ roomId, username, isTyping }) => {
      if (roomId !== activeRoomIdRef.current) {
        return;
      }

      setTypingUsers((current) =>
        isTyping
          ? current.includes(username)
            ? current
            : [...current, username]
          : current.filter((name) => name !== username)
      );
    };

    const handleError = ({ message }) => setStatus(message);
    const handleConnectionRequestsUpdate = (payload) => setConnectionRequests(payload);
    const handleIncomingCall = ({ callId, roomId, mode, fromUser }) => {
      const incomingCall = {
        callId,
        roomId,
        mode,
        phase: "incoming",
        participant: fromUser,
      };
      activeCallRef.current = incomingCall;
      setActiveCall(incomingCall);
      setIsAcceptingCall(false);
      resetRemoteStream();
      setStatus(`${mode === "video" ? "Video" : "Voice"} call incoming from @${fromUser.handle ?? fromUser.name}.`);
    };
    const handleAcceptedCall = ({ callId, roomId, mode, byUser }) => {
      const currentCall = activeCallRef.current;
      if (!currentCall || currentCall.callId !== callId) {
        return;
      }

      const nextCall = {
        ...currentCall,
        roomId,
        mode,
        phase: "active",
        participant: byUser,
      };
      activeCallRef.current = nextCall;
      setActiveCall(nextCall);
      void createOfferForCall({
        callId,
        roomId,
        mode,
        participant: byUser,
      });
      setStatus(`${mode === "video" ? "Video" : "Voice"} call connected with @${byUser.handle ?? byUser.name}.`);
    };
    const handleDeclinedCall = ({ callId, byUser }) => {
      teardownCall();
      setIsAcceptingCall(false);
      if (activeCallRef.current?.callId === callId) {
        activeCallRef.current = null;
        setActiveCall(null);
      }
      setStatus(`Call declined by @${byUser.handle ?? byUser.name}.`);
    };
    const handleEndedCall = ({ callId, byUser }) => {
      teardownCall();
      setIsAcceptingCall(false);
      if (activeCallRef.current?.callId === callId) {
        activeCallRef.current = null;
        setActiveCall(null);
      }
      setStatus(`Call ended by @${byUser.handle ?? byUser.name}.`);
    };
    const handleCallOffer = async ({ callId, roomId, fromUserId, description }) => {
      const currentCall = activeCallRef.current;
      if (!currentCall || currentCall.callId !== callId) {
        return;
      }

      try {
        await ensurePeerConnection({
          callId,
          roomId,
          mode: currentCall.mode,
          targetUserId: fromUserId,
          allowReceiveOnly: true,
        });

        const connection = peerConnectionRef.current;
        if (!connection) {
          return;
        }

        await connection.setRemoteDescription(new RTCSessionDescription(description));
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        void emitCallSignal({
          action: "call:answer",
          callId,
          roomId,
          targetUserId: fromUserId,
          description: answer,
        });
      } catch (error) {
        setStatus(error.message || "Could not accept the call media stream.");
      }
    };
    const handleCallAnswer = async ({ callId, description }) => {
      if (!activeCallRef.current || activeCallRef.current.callId !== callId || !peerConnectionRef.current) {
        return;
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(description));
      } catch (error) {
        setStatus(error.message || "Could not connect the call.");
      }
    };
    const handleIceCandidate = async ({ callId, candidate }) => {
      if (!activeCallRef.current || activeCallRef.current.callId !== callId || !peerConnectionRef.current) {
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore transient ICE timing issues.
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("rooms:update", handleRoomsUpdate);
    socket.on("room:history", handleRoomHistory);
    socket.on("message:new", handleMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("room:presence", handlePresence);
    socket.on("typing:update", handleTyping);
    socket.on("error:message", handleError);
    socket.on("connection-requests:update", handleConnectionRequestsUpdate);
    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleAcceptedCall);
    socket.on("call:declined", handleDeclinedCall);
    socket.on("call:ended", handleEndedCall);
    socket.on("call:offer", handleCallOffer);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("rooms:update", handleRoomsUpdate);
      socket.off("room:history", handleRoomHistory);
      socket.off("message:new", handleMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("room:presence", handlePresence);
      socket.off("typing:update", handleTyping);
      socket.off("error:message", handleError);
      socket.off("connection-requests:update", handleConnectionRequestsUpdate);
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleAcceptedCall);
      socket.off("call:declined", handleDeclinedCall);
      socket.off("call:ended", handleEndedCall);
      socket.off("call:offer", handleCallOffer);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
    };
  }, [authToken, user]);

  useEffect(() => {
    if (!supportsRealtime || !user || !authToken || !isConnected || !activeRoomId) {
      return;
    }

    setMembers([]);
    setTypingUsers([]);
    socket.emit("room:join", { roomId: activeRoomId });
  }, [activeRoomId, authToken, isConnected, user]);

  useEffect(() => {
    let cancelled = false;

    const loadRoomMessages = async () => {
      if (!authToken || !activeRoomId) {
        setMessages([]);
        return;
      }

      try {
        const payload = await fetchRoomMessages(activeRoomId, authToken);
        if (!cancelled) {
          setMessages(payload.messages);
        }
      } catch (error) {
        if (!cancelled) {
          setMessages([]);
          setStatus(error.message);
        }
      }
    };

    loadRoomMessages();

    if (supportsRealtime) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(loadRoomMessages, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeRoomId, authToken, pollIntervalMs]);

  useEffect(() => {
    if (!activeRoomId) {
      return;
    }

    setUnreadCounts((current) => ({
      ...current,
      [activeRoomId]: 0,
    }));
  }, [activeRoomId]);

  useEffect(() => {
    setIsDetailsOpen(false);
  }, [activeRoomId]);

  useEffect(() => {
    setChatMode("messages");
  }, [activeRoomId]);

  useEffect(() => {
    if (!rooms.length) {
      return;
    }

    const visibleRoomIds = new Set(rooms.map((room) => room.id));
    setCallHistory((current) => {
      const next = current.filter((entry) => visibleRoomIds.has(entry.roomId));
      return next.length === current.length ? current : next;
    });
  }, [rooms, setCallHistory]);

  useEffect(() => {
    if (currentView === "communities") {
      setStatus("Browse your trusted network and open any conversation from here.");
    }

    if (currentView === "starred") {
      setStatus("Starred chats stay pinned here for quick access.");
    }
  }, [currentView]);

  useEffect(() => {
    if (!authToken || !user) {
      setConnectionRequests({ incoming: [], outgoing: [] });
      return;
    }

    const normalizedQuery = discoverQuery.trim();
    if (!normalizedQuery) {
      setDiscoverResults([]);
      setDiscoverError("");
      setDiscoverBusy(false);
      return;
    }

    clearTimeout(discoverTimeoutRef.current);
    discoverTimeoutRef.current = setTimeout(async () => {
      setDiscoverBusy(true);
      setDiscoverError("");

      try {
        const payload = await searchUsers(normalizedQuery, authToken);
        setDiscoverResults(payload.users);
      } catch (error) {
        setDiscoverResults([]);
        setDiscoverError(error.message);
      } finally {
        setDiscoverBusy(false);
      }
    }, 250);
  }, [authToken, discoverQuery, user]);

  useEffect(() => {
    let cancelled = false;

    const loadConnectionRequests = async () => {
      if (!authToken || !user) {
        setConnectionRequests({ incoming: [], outgoing: [] });
        return;
      }

      try {
        const payload = await fetchConnectionRequests(authToken);
        if (!cancelled) {
          setConnectionRequests(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error.message);
        }
      }
    };

    loadConnectionRequests();

    if (supportsRealtime) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(loadConnectionRequests, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authToken, pollIntervalMs, user]);

  const handleAuthFormChange = (field, value) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const resetAuthState = (nextMode = authMode) => {
    setAuthForm({ name: "", email: "", otp: "", handle: "", password: "" });
    setAuthError("");
    setDevOtp("");
    setSignupToken("");
    setAuthStep(nextMode === "register" ? "email" : "credentials");
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");

    try {
      if (authMode === "login") {
        const payload = await loginWithPassword({
          handle: authForm.handle,
          password: authForm.password,
        });

        setAuthToken(payload.token);
        setUser(payload.user);
        resetAuthState();
        setStatus(`Welcome back, @${payload.user.handle ?? payload.user.name}`);
      } else if (authStep === "email") {
        const payload = await requestOtp({
          name: authForm.name,
          email: authForm.email,
        });

        setAuthStep("otp");
        setDevOtp(payload.devOtp ?? "");
        setStatus(payload.message);
      } else if (authStep === "otp") {
        const payload = await verifyOtp({
          email: authForm.email,
          otp: authForm.otp,
        });

        setSignupToken(payload.signupToken);
        setAuthStep("profile");
        setStatus("Email verified. Choose your username and password.");
      } else {
        const payload = await completeRegistration({
          signupToken,
          handle: authForm.handle,
          password: authForm.password,
        });

        setAuthToken(payload.token);
        setUser(payload.user);
        resetAuthState();
        setStatus(`Welcome to PulseChat, @${payload.user.handle ?? payload.user.name}`);
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    teardownCall();
    socket.disconnect();
    setSocketToken(null);
    setAuthToken("");
    setUser(null);
    setMessages([]);
    setMembers([]);
    setRooms([]);
    setConnectionRequests({ incoming: [], outgoing: [] });
    setActiveCall(null);
    setActiveRoomId("");
    setStatus("Logged out.");
  };

  const handleSaveProfile = async (profileForm) => {
    if (!authToken) {
      return;
    }

    setSettingsSaving(true);
    try {
      if (profileForm.avatarFile && !supportsAvatarUploads) {
        throw new Error("Profile photo uploads are not available with the current backend.");
      }

      const avatarUrl = profileForm.avatarFile
        ? supportsUploads
          ? (await uploadFile(profileForm.avatarFile, authToken)).url
          : await convertImageFileToDataUrl(profileForm.avatarFile)
        : user?.avatarUrl ?? "";
      const payload = await updateProfile(
        {
          name: profileForm.name,
          handle: profileForm.handle,
          avatarUrl,
        },
        authToken
      );
      setUser(payload.user);
      setStatus(`Profile updated for @${payload.user.handle}`);
      setSettingsOpen(false);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const sendTypingSignal = () => {
    if (!supportsRealtime || !activeRoomId) {
      return;
    }

    socket.emit("typing:start", { roomId: activeRoomId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(
      () => socket.emit("typing:stop", { roomId: activeRoomId }),
      1200
    );
  };

  const handleMessageInputChange = (value) => {
    setMessageInput(value);
    sendTypingSignal();
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!user || !authToken) {
      setStatus("Please log in before sending a message.");
      return;
    }

    if (!activeRoomId) {
      setStatus("Search for a user ID and start a conversation first.");
      return;
    }

    if (!messageInput.trim() && !selectedFile) {
      return;
    }

    if (selectedFile && !supportsUploads) {
      setStatus("File uploads are only available when the Node.js backend is selected.");
      return;
    }

    setSending(true);
    try {
      const attachment = selectedFile ? await uploadFile(selectedFile, authToken) : null;
      const payload = await sendMessage({
        roomId: activeRoomId,
        text: messageInput,
        attachment,
      }, authToken);

      if (payload?.message) {
        setMessages((current) =>
          current.some((item) => item.id === payload.message.id)
            ? current
            : [...current, payload.message]
        );

        setRooms((current) =>
          current.map((room) =>
            room.id === activeRoomId
              ? {
                  ...room,
                  lastMessageAt: payload.message.createdAt,
                  lastMessagePreview:
                    payload.message.text || payload.message.attachment?.fileName || "No messages yet",
                }
              : room
          )
        );
      }

      setMessageInput("");
      setSelectedFile(null);
      if (supportsRealtime) {
        socket.emit("typing:stop", { roomId: activeRoomId });
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleConnectAction = async (person) => {
    if (!authToken) {
      return;
    }

    const existingRoom = sortedRooms.find((room) => room.participant?.handle === person.handle);
    if (existingRoom) {
      setActiveRoomId(existingRoom.id);
      setStatus(`Opened chat with @${person.handle}.`);
      return;
    }

    const incomingRequest = connectionRequests.incoming.find(
      (request) => request.user.handle === person.handle
    );
    if (incomingRequest) {
      await handleAcceptConnectionRequest(incomingRequest.id);
      return;
    }

    const outgoingRequest = connectionRequests.outgoing.find(
      (request) => request.user.handle === person.handle
    );
    if (outgoingRequest) {
      setStatus(`Connection request to @${person.handle} is still pending.`);
      return;
    }

    setBusyConnectHandle(person.handle);
    setDiscoverError("");

    try {
      await sendConnectionRequest(person.handle, authToken);
      setStatus(`Connection request sent to @${person.handle}.`);
    } catch (error) {
      setDiscoverError(error.message);
    } finally {
      setBusyConnectHandle("");
    }
  };

  const handleAcceptConnectionRequest = async (requestId) => {
    if (!authToken) {
      return;
    }

    setAcceptingRequestId(requestId);
    setDiscoverError("");

    try {
      const payload = await acceptConnectionRequest(requestId, authToken);
      setRooms((current) => {
        const nextRooms = current.filter((room) => room.id !== payload.room.id);
        return [payload.room, ...nextRooms];
      });
      setActiveRoomId(payload.room.id);
      setDiscoverQuery("");
      setDiscoverResults([]);
      setStatus(`Connection accepted. You can now message @${payload.room.participant.handle}.`);
    } catch (error) {
      setDiscoverError(error.message);
    } finally {
      setAcceptingRequestId("");
    }
  };

  const handleReact = async (messageId, emoji) => {
    if (!activeRoomId || !authToken) {
      return;
    }

    try {
      const payload = await reactToMessage({ roomId: activeRoomId, messageId, emoji }, authToken);
      setMessages((current) =>
        current.map((item) => (item.id === payload.message.id ? payload.message : item))
      );
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleToggleStarRoom = (roomId) => {
    setStarredRoomIds((current) =>
      current.includes(roomId) ? current.filter((item) => item !== roomId) : [roomId, ...current]
    );
  };

  const handleStartCall = async (mode) => {
    if (!supportsCalls) {
      setStatus("Voice and video calls are available when the Node.js backend is selected.");
      return;
    }

    if (!activeRoom?.participant) {
      setStatus("Open a conversation first to start a call.");
      return;
    }

    const callId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const nextCall = {
      callId,
      roomId: activeRoom.id,
      mode,
      phase: "outgoing",
      participant: activeRoom.participant,
    };
    activeCallRef.current = nextCall;
    setActiveCall(nextCall);
    resetRemoteStream();
    try {
      await prepareLocalMedia(mode);
      await emitCallSignal({
        action: "call:invite",
        callId,
        roomId: activeRoom.id,
        mode,
        targetUserId: activeRoom.participant.id,
      });
    } catch (error) {
      setStatus(error.message);
      activeCallRef.current = null;
      setActiveCall(null);
      return;
    }
    setStatus(
      `${mode === "video" ? "Video call" : "Voice call"} started with @${
        activeRoom.participant.handle ?? activeRoom.name
      }.`
    );
    appendCallHistory({
      id: callId,
      roomId: activeRoom.id,
      mode,
      direction: "outgoing",
      status: "ringing",
      participant: activeRoom.participant,
    });
  };

  const handleAcceptCall = async () => {
    if (!activeCall?.participant || activeCall.phase !== "incoming" || isAcceptingCall) {
      return;
    }

    setIsAcceptingCall(true);
    try {
      await ensurePeerConnection({
        callId: activeCall.callId,
        roomId: activeCall.roomId,
        mode: activeCall.mode,
        targetUserId: activeCall.participant.id,
        allowReceiveOnly: true,
      });

      await emitCallSignal({
        action: "call:accept",
        callId: activeCall.callId,
        roomId: activeCall.roomId,
        mode: activeCall.mode,
        targetUserId: activeCall.participant.id,
      });
    } catch (error) {
      setStatus(error.message);
      setIsAcceptingCall(false);
      return;
    }
    const nextCall = activeCallRef.current ? { ...activeCallRef.current, phase: "active" } : null;
    activeCallRef.current = nextCall;
    setActiveCall(nextCall);
    setIsAcceptingCall(false);
    setStatus(
      `${activeCall.mode === "video" ? "Video" : "Voice"} call connected with @${
        activeCall.participant.handle ?? activeCall.participant.name
      }.`
    );
    appendCallHistory({
      id: activeCall.callId,
      roomId: activeCall.roomId,
      mode: activeCall.mode,
      direction: "incoming",
      status: "accepted",
      participant: activeCall.participant,
    });
  };

  const handleDeclineCall = async () => {
    if (!activeCall?.participant) {
      return;
    }

    try {
      await emitCallSignal({
        action: "call:decline",
        callId: activeCall.callId,
        roomId: activeCall.roomId,
        targetUserId: activeCall.participant.id,
      });
    } catch (error) {
      setStatus(error.message);
      return;
    }
    setStatus(
      `${activeCall.phase === "incoming" ? "Declined" : "Cancelled"} ${
        activeCall.mode === "video" ? "video" : "voice"
      } call with @${activeCall.participant.handle ?? activeCall.participant.name}.`
    );
    appendCallHistory({
      id: activeCall.callId,
      roomId: activeCall.roomId,
      mode: activeCall.mode,
      direction: activeCall.phase === "incoming" ? "incoming" : "outgoing",
      status: activeCall.phase === "incoming" ? "declined" : "missed",
      participant: activeCall.participant,
    });
    teardownCall();
    setIsAcceptingCall(false);
    activeCallRef.current = null;
    setActiveCall(null);
  };

  const handleEndCall = async () => {
    if (!activeCall?.participant) {
      return;
    }

    try {
      await emitCallSignal({
        action: "call:end",
        callId: activeCall.callId,
        roomId: activeCall.roomId,
        targetUserId: activeCall.participant.id,
      });
    } catch (error) {
      setStatus(error.message);
      return;
    }
    setStatus(`Call ended with @${activeCall.participant.handle ?? activeCall.participant.name}.`);
    appendCallHistory({
      id: activeCall.callId,
      roomId: activeCall.roomId,
      mode: activeCall.mode,
      direction: "outgoing",
      status: "completed",
      participant: activeCall.participant,
    });
    teardownCall();
    setIsAcceptingCall(false);
    activeCallRef.current = null;
    setActiveCall(null);
  };

  function appendCallHistory(entry) {
    setCallHistory((current) => {
      const next = [
        {
          ...entry,
          createdAt: new Date().toISOString(),
        },
        ...current.filter((item) => item.id !== entry.id),
      ];

      return next.slice(0, 30);
    });
  }

  async function prepareLocalMedia(mode) {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!isMediaCallingSupported()) {
      throw new Error(
        "Voice and video calls need HTTPS or localhost. Messaging works over Wi-Fi, but browsers block microphone and camera on plain http phone URLs."
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support voice or video calling.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
    localStreamRef.current = stream;
    setLocalCallStream(stream);
    return stream;
  }

  async function convertImageFileToDataUrl(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choose an image file for the profile photo.");
    }

    if (file.size > 1024 * 1024) {
      throw new Error("Profile photo must be 1 MB or smaller.");
    }

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Could not read the selected profile photo."));
      reader.readAsDataURL(file);
    });
  }

  async function prepareLocalMediaIfAvailable(mode) {
    try {
      return await prepareLocalMedia(mode);
    } catch {
      return null;
    }
  }

  function isMediaCallingSupported() {
    if (typeof window === "undefined") {
      return true;
    }

    if (window.isSecureContext) {
      return true;
    }

    return ["localhost", "127.0.0.1"].includes(window.location.hostname);
  }

  function resetRemoteStream() {
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    remoteStreamRef.current = null;
    setRemoteCallStream(null);
  }

  function teardownCall() {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalCallStream(null);
    }

    resetRemoteStream();
  }

  async function emitCallSignal(payload) {
    if (supportsRealtime) {
      socket.emit(payload.action, payload);
      return;
    }

    if (!authToken) {
      throw new Error("Please log in before starting a call.");
    }

    await sendCallSignal(payload, authToken);
  }

  async function ensurePeerConnection({ callId, roomId, mode, targetUserId, allowReceiveOnly = false }) {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const localStream = allowReceiveOnly
      ? await prepareLocalMediaIfAvailable(mode)
      : await prepareLocalMedia(mode);
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    setRemoteCallStream(remoteStream);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        connection.addTrack(track, localStream);
      });
    } else {
      connection.addTransceiver("audio", { direction: "recvonly" });
      if (mode === "video") {
        connection.addTransceiver("video", { direction: "recvonly" });
      }
      setStatus("This window joined the call in receive-only mode because mic/camera access is busy or unavailable.");
    }

    connection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      setRemoteCallStream(new MediaStream(remoteStream.getTracks()));
    };

    connection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      void emitCallSignal({
        action: "call:ice-candidate",
        callId,
        roomId,
        targetUserId,
        candidate: event.candidate.toJSON(),
      });
    };

    peerConnectionRef.current = connection;
    return connection;
  }

  async function createOfferForCall({ callId, roomId, mode, participant }) {
    try {
      const connection = await ensurePeerConnection({
        callId,
        roomId,
        mode,
        targetUserId: participant.id,
      });
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      await emitCallSignal({
        action: "call:offer",
        callId,
        roomId,
        targetUserId: participant.id,
        description: offer,
      });
    } catch (error) {
      setStatus(error.message || "Could not start the call media stream.");
    }
  }

  const activeRoom = rooms.find((room) => room.id === activeRoomId);
  const activeRoomStatus = activeRoom?.participant?.status === "online" ? "online" : "offline";
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMessages = messages.filter((message) => {
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      message.sender,
      message.text,
      message.attachment?.fileName,
      Object.keys(message.reactions ?? {}).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const sortedRooms = [...rooms].sort(
    (left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
  );
  const visibleCallHistory = callHistory.filter((entry) =>
    sortedRooms.some((room) => room.id === entry.roomId)
  );
  const starredRooms = sortedRooms.filter((room) => starredRoomIds.includes(room.id));
  const connectedHandles = sortedRooms.map((room) => room.participant?.handle).filter(Boolean);
  const onlineContactsCount = sortedRooms.filter(
    (room) => room.participant?.status === "online"
  ).length;

  useEffect(() => {
    if (currentView === "calls" && !visibleCallHistory.length) {
      setStatus(
        supportsCalls
          ? "No calls yet. Start a voice or video call to see history here."
          : "Call history is only active when the Node.js backend is selected."
      );
    }
  }, [currentView, visibleCallHistory.length]);

  if (!authReady) {
    return <div className="loading-screen">Loading secure workspace...</div>;
  }

  return (
    <div className="page-shell">
      {!user && (
        <JoinOverlay
          authMode={authMode}
          authStep={authStep}
          authForm={authForm}
          authError={authError}
          authBusy={authBusy}
          devOtp={devOtp}
          onAuthModeChange={(mode) => {
            setAuthMode(mode);
            resetAuthState(mode);
          }}
          onAuthFormChange={handleAuthFormChange}
          onSubmit={handleAuthSubmit}
          onBackToEmailEntry={() => {
            setAuthStep("email");
            setSignupToken("");
            setAuthForm((current) => ({ ...current, otp: "", handle: "", password: "" }));
            setAuthError("");
          }}
        />
      )}

      <div className="workspace-frame">
        <main className="chat-panel">
          <ChatHeader
            user={user}
            activeRoom={activeRoom}
            currentView={currentView}
            chatMode={chatMode}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onLogout={handleLogout}
            onOpenSettings={() => setSettingsOpen(true)}
            onChangeView={setCurrentView}
            onChangeChatMode={setChatMode}
            onlineCount={onlineContactsCount}
          />

          <div className={`chat-content-grid ${isDetailsOpen ? "details-open" : "details-closed"}`}>
            {currentView === "calls" ? (
              <div className="calls-layout">
                <CallsPanel
                  callHistory={visibleCallHistory}
                  onSelectChat={(roomId) => {
                    setCurrentView("chats");
                    setActiveRoomId(roomId);
                  }}
                />
              </div>
            ) : currentView === "communities" ? (
              <div className="calls-layout">
                <CommunitiesPanel
                  rooms={sortedRooms}
                  incomingRequests={connectionRequests.incoming}
                  outgoingRequests={connectionRequests.outgoing}
                  onSelectChat={(roomId) => {
                    setCurrentView("chats");
                    setActiveRoomId(roomId);
                  }}
                />
              </div>
            ) : currentView === "starred" ? (
              <div className="calls-layout">
                <StarredPanel
                  rooms={starredRooms}
                  onSelectChat={(roomId) => {
                    setCurrentView("chats");
                    setActiveRoomId(roomId);
                  }}
                  onToggleStar={handleToggleStarRoom}
                />
              </div>
            ) : (
              <>
                <InboxPanel
                  rooms={sortedRooms}
                  activeRoomId={activeRoomId}
                  onSelectRoom={setActiveRoomId}
                  unreadCounts={unreadCounts}
                  searchQuery={searchQuery}
                  discoverQuery={discoverQuery}
                  onDiscoverQueryChange={setDiscoverQuery}
                  discoverResults={discoverResults}
                  discoverBusy={discoverBusy}
                  discoverError={discoverError}
                  connectedHandles={connectedHandles}
                  incomingRequests={connectionRequests.incoming}
                  outgoingRequests={connectionRequests.outgoing}
                  onConnectAction={handleConnectAction}
                  busyConnectHandle={busyConnectHandle}
                  onAcceptRequest={handleAcceptConnectionRequest}
                  acceptingRequestId={acceptingRequestId}
                />

                <section className="conversation-panel">
                  <div className="conversation-panel-header">
                    <button
                      className={`conversation-identity ${isDetailsOpen ? "active" : ""}`}
                      onClick={() => setIsDetailsOpen((current) => !current)}
                      type="button"
                    >
                      <div className="conversation-avatar">
                        {activeRoom?.participant?.avatarUrl ? (
                          <img src={activeRoom.participant.avatarUrl} alt={activeRoom?.name ?? "Contact"} />
                        ) : (
                          getInitials(activeRoom?.participant?.name ?? activeRoom?.name, "DM")
                        )}
                      </div>
                      <div>
                        <p className="panel-kicker">Direct message</p>
                        <h3>{activeRoom?.name ?? "Search a user to begin"}</h3>
                        <small className="presence-text">
                          {activeRoom?.participant ? (
                            <>
                              <span className={`presence-dot ${activeRoomStatus}`} />
                              {activeRoomStatus === "online" ? "Online" : "Offline"}
                              {activeRoom.participant.handle ? ` · @${activeRoom.participant.handle}` : ""}
                            </>
                          ) : (
                            "Find someone by user ID and start the conversation"
                          )}
                        </small>
                      </div>
                    </button>
                    <div className="conversation-header-actions">
                      <button
                        className={`top-icon-button ${
                          activeCall && activeRoom && activeCall.roomId === activeRoom.id && activeCall.mode === "voice"
                            ? "top-icon-button-active"
                            : ""
                        }`}
                        onClick={() => handleStartCall("voice")}
                        type="button"
                        disabled={!activeRoom || !supportsCalls}
                      >
                        Call
                      </button>
                      <button
                        className={`top-icon-button ${
                          activeCall && activeRoom && activeCall.roomId === activeRoom.id && activeCall.mode === "video"
                            ? "top-icon-button-active"
                            : ""
                        }`}
                        onClick={() => handleStartCall("video")}
                        type="button"
                        disabled={!activeRoom || !supportsCalls}
                      >
                        Video call
                      </button>
                    </div>
                  </div>

                  {chatMode === "media" ? (
                    <MediaPanel activeRoom={activeRoom} messages={messages} />
                  ) : (
                    <>
                      <MessageList
                        messages={filteredMessages}
                        username={user?.name ?? ""}
                        activeRoom={activeRoom}
                        currentUser={user}
                        typingUsers={typingUsers}
                        messagesEndRef={messagesEndRef}
                        onReact={handleReact}
                        searchQuery={searchQuery}
                      />

                      <Composer
                        messageInput={messageInput}
                        onMessageInputChange={handleMessageInputChange}
                        selectedFile={selectedFile}
                        onFileChange={setSelectedFile}
                        onSubmit={handleSendMessage}
                        sending={sending}
                        uploadsEnabled={supportsUploads}
                      />
                    </>
                  )}
                </section>

                <DetailsPanel
                  members={members}
                  activeRoom={activeRoom}
                  messages={messages}
                  isOpen={isDetailsOpen}
                />
              </>
            )}
          </div>
        </main>
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        user={user}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveProfile}
        saving={settingsSaving}
        onLogout={handleLogout}
        uploadsEnabled={supportsAvatarUploads}
      />

      {supportsCalls ? (
        <CallOverlay
          call={activeCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEnd={handleEndCall}
          localStream={localCallStream}
          remoteStream={remoteCallStream}
          isAccepting={isAcceptingCall}
        />
      ) : null}
    </div>
  );
}
