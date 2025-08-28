from config import MONGO_URL,DB_NAME
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(MONGO_URL)
db=client[DB_NAME]