from passlib.context import CryptContext
from datetime import datetime, timedelta
from config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, JWT_SECRET
import jwt

pwd_context = CryptContext(schemes=["bcrypt"],deprecated="auto")

def hashpassword(password:str):
    return pwd_context.hash(password)

def verify_password(password, hashed):
    return pwd_context.verify(password,hashed)

def create_access_token(data:dict, expires_delta:int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({"exp":expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm = JWT_ALGORITHM)

def decode_token(token:str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        return None