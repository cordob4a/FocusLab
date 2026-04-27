# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://fichada_user:fichada_pass@db:5432/fichada_db",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()