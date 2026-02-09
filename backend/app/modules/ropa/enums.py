"""
Enum definitions for ROPA module.

These enums provide type-safe values for ROPA fields and are used
in both database models and Pydantic schemas.
"""

import enum


class RepositoryType(str, enum.Enum):
    """Type of data repository."""
    DATABASE = "database"
    CLOUD_STORAGE = "cloud_storage"
    FILE_SYSTEM = "file_system"
    DATA_WAREHOUSE = "data_warehouse"
    BACKUP_STORAGE = "backup_storage"
    ARCHIVE = "archive"


class RepositoryStatus(str, enum.Enum):
    """Operational status of a repository."""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DECOMMISSIONED = "decommissioned"
    MAINTENANCE = "maintenance"


class StorageType(str, enum.Enum):
    """Type of storage technology."""
    RELATIONAL_DB = "relational_db"
    NOSQL = "nosql"
    OBJECT_STORAGE = "object_storage"
    FILE_STORAGE = "file_storage"
    BLOCK_STORAGE = "block_storage"


class Environment(str, enum.Enum):
    """Environment where repository is deployed."""
    PRODUCTION = "production"
    STAGING = "staging"
    DEVELOPMENT = "development"
    TEST = "test"


class AccessControlMethod(str, enum.Enum):
    """Method used for access control."""
    RBAC = "rbac"
    ABAC = "abac"
    IP_WHITELIST = "ip_whitelist"
    VPN = "vpn"
    CERTIFICATE = "certificate"
    API_KEY = "api_key"
    OTHER = "other"


class AuthenticationMethod(str, enum.Enum):
    """Method used for authentication."""
    MFA = "mfa"
    SSO = "sso"
    PASSWORD = "password"
    API_KEY = "api_key"
    CERTIFICATE = "certificate"
    OAUTH = "oauth"
    OTHER = "other"


class BackupFrequency(str, enum.Enum):
    """Frequency of backups."""
    CONTINUOUS = "continuous"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ON_DEMAND = "on_demand"
    NONE = "none"


class DeletionMethod(str, enum.Enum):
    """Method used for data deletion."""
    AUTOMATED = "automated"
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    ON_DEMAND = "on_demand"
    NONE = "none"


class ROPAEntityType(str, enum.Enum):
    """Type of ROPA entity for AI suggestion jobs."""
    REPOSITORY = "repository"
    ACTIVITY = "activity"
    DATA_ELEMENT = "data_element"
    DPIA = "dpia"
    RISK = "risk"


class DataFormat(str, enum.Enum):
    """Format of stored data."""
    ELECTRONIC = "Electronic"
    PHYSICAL = "Physical"


class TransferMechanism(str, enum.Enum):
    """Legal mechanism for cross-border data transfers."""
    ADEQUACY = "Adequacy"
    PRIVACY_SHIELD = "Privacy Shield"
    BCR = "BCR"
    CONTRACT = "Contract"
    DEROGATION = "Derogation"


class DerogationType(str, enum.Enum):
    """Type of derogation for cross-border transfers."""
    LEGAL_CLAIMS = "Legal claims"
    VITAL_INTERESTS = "Vital interests"
    PUBLIC_INFO = "Public info"
    SPORADIC = "Sporadic"
    NOT_APPLICABLE = "N/A"


class CrossBorderSafeguards(str, enum.Enum):
    """Security safeguards for cross-border transfers."""
    BINDING_CONTRACT = "Binding contract"
    DPA_CLAUSES = "DPA clauses"
    BCRS = "BCRs"
    CODE_OF_CONDUCT = "Code of conduct"
    CERT = "Cert"
    NOT_APPLICABLE = "N/A"


class Certification(str, enum.Enum):
    """Certification of security or privacy practices."""
    ISO_27001 = "ISO-27001"
    NIST = "NIST"
    SOC = "SOC"
    TRUSTEE = "Trustee"
    NOT_APPLICABLE = "N/A"


class InterfaceType(str, enum.Enum):
    """Nature of interfaced system."""
    INTERNAL = "Internal"
    EXTERNAL = "External"


class LocationType(str, enum.Enum):
    """Type of geographic location."""
    REGION = "region"
    COUNTRY = "country"


class ProcessingFrequency(str, enum.Enum):
    """Frequency with which processing occurs."""
    REAL_TIME = "Real-time"
    DAILY = "Daily"
    WEEKLY = "Weekly"
    MONTHLY = "Monthly"
    AD_HOC = "Ad-hoc"


class LawfulBasis(str, enum.Enum):
    """Legal basis under GDPR or equivalent frameworks for processing personal data."""
    CONSENT = "Consent"
    CONTRACT = "Contract"
    LEGAL_OBLIGATION = "Legal Obligation"
    VITAL_INTEREST = "Vital Interest"
    PUBLIC_TASK = "Public Task"
    LEGITIMATE_INTEREST = "Legitimate Interest"
    NOT_APPLICABLE = "Not Applicable"



