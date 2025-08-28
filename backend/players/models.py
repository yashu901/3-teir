from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Annotated
from bson import ObjectId
from pydantic.functional_validators import BeforeValidator


# Pydantic v2 compatible ObjectId -> str converter
PyObjectId = Annotated[str, BeforeValidator(str)]


class PlayerIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    age: int = Field(..., ge=10, le=60)
    batting: float = Field(..., ge=0, le=100)
    bowling: float = Field(..., ge=0, le=100)
    fielding: float = Field(..., ge=0, le=100)
    wicketKeeping: float = Field(..., ge=0, le=100)

    # ensure name is stripped
    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be empty")
        return v


class PlayerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    age: Optional[int] = Field(None, ge=10, le=60)
    batting: Optional[float] = Field(None, ge=0, le=100)
    bowling: Optional[float] = Field(None, ge=0, le=100)
    fielding: Optional[float] = Field(None, ge=0, le=100)
    wicketKeeping: Optional[float] = Field(None, ge=0, le=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if isinstance(v, str) else v


class PlayerOut(BaseModel):
    id: PyObjectId = Field(alias="_id")   # maps MongoDB _id → id in API
    name: str
    age: int
    batting: float
    bowling: float
    fielding: float
    wicketKeeping: float

    model_config = ConfigDict(
        populate_by_name=True,   # allow _id → id conversion
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}   # ObjectId → str
    )
