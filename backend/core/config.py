import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CipherLens API"
    API_V1_STR: str = "/api"
    
    # Port & Environment
    PORT: int = 3005
    NODE_ENV: str = "development"
    
    # AI Orchestration
    GEMINI_API_KEY: str = ""
    
    # Database Settings
    DATABASE_URL: str = "postgresql://cipherlens_user:cipherlens_secure_password_123@localhost:5434/cipherlens"
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6380/0"
    
    # JWT Settings
    JWT_SECRET: str = "super_secret_jwt_sign_key_change_me_in_production"
    JWT_ACCESS_SECRET: str = "super_access_secret_token_verification_key_123"
    JWT_REFRESH_SECRET: str = "super_refresh_secret_token_verification_key_456"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
