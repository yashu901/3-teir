from fastapi import APIRouter, HTTPException, Query, status
from typing import List
from .models import TeamCreateRequest, TeamDetailOut, TeamOut
from . import services as svc

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.post("/generate", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def generate_team(req: TeamCreateRequest):
    # validate composition sum == team_size (explicit requirement coverage)
    if req.normalized() != req.team_size:
        raise HTTPException(
            status_code=400,
            detail=f"Composition (batsmen+bowlers+keepers+allrounders) must equal team_size ({req.team_size})",
        )
    try:
        team = await svc.generate_team(req)
        return team
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[TeamOut])
async def get_teams():
    return await svc.list_teams()

@router.get("/{team_id}", response_model=TeamDetailOut)
async def get_team(team_id: str):
    team = await svc.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team(team_id: str):
    ok = await svc.delete_team(team_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Team not found")
    return None
