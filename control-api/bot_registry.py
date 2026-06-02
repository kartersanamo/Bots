"""Maps dashboard bot IDs to filesystem paths and process settings."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

BOTS_ROOT = Path(
    os.environ.get("MINECADIA_BOTS_ROOT", "/root/Discord Bots/Minecadia")
)


@dataclass(frozen=True)
class BotEntry:
    id: str
    folder_name: str
    entry_script: str  # main.py or bot.py
    log_dirs: tuple[str, ...]
    config_roots: tuple[str, ...]  # relative dirs for config search
    tmux_window: Optional[str] = None  # window name in TMUX_SESSION


BOT_ENTRIES: dict[str, BotEntry] = {
    "games": BotEntry(
        "games",
        "MinecadiaGames",
        "bot.py",
        ("logs",),
        ("assets/Configs",),
        "Games",
    ),
    "tickets": BotEntry(
        "tickets",
        "MinecadiaTickets",
        "main.py",
        ("Logs",),
        ("Assets",),
        "Tickets",
    ),
    "management": BotEntry(
        "management",
        "MinecadiaManagement",
        "main.py",
        ("Logs",),
        ("Assets",),
        "Management",
    ),
    "utilities": BotEntry(
        "utilities",
        "MinecadiaUtilities",
        "main.py",
        ("Logs",),
        ("Assets",),
        "Utilities",
    ),
    "staff": BotEntry(
        "staff",
        "MinecadiaStaff",
        "main.py",
        ("Logs",),
        ("Assets",),
        "Staff",
    ),
    "leader": BotEntry(
        "leader",
        "MinecadiaLeader",
        "main.py",
        ("Logs",),
        ("Assets", "Cogs"),
        "Leader",
    ),
}


def get_bot(bot_id: str) -> Optional[BotEntry]:
    return BOT_ENTRIES.get(bot_id)


def bot_root(bot_id: str) -> Path:
    entry = BOT_ENTRIES[bot_id]
    return BOTS_ROOT / entry.folder_name


def systemd_unit(bot_id: str) -> Optional[str]:
    key = f"BOT_{bot_id.upper()}_SYSTEMD_UNIT"
    return os.environ.get(key) or os.environ.get(f"SYSTEMD_UNIT_{bot_id.upper()}")


def bot_token_env_key(bot_id: str) -> str:
    return f"BOT_{bot_id.upper()}_TOKEN"
