from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

app = FastAPI()

# -------------------
# STATIC & TEMPLATES
# -------------------

templates = Jinja2Templates(directory="Templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

# -------------------
# DATA (temporal)
# -------------------

users = []

# -------------------
# VISTAS
# -------------------

@app.get("/")
def login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="login.html"
    )


@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="register.html"
    )

# -------------------
# LOGICA
# -------------------

@app.post("/register")
def register(nombre: str = Form(...), email: str = Form(...), password: str = Form(...)):

    # validar duplicado
    for u in users:
        if u["email"] == email:
            return {"error": "El usuario ya existe"}

    users.append({
        "nombre": nombre,
        "email": email,
        "password": password
    })

    return RedirectResponse(url="/", status_code=303)


@app.post("/login")
def login(email: str = Form(...), password: str = Form(...)):

    for u in users:
        if u["email"] == email and u["password"] == password:
            return {"msg": "login correcto"}

    return {"error": "credenciales incorrectas"}