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
    description: Optional[str] = None
    tags: Optional[str] = None

class AssetResponse(BaseModel):
    id: str
    name: str
    url: str
    type: str
    createdAt: datetime
    security_posture: Optional[str] = None
    latest_scan_status: Optional[str] = None
    latest_scan_date: Optional[datetime] = None
    critical_findings: int = 0
    total_findings: int = 0
    confidence: Optional[int] = None
    coverage: Optional[int] = None
    owner: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = None

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
    isPublic: Optional[bool] = None

class ScanResponse(BaseModel):
    id: str
    status: str
    scanType: str
    score: Optional[int] = None
    duration: Optional[int] = None
    createdAt: datetime
    target: TargetSchema
    scanName: Optional[str] = None
    coverage: Optional[int] = None
    confidence: Optional[int] = None
    security_posture: Optional[str] = None
    recommendation: Optional[str] = None
    summary: Optional[str] = None
    isPublic: Optional[bool] = False
    shareToken: Optional[str] = None

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

class AssetScanHistoryItem(BaseModel):
    id: str
    createdAt: datetime
    duration: Optional[int] = None
    modules: List[str]
    findingsCount: int
    status: str
    score: Optional[int] = None

class AssetDetailResponse(BaseModel):
    id: str
    name: str
    url: str
    type: str
    createdAt: datetime
    security_posture: Optional[str] = None
    latest_scan_status: Optional[str] = None
    latest_scan_date: Optional[datetime] = None
    confidence: Optional[int] = None
    coverage: Optional[int] = None
    owner: Optional[str] = None
    tags: List[str] = []
    
    # Metadata
    environment: str
    business_criticality: str
    description: Optional[str] = None

    # Aggregated elements
    findings_summary: Dict[str, int]
    open_findings: int
    resolved_findings: int
    new_findings: int
    
    # Discovery items
    open_ports: List[int]
    tech_fingerprint: List[str]
    dns_info: Dict[str, Any]
    certificate: Dict[str, Any]
    security_headers: Dict[str, str]
    
    # History
    scan_history: List[AssetScanHistoryItem]

# Scan Schedules Schemas
class ScanScheduleCreate(BaseModel):
    name: str
    targetUrl: str
    targetType: str # WEBSITE, REPOSITORY
    scanType: str = "QUICK"
    modules: Optional[List[str]] = None
    crawling: Optional[Dict[str, Any]] = None
    auth: Optional[Dict[str, Any]] = None
    proxy: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None
    exclusions: Optional[Dict[str, Any]] = None
    headers: Optional[List[Dict[str, Any]]] = None
    
    # Scheduling fields
    frequency: str # ONCE, DAILY, WEEKLY, MONTHLY, CRON
    cronExpression: Optional[str] = None
    startDate: str
    startTime: str
    timezone: str = "UTC"
    isActive: bool = True

class ScanSchedulePatch(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    cronExpression: Optional[str] = None
    startDate: Optional[str] = None
    startTime: Optional[str] = None
    timezone: Optional[str] = None
    isActive: Optional[bool] = None

class ScanScheduleResponse(BaseModel):
    id: str
    name: str
    targetUrl: str
    targetType: str
    scanType: str
    selectedModules: Optional[str] = None
    advancedConfig: Optional[str] = None
    frequency: str
    cronExpression: Optional[str] = None
    startDate: str
    startTime: str
    timezone: str
    isActive: bool
    lastRunAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class TeamMemberInvite(BaseModel):
    fullName: str
    email: str
    role: str

class TeamMemberPatch(BaseModel):
    role: Optional[str] = None
    isActive: Optional[bool] = None

class TeamMemberResponse(BaseModel):
    id: str
    fullName: str
    email: str
    role: Optional[str] = None
    isActive: bool
    createdAt: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    fullName: Optional[str] = None
    companyName: Optional[str] = None
    role: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str
