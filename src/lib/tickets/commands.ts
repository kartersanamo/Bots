export interface TicketBotCommandDef {
  name:
    | "close"
    | "rename"
    | "add"
    | "remove"
    | "move"
    | "private"
    | "management";
  description: string;
  usage: string;
}

export const TICKET_BOT_COMMANDS: TicketBotCommandDef[] = [
  {
    name: "close",
    description: "Closes the ticket channel",
    usage: "/close <reason>",
  },
  {
    name: "rename",
    description: "Renames the ticket channel",
    usage: "/rename <new-channel-name>",
  },
  {
    name: "add",
    description: "Adds a user to the ticket",
    usage: "/add <user-id-or-mention>",
  },
  {
    name: "remove",
    description: "Removes a user from the ticket",
    usage: "/remove <user-id-or-mention>",
  },
  {
    name: "move",
    description: "Moves a ticket to a new category",
    usage: "/move <category-id-or-name>",
  },
  {
    name: "private",
    description: "Privates the ticket channel for admins",
    usage: "/private",
  },
  {
    name: "management",
    description: "Privates the ticket channel for management",
    usage: "/management",
  },
];

export function parseTicketCommand(input: string): {
  name: string;
  args: string;
} {
  const trimmed = input.trim().replace(/^\/+/, "");
  const [name = "", ...rest] = trimmed.split(" ");
  return { name: name.toLowerCase(), args: rest.join(" ").trim() };
}

