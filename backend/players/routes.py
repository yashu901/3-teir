from fastapi import APIRouter, HTTPException, Query, status
from typing import List
from .models import PlayerIn, PlayerOut, PlayerUpdate
from . import services as svc

router = APIRouter(prefix="/players", tags=["Players"])

@router.post("/", response_model=PlayerOut, status_code=status.HTTP_201_CREATED)
async def create_player(player: PlayerIn):
    created = await svc.create_player(player)
    return created

@router.get("/", response_model=List[PlayerOut])
async def get_players(limit: int = Query(200, ge=1, le=1000), skip: int = Query(0, ge=0)):
    return await svc.list_players(limit=limit, skip=skip)

@router.get("/{player_id}", response_model=PlayerOut)
async def get_player(player_id: str):
    player = await svc.get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

# @router.put("/{player_id}", response_model=PlayerOut)
# async def put_player(player_id: str, data: PlayerIn):
#     updated = await svc.update_player(player_id, PlayerUpdate(**data.model_dump()), replace=True)
#     if not updated:
#         raise HTTPException(status_code=404, detail="Player not found")
#     return updated

@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_player(player_id: str):
    ok = await svc.delete_player(player_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Player not found")
    return None
