# models/models.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base  


class Usuarios(Base):
    __tablename__ = "Usuarios"
    id_usuario = Column(Integer, primary_key=True, nullable= True,autoincrement=True)
    mail = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    #rol = Column(String, nullable = False, default = "admin")
