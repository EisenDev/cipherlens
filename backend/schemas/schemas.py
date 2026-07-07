from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth Schemas
class UserSignup(BaseModel):
    fullName: str
    email: EmailStr
    password: str
    companyName: Optional[str] = None
    teamSize: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    fullName: str
    email: str
    companyName: Optional[str] = None
    teamSize: Optional[str] = None
    role: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    accessToken: str
    refreshToken: str
    user: UserResponse

class RefreshTokenInput(BaseModel):
    refreshToken: str

# Target/Asset Schemas
class TargetSchema(BaseModel):
    name: str
    url: str
    type: str # WEBSITE, REPOSITORY

class AssetCreate(BaseModel):
    name: str
    url: str
    type: str

class AssetResponse(BaseModel):
    id: str
    name: str
    url: str
    type: str
    createdAt: datetime

    class Config:
        from_attributes = True

# Scan Schemas
class ScanCreate(BaseModel):
    targetUrl: str
    targetType: str # WEBSITE, REPOSITORY
    scanType: str = "QUICK"
    scanName: Optional[str] = None
    scanTags: Optional[str] = None
    modules: Optional[List[str]] = None
    # Advanced Options (all optional for creation mapping)
    crawling: Optional[Dict[str, Any]] = None
    auth: Optional[Dict[str, Any]] = None
    proxy: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None
    exclusions: Optional[Dict[str, Any]] = None
    headers: Optional[List[Dict[str, Any]]] = None

class ScanPatch(BaseModel):
    status: Optional[str] = None
    score: Optional[int] = None
    duration: Optional[int] = None

class ScanResponse(BaseModel):
    id: str
    status: str
    scanType: str
    score: Optional[int] = None
    duration: Optional[int] = None
    createdAt: datetime
    target: TargetSchema

    class Config:
        from_attributes = True

class PaginatedScans(BaseModel):
    data: List[ScanResponse]
    total: int
    page: int
    limit: int
    last_page: int

# Statistics Schemas
class StatisticsSummary(BaseModel):
    total: int
    completed: int
    running: int
    queued: int
    failed: int

# Scan Jobs & Modules
class ScanJobResponse(BaseModel):
    id: str
    scanId: str
    status: str
    createdAt: datetime

    class Config:
        from_attributes = True

class ScanModuleResponse(BaseModel):
    id: str
    scanId: str
    name: str
    config: str
    createdAt: datetime

    class Config:
        from_attributes = True

# Progress & Logs Schemas
class ModuleProgressSchema(BaseModel):
    name: str
    status: str # WAITING, RUNNING, COMPLETED, FAILED
    progress: int

class ScanProgressResponse(BaseModel):
    scanId: str
    status: str
    targetUrl: str
    startedAt: Optional[datetime] = None
    elapsedTime: Optional[int] = None
    currentlyExecuting: Optional[str] = None
    modules: List[ModuleProgressSchema]

class ScanLogItemSchema(BaseModel):
    timestamp: datetime
    level: str # INFO, WARNING, ERROR
    message: str

class ScanLogsResponse(BaseModel):
    scanId: str
    logs: List[ScanLogItemSchema]

# Scan Results Schemas
class ScanResultItemSchema(BaseModel):
    id: str
    scanId: str
    findingCode: str
    title: str
    severity: str
    description: str
    evidence: str
    filePath: Optional[str] = None
    lineNumber: Optional[int] = None
    remediation: str
    module: Optional[str] = None
    tool: Optional[str] = None
    category: Optional[str] = None
    references: Optional[str] = None
    rawData: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True

class ScanResultsResponseSchema(BaseModel):
    scanId: str
    results: List[ScanResultItemSchema]
