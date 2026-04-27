from fastapi import APIRouter, Form

router = APIRouter()

@router.post("/login")
def login(email: str = Form(...), password: str = Form(...)):
    return {"msg": "login"}

@router.post("/register")
def register(nombre: str = Form(...), email: str = Form(...), password: str = Form(...)):
    return {"msg": "register"}