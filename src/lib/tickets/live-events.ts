export interface TicketLiveEvent {
  id: number;
  createdAt: number;
  kind: "ticket_created";
  channelId: string;
  ticketNumber: string;
  ticketType: string;
  ownerId: string;
  channelName?: string;
}

const MAX_EVENTS = 500;
const EVENT_TTL_MS = 1000 * 60 * 30;

let nextId = 1;
const events: TicketLiveEvent[] = [];

function prune(now = Date.now()) {
  const cutoff = now - EVENT_TTL_MS;
  while (events.length && events[0].createdAt < cutoff) {
    events.shift();
  }
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

export function publishTicketCreatedEvent(input: {
  channelId: string;
  ticketNumber: string;
  ticketType: string;
  ownerId: string;
  channelName?: string;
}): TicketLiveEvent {
  const event: TicketLiveEvent = {
    id: nextId++,
    createdAt: Date.now(),
    kind: "ticket_created",
    channelId: String(input.channelId),
    ticketNumber: String(input.ticketNumber),
    ticketType: String(input.ticketType),
    ownerId: String(input.ownerId),
    channelName: input.channelName ? String(input.channelName) : undefined,
  };
  events.push(event);
  prune(event.createdAt);
  return event;
}

export function listTicketLiveEvents(sinceId = 0): TicketLiveEvent[] {
  prune();
  return events.filter((e) => e.id > sinceId);
}
