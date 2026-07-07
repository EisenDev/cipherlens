import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .session import Base

def generate_uuid():
    return str(uuid.uuid4())

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
    
    # Metadata for execution tracking
    startedAt = Column(DateTime(timezone=True), nullable=True)
    completedAt = Column(DateTime(timezone=True), nullable=True)
    jobId = Column(String, nullable=True)
    currentModule = Column(String, nullable=True)
    progress = Column(Integer, default=0, nullable=False)
    
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
    
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)

    scan = relationship("Scan", back_populates="results")

class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    scanId = Column(String, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    logLevel = Column(String, default="INFO", nullable=False) # INFO, WARNING, ERROR
    message = Column(Text, nullable=False)
    createdAt = Column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)

    scan = relationship("Scan", back_populates="logs")
