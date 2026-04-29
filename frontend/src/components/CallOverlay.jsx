import { useEffect, useRef, useState } from "react";
import { getInitials } from "../utils/initials";

export function CallOverlay({
  call,
  onAccept,
  onDecline,
  onEnd,
  localStream,
  remoteStream,
  isAccepting = false,
}) {
  const localVideoRef = useRef(null);
  const remoteMediaRef = useRef(null);
  const callStageRef = useRef(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mode = call?.mode;
  const participant = call?.participant;
  const phase = call?.phase;
  const callLabel = mode === "video" ? "Video call" : "Voice call";

  const participantName = participant?.name ?? "Connected user";
  const participantHandle = participant?.handle ? `@${participant.handle}` : "Connected user";
  const statusLabelByPhase = {
    outgoing: `Calling ${participantName}...`,
    incoming: `${participantName} is calling you.`,
    active: mode === "video" ? "Video call connected." : "Voice call connected.",
  };

  useEffect(() => {
    if (call && mode === "video" && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream ?? null;
    }
  }, [call, localStream, mode]);

  useEffect(() => {
    if (call && remoteMediaRef.current) {
      remoteMediaRef.current.srcObject = remoteStream ?? null;
    }
  }, [call, remoteStream]);

  useEffect(() => {
    if (!localStream) {
      setIsMicMuted(false);
      setIsVideoHidden(false);
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    setIsMicMuted(audioTrack ? !audioTrack.enabled : false);
    setIsVideoHidden(videoTrack ? !videoTrack.enabled : false);
  }, [localStream]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === callStageRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  if (!call || !participant) {
    return null;
  }

  const toggleMic = () => {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (!audioTrack) {
      return;
    }

    audioTrack.enabled = !audioTrack.enabled;
    setIsMicMuted(!audioTrack.enabled);
  };

  const toggleVideo = () => {
    const videoTrack = localStream?.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }

    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoHidden(!videoTrack.enabled);
  };

  const toggleFullscreen = async () => {
    if (!callStageRef.current) {
      return;
    }

    if (document.fullscreenElement === callStageRef.current) {
      await document.exitFullscreen();
      return;
    }

    await callStageRef.current.requestFullscreen();
  };

  return (
    <div className="call-overlay" role="presentation">
      <section
        ref={callStageRef}
        className={`call-card ${mode === "video" ? "call-card-video" : ""} ${
          isFullscreen ? "call-card-fullscreen" : ""
        }`}
        aria-label={`${callLabel} with ${participant.name}`}
      >
        {phase === "active" && mode === "video" ? (
          <div className="call-stage">
            <video ref={remoteMediaRef} className="call-remote-video" autoPlay playsInline />
            {!remoteStream ? (
              <div className="call-remote-fallback">
                <div className="call-avatar">
                  {participant.avatarUrl ? (
                    <img src={participant.avatarUrl} alt={participant.name} />
                  ) : (
                    getInitials(participant.name, "DM")
                  )}
                </div>
                <h2>{participant.name}</h2>
                <p className="call-subtitle">{participantHandle}</p>
              </div>
            ) : null}

            <div className="call-topbar">
              <div className="call-topbar-copy">
                <p className="page-eyebrow">{callLabel}</p>
                <h2>{participant.name}</h2>
                <p className="call-status">{statusLabelByPhase[phase] ?? "Preparing call..."}</p>
              </div>
              <button className="call-control-button" onClick={toggleFullscreen} type="button">
                {isFullscreen ? "Exit full screen" : "Full screen"}
              </button>
            </div>

            <div className="call-local-preview-shell">
              {isVideoHidden ? (
                <div className="call-local-video call-local-video-muted">
                  <span>Camera off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  className="call-local-video"
                  autoPlay
                  muted
                  playsInline
                />
              )}
            </div>
          </div>
        ) : (
          <div className="call-identity">
            <p className="page-eyebrow">{callLabel}</p>
            <div className="call-avatar">
              {participant.avatarUrl ? (
                <img src={participant.avatarUrl} alt={participant.name} />
              ) : (
                getInitials(participant.name, "DM")
              )}
            </div>
            <h2>{participant.name}</h2>
            <p className="call-subtitle">{participantHandle}</p>
            <p className="call-status">{statusLabelByPhase[phase] ?? "Preparing call..."}</p>
          </div>
        )}

        {phase === "active" && mode === "voice" ? <audio ref={remoteMediaRef} autoPlay /> : null}

        <div className={`call-actions ${phase === "active" ? "call-actions-live" : ""}`}>
          {phase === "incoming" ? (
            <>
              <button className="call-control-button" onClick={onDecline} type="button">
                Decline
              </button>
              <button
                className="call-accept-button"
                onClick={onAccept}
                type="button"
                disabled={isAccepting}
              >
                {isAccepting ? "Connecting..." : "Accept"}
              </button>
            </>
          ) : null}

          {phase === "outgoing" ? (
            <button className="call-end-button" onClick={onDecline} type="button">
              Cancel call
            </button>
          ) : null}

          {phase === "active" ? (
            <>
              <button className="call-control-button" onClick={toggleMic} type="button">
                {isMicMuted ? "Unmute mic" : "Mute mic"}
              </button>
              {mode === "video" ? (
                <>
                  <button className="call-control-button" onClick={toggleVideo} type="button">
                    {isVideoHidden ? "Show video" : "Hide video"}
                  </button>
                  <button
                    className="call-control-button"
                    onClick={toggleFullscreen}
                    type="button"
                  >
                    {isFullscreen ? "Exit full screen" : "Full screen"}
                  </button>
                </>
              ) : null}
              <button className="call-end-button" onClick={onEnd} type="button">
                End call
              </button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
