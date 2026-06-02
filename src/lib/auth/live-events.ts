export interface AuthRejectedLiveEvent {
  id: number;
  createdAt: number;
  kind: "auth_rejected";
  userId: string;
  username: string;
  globalName: string | null;
}

const MAX_EVENTS = 200;
const EVENT_TTL_MS = 1000 * 60 * 60;

let nextId = 1;
const events: AuthRejectedLiveEvent[] = [];

function prune(now = Date.now()) {
  const cutoff = now - EVENT_TTL_MS;
  while (events.length && events[0].createdAt < cutoff) {
    events.shift();
  }
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

export function publishAuthRejectedEvent(input: {
  userId: string;
  username: string;
  globalName: string | null;
}): AuthRejectedLiveEvent {
  const event: AuthRejectedLiveEvent = {
    id: nextId++,
    createdAt: Date.now(),
    kind: "auth_rejected",
    userId: String(input.userId),
    username: String(input.username),
    globalName: input.globalName ? String(input.globalName) : null,
  };
  events.push(event);
  prune(event.createdAt);
  return event;
}

export function listAuthRejectedLiveEvents(sinceId = 0): AuthRejectedLiveEvent[] {
  prune();
  return events.filter((e) => e.id > sinceId);
}
