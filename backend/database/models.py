import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .session import Base

def generate_uuid():
    return str(uuid.uuid4())

def generate_share_token():
    return uuid.uuid4().hex[:12]

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    fullName = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    passwordHash = Column(String, nullable=False)
    companyName = Column(String, nullable=True)
    teamSize = Column(String, nullable=True)
    role = Column(String, nullable=True)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    tokenHash = Column(String, unique=True, nullable=False)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expiresAt = Column(DateTime(timezone=True), nullable=False)
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="refresh_tokens")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    type = Column(String, nullable=False) # WEBSITE, REPOSITORY
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="assets")
    scans = relationship("Scan", back_populates="asset", cascade="all, delete-orphan")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=generate_uuid)
    status = Column(String, default="QUEUED", nullable=False) # DRAFT, QUEUED, PREPARING, RUNNING, COMPLETED, FAILED, CANCELLED
    scanType = Column(String, default="QUICK", nullable=False) # QUICK, SSL, OWASP, DEEP, REPOSITORY, API_SECURITY
    score = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)
    scanName = Column(String, nullable=True)
    scanTags = Column(String, nullable=True)
    assetId = Column(String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    isPublic = Column(Boolean, default=False, nullable=False)
    shareToken = Column(String, unique=True, default=generate_share_token, nullable=True)
    
    # Metadata for execution tracking
    startedAt = Column(DateTime(timezone=True), nullable=True)
    completedAt = Column(DateTime(timezone=True), nullable=True)
    jobId = Column(String, nullable=True)
    currentModule = Column(String, nullable=True)
    progress = Column(Integer, default=0, nullable=False)

    # Post-processing posture metrics
    coverage = Column(Integer, nullable=True)
    confidence = Column(Integer, nullable=True)
    security_posture = Column(String, nullable=True)
    recommendation = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    generated_at = Column(DateTime(timezone=True), nullable=True)
    processing_version = Column(String, nullable=True)
    
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)

    asset = relationship("Asset", back_populates="scans")
    jobs = relationship("ScanJob", back_populates="scan", cascade="all, delete-orphan")
    modules = relationship("ScanModule", back_populates="scan", cascade="all, delete-orphan")
    results = relationship("ScanResult", back_populates="scan", cascade="all, delete-orphan")
    logs = relationship("ScanLog", back_populates="scan", cascade="all, delete-orphan")

class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    scanId = Column(String, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="PENDING", nullable=False) # PENDING, PROCESSING, COMPLETED, FAILED
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)

    scan = relationship("Scan", back_populates="jobs")

class ScanModule(Base):
    __tablename__ = "scan_modules"

    id = Column(String, primary_key=True, default=generate_uuid)
    scanId = Column(String, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False) # crawling, auth, proxy, performance, exclusions, headers
    config = Column(Text, nullable=False) # JSON encoded configuration string
    
    # Execution states for module
    status = Column(String, default="WAITING", nullable=False) # WAITING, QUEUED, RUNNING, COMPLETED, FAILED, SKIPPED, CANCELLED
    duration = Column(Integer, nullable=True)
    errors = Column(Text, nullable=True)
    logs = Column(Text, nullable=True)
    
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)

    scan = relationship("Scan", back_populates="modules")

class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    scanId = Column(String, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    findingCode = Column(String, nullable=False)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False) # CRITICAL, HIGH, MEDIUM, LOW, INFO
    description = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    filePath = Column(String, nullable=True)
    lineNumber = Column(Integer, nullable=True)
    remediation = Column(Text, nullable=False)
    
    # Advanced metadata fields for normalization mapping
    module = Column(String, nullable=True)
    tool = Column(String, nullable=True)
    category = Column(String, nullable=True)
    references = Column(Text, nullable=True) # JSON list of strings
    rawData = Column(Text, nullable=True) # JSON raw response dictionary

    # Centralized vulnerability management operational fields
    status = Column(String, default="Open", nullable=False) # Open, Investigating, In Progress, Accepted Risk, Mitigated, Fixed, False Positive, Reopened, Closed
    assignedTo = Column(String, nullable=True) # User email or name
    cvss = Column(Text, nullable=True) # For float, we can use Text/String or Float, let's use String/Text or Float. Wait, let's use String or Float. Let's use Column(Text, nullable=True) to allow CVSS vector or score.
    cve = Column(String, nullable=True)
    cwe = Column(String, nullable=True)
    mitreAttack = Column(String, nullable=True)
    owaspMapping = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True) # comma-separated list of tags
    isArchived = Column(Boolean, default=False, nullable=False)
    isDeleted = Column(Boolean, default=False, nullable=False)
    resolvedAt = Column(DateTime(timezone=True), nullable=True)
    
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    ticketId = Column(String, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)

    scan = relationship("Scan", back_populates="results")
    ticket = relationship("Ticket", back_populates="results")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String, default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    severity = Column(String, default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    assignee = Column(String, nullable=True)
    dueDate = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="Open", nullable=False) # Open, In Progress, Resolved
    tags = Column(String, nullable=True) # comma-separated strings
    scanId = Column(String, ForeignKey("scans.id", ondelete="SET NULL"), nullable=True)
    assetId = Column(String, ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    evidence = Column(Text, nullable=True)
    scanner = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)

    results = relationship("ScanResult", back_populates="ticket")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False) # export, bulk_status_change, bulk_assignment, tag_change, archive, delete, ticket_creation
    timestamp = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    findingIds = Column(Text, nullable=True) # JSON list or comma-separated string of affected finding IDs/keys
    actionMetadata = Column(Text, nullable=True) # JSON dictionary string
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)

class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    scanId = Column(String, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    logLevel = Column(String, default="INFO", nullable=False) # INFO, WARNING, ERROR
    message = Column(Text, nullable=False)
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)

    scan = relationship("Scan", back_populates="logs")

class ScanSchedule(Base):
    __tablename__ = "scan_schedules"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    targetType = Column(String, nullable=False) # WEBSITE, REPOSITORY
    targetUrl = Column(String, nullable=False)
    scanType = Column(String, default="QUICK", nullable=False) # QUICK, STANDARD, ADVANCED, CUSTOM
    selectedModules = Column(Text, nullable=True) # JSON list of module IDs
    advancedConfig = Column(Text, nullable=True) # JSON options (crawling, auth, proxy, performance, exclusions, custom headers)
    
    # Scheduling metadata
    frequency = Column(String, nullable=False) # ONCE, DAILY, WEEKLY, MONTHLY, CRON
    cronExpression = Column(String, nullable=True)
    startDate = Column(String, nullable=False)
    startTime = Column(String, nullable=False)
    timezone = Column(String, default="UTC", nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)
    lastRunAt = Column(DateTime, nullable=True)
    
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)
