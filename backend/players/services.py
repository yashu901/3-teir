from typing import List, Optional, Dict, Any
from bson import ObjectId
from database import db
from .models import PlayerIn, PlayerOut, PlayerUpdate

COLL = db.players

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

async def create_player(data: PlayerIn) -> PlayerOut:
    payload = data.model_dump()
    res = await COLL.insert_one(payload)
    created = await COLL.find_one({"_id": res.inserted_id})
    return _to_player_out(created)

async def list_players(limit: int = 200, skip: int = 0) -> List[PlayerOut]:
    cursor = COLL.find().skip(skip).limit(limit)
    return [_to_player_out(d) async for d in cursor]

async def get_player(player_id: str) -> Optional[PlayerOut]:
    doc = await COLL.find_one({"_id": ObjectId(player_id)})
    return _to_player_out(doc) if doc else None

async def update_player(player_id: str, updates: PlayerUpdate, *, replace: bool = False) -> Optional[PlayerOut]:
    if replace:
        # full replace (PUT): verify all required fields present via PlayerIn
        new_doc = PlayerIn(**updates.model_dump(exclude_unset=False)).model_dump()
        await COLL.replace_one({"_id": ObjectId(player_id)}, new_doc)
    else:
        patch = {k: v for k, v in updates.model_dump(exclude_unset=True).items()}
        if not patch:
            return await get_player(player_id)  # nothing to update
        await COLL.update_one({"_id": ObjectId(player_id)}, {"$set": patch})
    doc = await COLL.find_one({"_id": ObjectId(player_id)})
    return _to_player_out(doc) if doc else None

async def delete_player(player_id: str) -> bool:
    res = await COLL.delete_one({"_id": ObjectId(player_id)})
    return res.deleted_count == 1
