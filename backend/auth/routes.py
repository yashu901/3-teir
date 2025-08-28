from fastapi import HTTPException, Depends, APIRouter
from auth.models import UserLogin, UserSignup
from database import db
from auth.utils import create_access_token, verify_password, hashpassword

router = APIRouter()

@router.post('/signup')
async def signup(user:UserSignup):
    exists = await db.users.find_one({"email":user.email})
    if exists:
        raise HTTPException(status_code=400, detail="User Email already exists")
    hash_pass = hashpassword(user.password)
    user_dict = user.dict()
    user_dict["password"]=hash_pass
    await db.users.insert_one(user_dict)
    token = create_access_token({"sub":user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.post('/login')
async def login(user:UserLogin):
    found = await db.users.find_one({"email":user.email})
    if not found or not verify_password(user.password, found["password"]) :
        raise HTTPException(status_code=401, detail="Invalid User's Email or Password")
    token = create_access_token({"sub":user.email})
    return {"access_token":token, "token_type":"bearer"}