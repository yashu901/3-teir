from typing import List, Dict, Any, Optional
from bson import ObjectId
from database import db
from players.models import PlayerOut
from .models import TeamDetailOut, TeamOut, TeamStats, TeamCreateRequest

PLAYERS = db.players
TEAMS = db.teams


def _to_player_out(doc: Dict[str, Any]) -> PlayerOut:
    return PlayerOut(
        id=str(doc["_id"]),
        name=doc["name"],
        age=doc["age"],
        batting=doc["batting"],
        bowling=doc["bowling"],
        fielding=doc["fielding"],
        wicketKeeping=doc["wicketKeeping"],
    )


async def generate_team(req: TeamCreateRequest) -> TeamOut:
    TEAM_SIZE = 11
    all_players = [p async for p in PLAYERS.find({"assigned": {"$ne": True}})]

    if len(all_players) < TEAM_SIZE:
        raise ValueError("Not enough players left to form a team of 11")

    # classify
    bowlers = [p for p in all_players if p.get("bowling", 0) >= 60]
    keepers = [p for p in all_players if p.get("wicketKeeping", 0) >= 60]
    batsmen = [p for p in all_players if p.get("batting", 0) >= 70]
    allrounders = [
        p for p in all_players
        if p.get("batting", 0) >= 50 and p.get("bowling", 0) >= 50
    ]

    # sorting
    bowlers.sort(key=lambda x: x["bowling"], reverse=True)
    keepers.sort(key=lambda x: x["wicketKeeping"], reverse=True)
    batsmen.sort(key=lambda x: x["batting"], reverse=True)
    allrounders.sort(key=lambda x: (x["batting"] + x["bowling"]) / 2, reverse=True)

    chosen: List[Dict[str, Any]] = []

    # constraints
    if len(bowlers) < 4:
        raise ValueError("Not enough bowlers available (need at least 4)")
    chosen.extend(bowlers[:4])

    if not keepers:
        raise ValueError("No wicketkeeper available")
    chosen.append(keepers[0])

    # fill remaining slots
    remaining_slots = TEAM_SIZE - len(chosen)
    remaining = [p for p in all_players if p not in chosen]

    def overall_score(p):
        skills = [
            p.get("batting", 0),
            p.get("bowling", 0),
            p.get("fielding", 0),
            p.get("wicketKeeping", 0),
        ]
        return sum(skills) / len([s for s in skills if s > 0]) if any(skills) else 0

    remaining.sort(key=overall_score, reverse=True)
    chosen.extend(remaining[:remaining_slots])

    # stats
    stats = TeamStats(
        avgBatting=round(sum(p["batting"] for p in chosen) / TEAM_SIZE, 2),
        avgBowling=round(sum(p["bowling"] for p in chosen) / TEAM_SIZE, 2),
        avgFielding=round(sum(p["fielding"] for p in chosen) / TEAM_SIZE, 2),
    )

    # assign name
    team_count = await TEAMS.count_documents({})
    name = req.name or f"Team {team_count + 1}"

    doc = {
        "name": name,
        "size": TEAM_SIZE,
        "players": chosen,  # keep full docs internally
        "player_ids": [p["_id"] for p in chosen],
        "stats": stats.model_dump(),
    }
    res = await TEAMS.insert_one(doc)

    # mark players as assigned
    chosen_ids = [p["_id"] for p in chosen]
    await PLAYERS.update_many(
        {"_id": {"$in": chosen_ids}}, {"$set": {"assigned": True}}
    )

    saved = await TEAMS.find_one({"_id": res.inserted_id})
    player_names = [p["name"] for p in saved["players"]]

    return TeamOut(
        id=str(saved["_id"]),
        name=saved["name"],
        size=saved["size"],
        players=player_names, 
        stats=TeamStats(**saved["stats"]),
    )


# Example in FastAPI backend

async def _ensure_player_from_item(item: Any) -> Optional[PlayerOut]:
    """
    Accepts:
      - embedded player doc (dict with fields) -> convert to PlayerOut
      - dict with '_id' or '$oid' -> fetch from PLAYERS
      - str or ObjectId -> fetch from PLAYERS
    Returns PlayerOut or None if not found / invalid.
    """
    # already a dict with player fields (embedded)
    if isinstance(item, dict) and ("name" in item or "batting" in item or "_id" in item):
        return _to_player_out(item)

    # try to extract an id
    pid = None
    if isinstance(item, dict):
        pid = item.get("_id") or item.get("$oid")
    elif isinstance(item, ObjectId):
        pid = item
    elif isinstance(item, str):
        pid = item

    if pid is None:
        return None

    # normalize to ObjectId
    try:
        oid = pid if isinstance(pid, ObjectId) else ObjectId(str(pid))
    except Exception:
        return None

    player_doc = await PLAYERS.find_one({"_id": oid})
    if not player_doc:
        return None
    return _to_player_out(player_doc)


async def get_team(team_id: str) -> Optional[TeamDetailOut]:
    # fetch team
    try:
        team_doc = await TEAMS.find_one({"_id": ObjectId(team_id)})
    except Exception:
        # invalid id format
        return None

    if not team_doc:
        return None

    players_list: List[PlayerOut] = []
    for item in team_doc.get("players", []):
        player_out = await _ensure_player_from_item(item)
        if player_out:
            players_list.append(player_out)

    # safe stats fallback
    stats_doc = team_doc.get("stats", {"avgBatting": 0.0, "avgBowling": 0.0, "avgFielding": 0.0})
    stats = TeamStats(**stats_doc)

    return TeamDetailOut(
        id=str(team_doc["_id"]),
        name=team_doc.get("name", "Unnamed"),
        size=team_doc.get("size", len(players_list)),
        stats=stats,
        players=players_list,
    )

async def list_teams() -> List[TeamOut]:
    cursor = TEAMS.find()
    out: List[TeamOut] = []
    async for d in cursor:
        out.append(
            TeamOut(
                id=str(d["_id"]),
                name=d["name"],
                size=d["size"],
                players=[p["name"] for p in d["players"]],
                stats=TeamStats(**d["stats"]),
            )
        )
    return out

async def delete_team(team_id: str) -> bool:
    # when deleting team, unassign its players so they can be reused
    team = await TEAMS.find_one({"_id": ObjectId(team_id)})
    if not team:
        return False

    player_ids = team.get("player_ids", [])
    if player_ids:
        await PLAYERS.update_many(
            {"_id": {"$in": player_ids}}, {"$set": {"assigned": False}}
        )

    res = await TEAMS.delete_one({"_id": ObjectId(team_id)})
    return res.deleted_count == 1
