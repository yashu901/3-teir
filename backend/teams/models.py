# teams/models.py
from pydantic import BaseModel, Field
from typing import List, Optional
from players.models import PlayerOut

class TeamCreateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    team_size: int = Field(11, ge=5, le=11)
    batsmen: int = 5
    bowlers: int = 4
    keepers: int = 1
    allrounders: int = 1

    def normalized(self):
        return self.batsmen + self.bowlers + self.keepers + self.allrounders

class TeamStats(BaseModel):
    avgBatting: float
    avgBowling: float
    avgFielding: float

class TeamOut(BaseModel):
    id: str
    name: str
    size: int
    stats: TeamStats
    players: List[str]   # only player names (for list endpoints)

class TeamDetailOut(BaseModel):
    id: str
    name: str
    size: int
    stats: TeamStats
    players: List[PlayerOut]  # full player objects (for detail endpoint)
