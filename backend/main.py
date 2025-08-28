from fastapi import FastAPI
from players.routes import router as players_router
from teams.routes import router as teams_router
from auth.routes import router as auth_router  # if you keep auth
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="Cricket Team Management API")

app.include_router(auth_router)
app.include_router(players_router)
app.include_router(teams_router)

@app.get("/")
def root():
    return {"Welcome to CMS backend"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers=["*"]
)