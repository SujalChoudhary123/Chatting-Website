import { ConnectionRequest } from "../models/ConnectionRequest.js";
import { serializeUser } from "../utils/auth.js";

function serializePeer(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl ?? null,
    profile: serializeUser(user).profile,
  };
}

function serializeRequest(request, user, direction) {
  return {
    id: request._id.toString(),
    direction,
    status: request.status,
    roomSlug: request.roomSlug ?? null,
    createdAt: request.createdAt,
    user: serializePeer(user),
  };
}

export async function getSerializedConnectionRequests(currentUserId) {
  const [incomingRequests, outgoingRequests] = await Promise.all([
    ConnectionRequest.find({
      toUser: currentUserId,
      status: "pending",
    })
      .populate("fromUser")
      .sort({ createdAt: -1 }),
    ConnectionRequest.find({
      fromUser: currentUserId,
      status: "pending",
    })
      .populate("toUser")
      .sort({ createdAt: -1 }),
  ]);

  return {
    incoming: incomingRequests.map((request) =>
      serializeRequest(request, request.fromUser, "incoming")
    ),
    outgoing: outgoingRequests.map((request) =>
      serializeRequest(request, request.toUser, "outgoing")
    ),
  };
}
