"""
Metadata definitions for ROPA fields.

Provides rich metadata for AI API integration, including descriptions,
examples, and context for each enum value and field.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field
from app.modules.ropa.enums import (
    RepositoryType,
    RepositoryStatus,
    StorageType,
    Environment,
    AccessControlMethod,
    AuthenticationMethod,
    BackupFrequency,
    DeletionMethod,
)


@dataclass
class EnumValueMetadata:
    """Metadata for a single enum value."""
    value: str
    label: str  # Human-readable label
    description: str  # What this value means
    examples: List[str] = field(default_factory=list)  # Example use cases
    context: Optional[str] = None  # Additional context for AI
    related_values: List[str] = field(default_factory=list)  # Related enum values


@dataclass
class FieldMetadata:
    """Complete metadata for a form field."""
    field_name: str
    field_type: str
    description: str
    required: bool
    allowed_values: Optional[List[EnumValueMetadata]] = None
    examples: List[str] = field(default_factory=list)
    validation_rules: Dict = field(default_factory=dict)
    ai_hints: Optional[str] = None  # Specific hints for AI


# Repository Type Metadata
REPOSITORY_TYPE_METADATA: Dict[str, EnumValueMetadata] = {
    RepositoryType.DATABASE.value: EnumValueMetadata(
        value=RepositoryType.DATABASE.value,
        label="Database",
        description="Relational or NoSQL database systems (PostgreSQL, MySQL, MongoDB, etc.)",
        examples=["PostgreSQL production DB", "MongoDB user data", "MySQL analytics database"],
        context="Used for structured data storage with query capabilities. Typically transactional systems.",
        related_values=[StorageType.RELATIONAL_DB.value, StorageType.NOSQL.value]
    ),
    RepositoryType.CLOUD_STORAGE.value: EnumValueMetadata(
        value=RepositoryType.CLOUD_STORAGE.value,
        label="Cloud Storage",
        description="Object storage services (AWS S3, Azure Blob, Google Cloud Storage)",
        examples=["AWS S3 bucket", "Azure Blob container", "GCS bucket for backups"],
        context="Used for file and object storage, often for backups, archives, or static assets.",
        related_values=[StorageType.OBJECT_STORAGE.value]
    ),
    RepositoryType.FILE_SYSTEM.value: EnumValueMetadata(
        value=RepositoryType.FILE_SYSTEM.value,
        label="File System",
        description="Traditional file system storage (local or network-attached)",
        examples=["Network file share", "Local server storage", "NAS device"],
        context="Used for file-based storage, typically on-premise or network-attached storage.",
        related_values=[StorageType.FILE_STORAGE.value]
    ),
    RepositoryType.DATA_WAREHOUSE.value: EnumValueMetadata(
        value=RepositoryType.DATA_WAREHOUSE.value,
        label="Data Warehouse",
        description="Large-scale analytical data storage (Snowflake, Redshift, BigQuery)",
        examples=["Snowflake data warehouse", "AWS Redshift cluster", "Google BigQuery dataset"],
        context="Used for analytical workloads, business intelligence, and data analytics.",
        related_values=[StorageType.RELATIONAL_DB.value]
    ),
    RepositoryType.BACKUP_STORAGE.value: EnumValueMetadata(
        value=RepositoryType.BACKUP_STORAGE.value,
        label="Backup Storage",
        description="Dedicated storage for backups and disaster recovery",
        examples=["Backup server", "Tape library", "Cloud backup storage"],
        context="Used exclusively for storing backup copies of data for disaster recovery purposes.",
        related_values=[StorageType.OBJECT_STORAGE.value, StorageType.FILE_STORAGE.value]
    ),
    RepositoryType.ARCHIVE.value: EnumValueMetadata(
        value=RepositoryType.ARCHIVE.value,
        label="Archive",
        description="Long-term archival storage for compliance or historical data",
        examples=["Compliance archive", "Historical data archive", "Cold storage"],
        context="Used for long-term storage of data that is rarely accessed but must be retained.",
        related_values=[StorageType.OBJECT_STORAGE.value]
    ),
}


# Repository Status Metadata
REPOSITORY_STATUS_METADATA: Dict[str, EnumValueMetadata] = {
    RepositoryStatus.ACTIVE.value: EnumValueMetadata(
        value=RepositoryStatus.ACTIVE.value,
        label="Active",
        description="Repository is currently in use and operational",
        examples=[],
        context="Normal operational state. Repository is actively storing and serving data."
    ),
    RepositoryStatus.ARCHIVED.value: EnumValueMetadata(
        value=RepositoryStatus.ARCHIVED.value,
        label="Archived",
        description="Repository is archived but data is still accessible",
        examples=[],
        context="Repository is no longer actively used but data is retained and accessible."
    ),
    RepositoryStatus.DECOMMISSIONED.value: EnumValueMetadata(
        value=RepositoryStatus.DECOMMISSIONED.value,
        label="Decommissioned",
        description="Repository has been permanently shut down",
        examples=[],
        context="Repository is no longer in use and may have been deleted or data migrated."
    ),
    RepositoryStatus.MAINTENANCE.value: EnumValueMetadata(
        value=RepositoryStatus.MAINTENANCE.value,
        label="Maintenance",
        description="Repository is temporarily unavailable for maintenance",
        examples=[],
        context="Temporary state during planned or unplanned maintenance activities."
    ),
}


# Storage Type Metadata
STORAGE_TYPE_METADATA: Dict[str, EnumValueMetadata] = {
    StorageType.RELATIONAL_DB.value: EnumValueMetadata(
        value=StorageType.RELATIONAL_DB.value,
        label="Relational Database",
        description="SQL-based relational database (PostgreSQL, MySQL, SQL Server, Oracle)",
        examples=["PostgreSQL", "MySQL", "SQL Server", "Oracle Database"],
        context="Structured data with relationships, ACID transactions, SQL queries."
    ),
    StorageType.NOSQL.value: EnumValueMetadata(
        value=StorageType.NOSQL.value,
        label="NoSQL Database",
        description="Non-relational database (MongoDB, Cassandra, DynamoDB, CouchDB)",
        examples=["MongoDB", "Cassandra", "DynamoDB", "CouchDB"],
        context="Document, key-value, or wide-column stores. Flexible schema, high scalability."
    ),
    StorageType.OBJECT_STORAGE.value: EnumValueMetadata(
        value=StorageType.OBJECT_STORAGE.value,
        label="Object Storage",
        description="Object-based storage (S3, Blob Storage, Cloud Storage)",
        examples=["AWS S3", "Azure Blob", "Google Cloud Storage"],
        context="Flat namespace, REST API access, good for files and unstructured data."
    ),
    StorageType.FILE_STORAGE.value: EnumValueMetadata(
        value=StorageType.FILE_STORAGE.value,
        label="File Storage",
        description="Traditional file system storage (NFS, CIFS, local filesystem)",
        examples=["Network File System", "Windows File Share", "Local disk"],
        context="Hierarchical directory structure, file-based access patterns."
    ),
    StorageType.BLOCK_STORAGE.value: EnumValueMetadata(
        value=StorageType.BLOCK_STORAGE.value,
        label="Block Storage",
        description="Block-level storage (SAN, EBS, Azure Disk)",
        examples=["AWS EBS", "Azure Disk", "SAN storage"],
        context="Raw block device access, typically used by databases or VMs."
    ),
}


# Environment Metadata
ENVIRONMENT_METADATA: Dict[str, EnumValueMetadata] = {
    Environment.PRODUCTION.value: EnumValueMetadata(
        value=Environment.PRODUCTION.value,
        label="Production",
        description="Live production environment serving real users",
        examples=[],
        context="Highest security and availability requirements. Real customer data."
    ),
    Environment.STAGING.value: EnumValueMetadata(
        value=Environment.STAGING.value,
        label="Staging",
        description="Pre-production environment for final testing",
        examples=[],
        context="Mirrors production for testing. May contain anonymized production data."
    ),
    Environment.DEVELOPMENT.value: EnumValueMetadata(
        value=Environment.DEVELOPMENT.value,
        label="Development",
        description="Development environment for active development work",
        examples=[],
        context="Used by developers. May contain test or sample data."
    ),
    Environment.TEST.value: EnumValueMetadata(
        value=Environment.TEST.value,
        label="Test",
        description="Testing environment for automated or manual testing",
        examples=[],
        context="Used for QA and testing. Contains synthetic or test data only."
    ),
}


# Access Control Method Metadata
ACCESS_CONTROL_METHOD_METADATA: Dict[str, EnumValueMetadata] = {
    AccessControlMethod.RBAC.value: EnumValueMetadata(
        value=AccessControlMethod.RBAC.value,
        label="Role-Based Access Control",
        description="Access control based on user roles",
        examples=["Admin role", "User role", "Viewer role"],
        context="Users are assigned roles, and roles have permissions."
    ),
    AccessControlMethod.ABAC.value: EnumValueMetadata(
        value=AccessControlMethod.ABAC.value,
        label="Attribute-Based Access Control",
        description="Access control based on user attributes and context",
        examples=["Department-based access", "Time-based access"],
        context="More granular than RBAC, considers user attributes and context."
    ),
    AccessControlMethod.IP_WHITELIST.value: EnumValueMetadata(
        value=AccessControlMethod.IP_WHITELIST.value,
        label="IP Whitelist",
        description="Access restricted to specific IP addresses or ranges",
        examples=["Office IP range", "VPN IP addresses"],
        context="Network-level access control. Only specified IPs can connect."
    ),
    AccessControlMethod.VPN.value: EnumValueMetadata(
        value=AccessControlMethod.VPN.value,
        label="VPN",
        description="Access through Virtual Private Network",
        examples=["Corporate VPN", "Site-to-site VPN"],
        context="Users must connect via VPN to access the repository."
    ),
    AccessControlMethod.CERTIFICATE.value: EnumValueMetadata(
        value=AccessControlMethod.CERTIFICATE.value,
        label="Certificate-Based",
        description="Access control using client certificates",
        examples=["TLS client certificates", "X.509 certificates"],
        context="Mutual TLS authentication using digital certificates."
    ),
    AccessControlMethod.API_KEY.value: EnumValueMetadata(
        value=AccessControlMethod.API_KEY.value,
        label="API Key",
        description="Access control using API keys",
        examples=["Application API keys", "Service account keys"],
        context="API keys are used to authenticate and authorize access."
    ),
    AccessControlMethod.OTHER.value: EnumValueMetadata(
        value=AccessControlMethod.OTHER.value,
        label="Other",
        description="Other access control method not listed",
        examples=[],
        context="Custom or proprietary access control method."
    ),
}


# Authentication Method Metadata
AUTHENTICATION_METHOD_METADATA: Dict[str, EnumValueMetadata] = {
    AuthenticationMethod.MFA.value: EnumValueMetadata(
        value=AuthenticationMethod.MFA.value,
        label="Multi-Factor Authentication",
        description="Authentication requiring multiple factors (password + token)",
        examples=["Password + TOTP", "Password + SMS", "Password + Hardware token"],
        context="Enhanced security requiring multiple authentication factors."
    ),
    AuthenticationMethod.SSO.value: EnumValueMetadata(
        value=AuthenticationMethod.SSO.value,
        label="Single Sign-On",
        description="Centralized authentication (SAML, OAuth, LDAP)",
        examples=["SAML SSO", "OAuth 2.0", "Active Directory"],
        context="Users authenticate once and gain access to multiple systems."
    ),
    AuthenticationMethod.PASSWORD.value: EnumValueMetadata(
        value=AuthenticationMethod.PASSWORD.value,
        label="Password",
        description="Traditional username/password authentication",
        examples=["Username/password", "Email/password"],
        context="Basic authentication using username and password credentials."
    ),
    AuthenticationMethod.API_KEY.value: EnumValueMetadata(
        value=AuthenticationMethod.API_KEY.value,
        label="API Key",
        description="Authentication using API keys",
        examples=["Application API keys", "Service account keys"],
        context="API keys are used for programmatic access."
    ),
    AuthenticationMethod.CERTIFICATE.value: EnumValueMetadata(
        value=AuthenticationMethod.CERTIFICATE.value,
        label="Certificate",
        description="Certificate-based authentication",
        examples=["Client certificates", "X.509 certificates"],
        context="Digital certificates are used for authentication."
    ),
    AuthenticationMethod.OAUTH.value: EnumValueMetadata(
        value=AuthenticationMethod.OAUTH.value,
        label="OAuth",
        description="OAuth-based authentication",
        examples=["OAuth 2.0", "OpenID Connect"],
        context="Delegated authentication using OAuth protocol."
    ),
    AuthenticationMethod.OTHER.value: EnumValueMetadata(
        value=AuthenticationMethod.OTHER.value,
        label="Other",
        description="Other authentication method not listed",
        examples=[],
        context="Custom or proprietary authentication method."
    ),
}


# Backup Frequency Metadata
BACKUP_FREQUENCY_METADATA: Dict[str, EnumValueMetadata] = {
    BackupFrequency.CONTINUOUS.value: EnumValueMetadata(
        value=BackupFrequency.CONTINUOUS.value,
        label="Continuous",
        description="Continuous backup or replication",
        examples=["Real-time replication", "Continuous data protection"],
        context="Data is backed up continuously in real-time or near real-time."
    ),
    BackupFrequency.HOURLY.value: EnumValueMetadata(
        value=BackupFrequency.HOURLY.value,
        label="Hourly",
        description="Backups performed every hour",
        examples=["Hourly snapshots", "Hourly incremental backups"],
        context="Backups are created once per hour."
    ),
    BackupFrequency.DAILY.value: EnumValueMetadata(
        value=BackupFrequency.DAILY.value,
        label="Daily",
        description="Backups performed once per day",
        examples=["Daily full backup", "Daily incremental backup"],
        context="Most common backup frequency. Typically runs during off-peak hours."
    ),
    BackupFrequency.WEEKLY.value: EnumValueMetadata(
        value=BackupFrequency.WEEKLY.value,
        label="Weekly",
        description="Backups performed once per week",
        examples=["Weekly full backup", "Weekly archive"],
        context="Less frequent backup schedule, typically for less critical data."
    ),
    BackupFrequency.MONTHLY.value: EnumValueMetadata(
        value=BackupFrequency.MONTHLY.value,
        label="Monthly",
        description="Backups performed once per month",
        examples=["Monthly archive", "Monthly compliance backup"],
        context="Long-term backup schedule, often for compliance or archival purposes."
    ),
    BackupFrequency.ON_DEMAND.value: EnumValueMetadata(
        value=BackupFrequency.ON_DEMAND.value,
        label="On Demand",
        description="Backups performed manually when needed",
        examples=["Manual backup before migration", "On-demand snapshot"],
        context="Backups are created manually or triggered by specific events."
    ),
    BackupFrequency.NONE.value: EnumValueMetadata(
        value=BackupFrequency.NONE.value,
        label="None",
        description="No automated backups configured",
        examples=[],
        context="No backup strategy in place. High risk if data is lost."
    ),
}


# Deletion Method Metadata
DELETION_METHOD_METADATA: Dict[str, EnumValueMetadata] = {
    DeletionMethod.AUTOMATED.value: EnumValueMetadata(
        value=DeletionMethod.AUTOMATED.value,
        label="Automated",
        description="Data is automatically deleted based on retention policy",
        examples=["Auto-delete after 7 years", "Automated retention policy"],
        context="Deletion happens automatically without manual intervention."
    ),
    DeletionMethod.MANUAL.value: EnumValueMetadata(
        value=DeletionMethod.MANUAL.value,
        label="Manual",
        description="Data is deleted manually by administrators",
        examples=["Manual deletion request", "Admin-initiated deletion"],
        context="Requires human intervention to delete data."
    ),
    DeletionMethod.SCHEDULED.value: EnumValueMetadata(
        value=DeletionMethod.SCHEDULED.value,
        label="Scheduled",
        description="Data deletion is scheduled but requires approval",
        examples=["Scheduled deletion job", "Retention policy with approval"],
        context="Deletion is scheduled but may require approval before execution."
    ),
    DeletionMethod.ON_DEMAND.value: EnumValueMetadata(
        value=DeletionMethod.ON_DEMAND.value,
        label="On Demand",
        description="Data is deleted on-demand when requested",
        examples=["User-initiated deletion", "GDPR right to erasure"],
        context="Deletion happens when explicitly requested, typically for user rights."
    ),
    DeletionMethod.NONE.value: EnumValueMetadata(
        value=DeletionMethod.NONE.value,
        label="None",
        description="No deletion method configured",
        examples=[],
        context="Data is retained indefinitely. May have compliance implications."
    ),
}


# Field-level metadata for Repository form
REPOSITORY_FIELD_METADATA: Dict[str, FieldMetadata] = {
    "repository_type": FieldMetadata(
        field_name="repository_type",
        field_type="enum",
        description="Type of data repository",
        required=False,
        allowed_values=list(REPOSITORY_TYPE_METADATA.values()),
        examples=["database", "cloud_storage", "file_system"],
        ai_hints="Choose based on where data is stored. Database for structured queryable data, cloud_storage for files/objects, file_system for traditional file storage."
    ),
    "status": FieldMetadata(
        field_name="status",
        field_type="enum",
        description="Current operational status of the repository",
        required=False,
        allowed_values=list(REPOSITORY_STATUS_METADATA.values()),
        examples=["active", "archived", "decommissioned"],
        ai_hints="Most repositories should be 'active'. Use 'archived' for repositories no longer in use but data retained, 'decommissioned' for permanently shut down."
    ),
    "storage_type": FieldMetadata(
        field_name="storage_type",
        field_type="enum",
        description="Type of storage technology used",
        required=False,
        allowed_values=list(STORAGE_TYPE_METADATA.values()),
        examples=["relational_db", "nosql", "object_storage"],
        ai_hints="Technical storage type. Relational_db for SQL databases, nosql for document/key-value stores, object_storage for S3-like storage."
    ),
    "environment": FieldMetadata(
        field_name="environment",
        field_type="enum",
        description="Environment where repository is deployed",
        required=False,
        allowed_values=list(ENVIRONMENT_METADATA.values()),
        examples=["production", "staging", "development"],
        ai_hints="Production for live systems, staging for pre-production testing, development for active development work."
    ),
    "access_control_method": FieldMetadata(
        field_name="access_control_method",
        field_type="enum",
        description="Method used for access control",
        required=False,
        allowed_values=list(ACCESS_CONTROL_METHOD_METADATA.values()),
        examples=["rbac", "ip_whitelist", "vpn"],
        ai_hints="RBAC for role-based access, IP whitelist for network-level restrictions, VPN for remote access."
    ),
    "authentication_method": FieldMetadata(
        field_name="authentication_method",
        field_type="enum",
        description="Method used for authentication",
        required=False,
        allowed_values=list(AUTHENTICATION_METHOD_METADATA.values()),
        examples=["mfa", "sso", "password"],
        ai_hints="MFA for enhanced security, SSO for centralized authentication, password for basic auth."
    ),
    "backup_frequency": FieldMetadata(
        field_name="backup_frequency",
        field_type="enum",
        description="Frequency of backups",
        required=False,
        allowed_values=list(BACKUP_FREQUENCY_METADATA.values()),
        examples=["daily", "hourly", "continuous"],
        ai_hints="Daily is most common. Continuous for critical systems, hourly for important data, weekly/monthly for less critical."
    ),
    "deletion_method": FieldMetadata(
        field_name="deletion_method",
        field_type="enum",
        description="Method used for data deletion",
        required=False,
        allowed_values=list(DELETION_METHOD_METADATA.values()),
        examples=["automated", "manual", "scheduled"],
        ai_hints="Automated for retention policies, manual for admin-controlled deletion, scheduled for planned deletion."
    ),
    "data_repository_name": FieldMetadata(
        field_name="data_repository_name",
        field_type="text",
        description="Name or identifier of the data repository",
        required=True,
        examples=[
            "Production Customer Database",
            "AWS S3 Marketing Assets Bucket",
            "Employee HR Records Database",
            "Analytics Data Warehouse"
        ],
        ai_hints="Provide a clear, descriptive name that identifies the repository. Should be specific enough to distinguish it from other repositories. Typically includes the purpose or type of data stored."
    ),
    "data_repository_description": FieldMetadata(
        field_name="data_repository_description",
        field_type="textarea",
        description="Detailed description of the repository, its purpose, and contents",
        required=False,
        examples=[
            "Primary PostgreSQL database storing customer order data, payment information, and user profiles for the e-commerce platform",
            "S3 bucket containing marketing assets, product images, and promotional materials",
            "SQL Server database managing employee records, payroll data, and performance reviews"
        ],
        ai_hints="Provide a comprehensive description of what data is stored, the repository's purpose, and key characteristics. Should be specific enough for compliance documentation and help others understand the repository's role."
    ),
    "external_vendor": FieldMetadata(
        field_name="external_vendor",
        field_type="text",
        description="External vendor or provider of the repository technology or service",
        required=False,
        examples=[
            "Amazon Web Services",
            "Microsoft Azure",
            "Google Cloud Platform",
            "Oracle Corporation",
            "MongoDB Inc.",
            "Self-hosted"
        ],
        ai_hints="Specify the external vendor or provider of the repository. For cloud services, use the cloud provider name (AWS, Azure, GCP). For databases, use the database vendor (Oracle, MongoDB, etc.). For self-hosted, specify 'Self-hosted' or the organization name."
    ),
    "dpa_url": FieldMetadata(
        field_name="dpa_url",
        field_type="text",
        description="Data Processing Agreement (DPA) URL or reference",
        required=False,
        examples=[
            "https://example.com/dpa/aws-dpa.pdf",
            "https://docs.microsoft.com/en-us/compliance/regulatory/offering-EU-Model-Clauses",
            "DPA-2024-001"
        ],
        ai_hints="Provide the URL or reference to the Data Processing Agreement with the vendor. This is required for GDPR compliance when using external processors."
    ),
    "location": FieldMetadata(
        field_name="location",
        field_type="text",
        description="Geographic location or region where the repository is hosted",
        required=False,
        examples=[
            "US East (N. Virginia)",
            "EU West (Ireland)",
            "Asia Pacific (Singapore)",
            "On-premise, New York Office",
            "Multi-region: US, EU, APAC"
        ],
        ai_hints="Specify the geographic location or region. For cloud services, use the region identifier (e.g., 'US East (N. Virginia)'). For on-premise, specify the physical location. For multi-region deployments, list all regions."
    ),
    "security_measures": FieldMetadata(
        field_name="security_measures",
        field_type="textarea",
        description="Security measures and controls implemented for the repository",
        required=False,
        examples=[
            "Encryption at rest using AES-256, encryption in transit via TLS 1.3, network isolation via VPC, regular security audits",
            "Multi-factor authentication required, role-based access control, automated security monitoring, intrusion detection system",
            "Data encryption, access logging, regular backups, disaster recovery procedures, penetration testing annually"
        ],
        ai_hints="Describe the security measures in place. Include: encryption (at rest and in transit), access controls, authentication methods, monitoring/logging, backup procedures, compliance certifications, and any other security controls."
    ),
    "access_controls": FieldMetadata(
        field_name="access_controls",
        field_type="textarea",
        description="Access control mechanisms and policies for the repository",
        required=False,
        examples=[
            "Role-based access control (RBAC) with admin, read-write, and read-only roles. Access granted based on job function and least privilege principle",
            "IP whitelist restricting access to office network and VPN. Two-factor authentication required for all access",
            "Attribute-based access control (ABAC) considering user department, time of day, and data sensitivity level"
        ],
        ai_hints="Describe how access is controlled. Include: access control model (RBAC, ABAC, etc.), who has access, how access is granted/revoked, authentication requirements, network restrictions, and any access review processes."
    ),
    "responsible_person": FieldMetadata(
        field_name="responsible_person",
        field_type="text",
        description="Person or role responsible for managing and maintaining the repository",
        required=False,
        examples=[
            "John Smith, IT Operations Manager",
            "Database Administration Team",
            "Sarah Johnson, Data Protection Officer",
            "Cloud Infrastructure Team"
        ],
        ai_hints="Identify the individual or team responsible for the repository. Should be someone who can answer questions about the repository, manage access, and ensure compliance. Include name and role/title."
    ),
    "contact_email": FieldMetadata(
        field_name="contact_email",
        field_type="text",
        description="Contact email for repository-related inquiries or issues",
        required=False,
        examples=[
            "dpo@company.com",
            "it-ops@company.com",
            "database-admin@company.com",
            "security-team@company.com"
        ],
        ai_hints="Provide an email address for contacting the responsible person or team. Use a functional email (team email) rather than personal email when possible. Should be monitored and responsive."
    ),
    "compliance_notes": FieldMetadata(
        field_name="compliance_notes",
        field_type="textarea",
        description="Notes about compliance requirements, certifications, or regulatory considerations",
        required=False,
        examples=[
            "Compliant with GDPR Article 30 requirements. Subject to SOC 2 Type II audit annually. Data residency requirements: EU data must remain in EU regions",
            "HIPAA compliant with signed Business Associate Agreement. Regular compliance audits conducted. Data encryption required for all PHI",
            "PCI DSS Level 1 compliant. Annual security assessments required. Cardholder data environment with strict access controls"
        ],
        ai_hints="Document compliance-related information. Include: applicable regulations (GDPR, HIPAA, PCI DSS, etc.), certifications held, audit requirements, data residency restrictions, and any compliance-specific controls or procedures."
    ),
    "data_classification": FieldMetadata(
        field_name="data_classification",
        field_type="text",
        description="Classification level of data stored in the repository",
        required=False,
        examples=[
            "Public, Internal, Confidential, Restricted",
            "Level 1: Public, Level 2: Internal, Level 3: Confidential, Level 4: Highly Confidential",
            "Unclassified, Confidential, Secret, Top Secret"
        ],
        ai_hints="Specify the data classification scheme used and the classification levels of data in this repository. Common classifications: Public, Internal, Confidential, Restricted. May also include sensitivity levels or regulatory categories."
    ),
    "retention_policy": FieldMetadata(
        field_name="retention_policy",
        field_type="textarea",
        description="Data retention policy specifying how long data is retained and when it is deleted",
        required=False,
        examples=[
            "Customer data retained for 7 years after account closure for tax compliance. Transaction records retained for 10 years. Marketing data retained for 3 years or until opt-out",
            "Employee records retained for 7 years after termination. Payroll data retained for 7 years. Performance reviews retained for 5 years",
            "Log data retained for 90 days. Backup data retained for 30 days. Archived data retained indefinitely for compliance"
        ],
        ai_hints="Describe the retention policy for data in this repository. Include: retention periods for different data types, reasons for retention (legal, business, compliance), deletion schedules, and any exceptions or special cases."
    ),
    "backup_procedures": FieldMetadata(
        field_name="backup_procedures",
        field_type="textarea",
        description="Backup procedures, frequency, and recovery processes for the repository",
        required=False,
        examples=[
            "Daily full backups at 2 AM UTC, hourly incremental backups. Backups retained for 30 days. Tested restore procedures monthly. Backups stored in separate geographic region",
            "Continuous replication to secondary site. Weekly full backups to tape archive. Backup verification daily. Disaster recovery tested quarterly",
            "Real-time replication to standby database. Daily snapshots retained for 7 days. Weekly backups to cloud storage retained for 4 weeks. Monthly archives retained for 1 year"
        ],
        ai_hints="Describe the backup strategy and procedures. Include: backup frequency (daily, hourly, continuous), backup types (full, incremental, snapshots), retention periods, backup storage location, verification procedures, and disaster recovery testing frequency."
    ),
    "comments": FieldMetadata(
        field_name="comments",
        field_type="multiselect",
        description="Comments or notes about the repository (merged from tags and notes)",
        required=False,
        examples=[
            "Repository scheduled for migration to cloud in Q2 2025",
            "High priority for security review",
            "Performance issues noted during peak hours"
        ],
        ai_hints="Use this field for comments, observations, or reminders about the repository. May include: migration plans, known issues, maintenance schedules, special considerations, or any other relevant information."
    ),
    "secondary_countries": FieldMetadata(
        field_name="secondary_countries",
        field_type="multiselect",
        description="Additional countries or regions where data may be stored or processed",
        required=False,
        examples=[
            "Germany",
            "France",
            "United Kingdom",
            "US",
            "Canada",
            "Mexico",
            "Singapore",
            "Japan",
            "Australia",
            "EU",
            "APAC"
        ],
        ai_hints="List additional countries or regions where data is stored or processed beyond the primary location. Important for GDPR compliance and data residency requirements. Return an array of individual country names or region identifiers. Each suggestion should be a separate string item in the array, not a comma-separated string. Example: ['US', 'GB', 'DE'] not 'US, GB, DE'."
    ),
}


# ============================================================================
# Activity Field Metadata
# ============================================================================

ACTIVITY_FIELD_METADATA: Dict[str, FieldMetadata] = {
    "description": FieldMetadata(
        field_name="description",
        field_type="textarea",
        description="Detailed description of the processing activity",
        required=False,
        examples=[
            "Processing customer orders and payments through our e-commerce platform",
            "Managing user authentication and session data for web application",
            "Analyzing website traffic and user behavior for marketing insights"
        ],
        ai_hints="Provide a clear, comprehensive description of what data processing occurs. Include the purpose, scope, and key operations. Should be specific enough for GDPR compliance documentation."
    ),
    "purpose": FieldMetadata(
        field_name="purpose",
        field_type="text",
        description="Purpose of processing personal data",
        required=False,
        examples=[
            "To fulfill customer orders and process payments",
            "To authenticate users and manage access to the platform",
            "To analyze user behavior and improve user experience"
        ],
        ai_hints="State the specific business purpose for processing personal data. Should align with GDPR legal basis requirements. Be clear and specific about why the data is needed."
    ),
    "legal_basis": FieldMetadata(
        field_name="legal_basis",
        field_type="text",
        description="Legal basis for processing under GDPR Article 6",
        required=False,
        examples=[
            "Consent",
            "Contract",
            "Legal obligation",
            "Legitimate interests",
            "Vital interests",
            "Public task"
        ],
        ai_hints="Must be one of the six legal bases under GDPR Article 6. Common ones: Consent (user explicitly agreed), Contract (necessary for contract fulfillment), Legitimate interests (business needs that don't override privacy)."
    ),
    "business_function": FieldMetadata(
        field_name="business_function",
        field_type="text",
        description="Business function or department responsible for this processing",
        required=False,
        examples=[
            "Customer Service",
            "Marketing",
            "Sales",
            "IT Operations",
            "Human Resources",
            "Finance"
        ],
        ai_hints="Identify the business function or department that owns or is responsible for this processing activity. Helps with accountability and contact points."
    ),
    "processing_owner": FieldMetadata(
        field_name="processing_owner",
        field_type="text",
        description="Person or role responsible for this processing activity",
        required=False,
        examples=[
            "John Smith, Data Protection Officer",
            "Marketing Team Lead",
            "IT Operations Manager",
            "Customer Service Director"
        ],
        ai_hints="Specify the individual or role responsible for managing this processing activity. Should be someone who can answer questions about the processing and ensure compliance."
    ),
    "processing_operations": FieldMetadata(
        field_name="processing_operations",
        field_type="multiline",
        description="Detailed description of processing operations performed on the data",
        required=False,
        examples=[
            "Collection, storage, retrieval, analysis, and deletion of customer order data",
            "Authentication, session management, access control, and audit logging",
            "Aggregation, statistical analysis, and reporting of website analytics"
        ],
        ai_hints="List all operations performed on the data (e.g., collection, storage, retrieval, analysis, sharing, deletion). Be comprehensive and specific about what happens to the data throughout its lifecycle."
    ),
    "retention_period": FieldMetadata(
        field_name="retention_period",
        field_type="text",
        description="How long personal data is retained",
        required=False,
        examples=[
            "7 years for tax compliance",
            "3 years after account closure",
            "Until user requests deletion",
            "Indefinite for active accounts"
        ],
        ai_hints="Specify the retention period and the reason for it. Should align with legal requirements, business needs, and data minimization principles. Include the rationale (e.g., '7 years for tax compliance')."
    ),
    "deletion_method": FieldMetadata(
        field_name="deletion_method",
        field_type="text",
        description="Method used to delete or anonymize data when retention period expires",
        required=False,
        examples=[
            "Automated deletion via scheduled job",
            "Manual deletion by administrator",
            "Anonymization preserving statistical value",
            "Secure deletion using cryptographic erasure"
        ],
        ai_hints="Describe how data is deleted or anonymized. Should ensure data is permanently removed or rendered non-identifiable. Consider technical methods (automated scripts, secure deletion tools) and verification processes."
    ),
}


# ============================================================================
# DataElement Field Metadata
# ============================================================================

DATA_ELEMENT_FIELD_METADATA: Dict[str, FieldMetadata] = {
    "description": FieldMetadata(
        field_name="description",
        field_type="textarea",
        description="Detailed description of the data element",
        required=False,
        examples=[
            "Customer email addresses used for order confirmations and marketing communications",
            "IP addresses collected for security and fraud prevention",
            "Credit card numbers encrypted and stored for recurring payments"
        ],
        ai_hints="Provide a clear description of what specific data is collected. Include the format, sensitivity level, and any special characteristics. Should be specific enough to identify the exact data type."
    ),
    "category": FieldMetadata(
        field_name="category",
        field_type="text",
        description="Category or type of personal data",
        required=False,
        examples=[
            "Contact data",
            "Identity data",
            "Financial data",
            "Behavioral data",
            "Location data",
            "Health data"
        ],
        ai_hints="Classify the data into a category. Common categories: Contact (email, phone), Identity (name, ID numbers), Financial (payment info), Behavioral (browsing history), Location (GPS, IP), Health (medical records)."
    ),
    "data_subject_category": FieldMetadata(
        field_name="data_subject_category",
        field_type="text",
        description="Category of data subjects whose data is processed",
        required=False,
        examples=[
            "Customers",
            "Employees",
            "Website visitors",
            "Prospects",
            "Vendors",
            "Minors"
        ],
        ai_hints="Identify the category of individuals whose data is processed. Common categories: Customers, Employees, Website visitors, Prospects, Vendors, Minors. Helps understand the scope and special considerations."
    ),
    "data_source": FieldMetadata(
        field_name="data_source",
        field_type="text",
        description="Source from which the data is obtained",
        required=False,
        examples=[
            "Direct from user via registration form",
            "Third-party data provider",
            "Public source",
            "Automated collection via website cookies",
            "Employee self-service portal"
        ],
        ai_hints="Specify where the data comes from. Common sources: Direct from user (forms, interactions), Third-party (data brokers, partners), Public source (public records), Automated (cookies, tracking), Internal systems."
    ),
    "collection_method": FieldMetadata(
        field_name="collection_method",
        field_type="text",
        description="Method used to collect the data",
        required=False,
        examples=[
            "Form submission",
            "API integration",
            "Cookie tracking",
            "Manual entry",
            "Import from external system",
            "Automated scraping"
        ],
        ai_hints="Describe how the data is collected. Methods include: Form submission (user fills form), API integration (automated data sync), Cookie tracking (web tracking), Manual entry (staff input), Import (bulk import), Automated scraping (web scraping)."
    ),
    "collection_frequency": FieldMetadata(
        field_name="collection_frequency",
        field_type="text",
        description="How often the data is collected",
        required=False,
        examples=[
            "One-time during registration",
            "Real-time during user interactions",
            "Daily batch import",
            "On-demand when requested",
            "Continuous monitoring"
        ],
        ai_hints="Specify the frequency of data collection. Common frequencies: One-time (collected once), Real-time (collected continuously), Daily/Weekly/Monthly (batch collection), On-demand (collected when needed), Continuous (ongoing monitoring)."
    ),
}


# ============================================================================
# DPIA Field Metadata
# ============================================================================

DPIA_FIELD_METADATA: Dict[str, FieldMetadata] = {
    "title": FieldMetadata(
        field_name="title",
        field_type="text",
        description="Title of the Data Protection Impact Assessment",
        required=True,
        examples=[
            "DPIA for Customer Analytics Platform",
            "DPIA for Employee Monitoring System",
            "DPIA for Biometric Authentication System"
        ],
        ai_hints="Provide a clear, descriptive title that identifies the processing activity being assessed. Should be specific enough to distinguish this DPIA from others. Typically includes the activity name and purpose."
    ),
    "description": FieldMetadata(
        field_name="description",
        field_type="textarea",
        description="Description of the DPIA and the processing activity being assessed",
        required=False,
        examples=[
            "Assessment of data protection risks for our new customer analytics platform that processes behavioral data for marketing purposes",
            "Evaluation of privacy risks associated with employee monitoring software that tracks productivity metrics"
        ],
        ai_hints="Provide a comprehensive description of the DPIA scope, including what processing activity is being assessed, why the DPIA is necessary, and the key privacy concerns being evaluated."
    ),
    "necessity_proportionality_assessment": FieldMetadata(
        field_name="necessity_proportionality_assessment",
        field_type="multiline",
        description="Assessment of whether the processing is necessary and proportionate",
        required=False,
        examples=[
            "The processing is necessary to fulfill our contractual obligations with customers. The data collected is minimal and directly related to service delivery. Alternative approaches were considered but found to be less effective.",
            "The processing is proportionate to the legitimate interest of fraud prevention. We have implemented data minimization and only process data necessary for fraud detection."
        ],
        ai_hints="Evaluate whether the processing is necessary (is it needed?) and proportionate (is the scope appropriate?). Consider: Is the processing necessary for the stated purpose? Could the purpose be achieved with less data? Are there less intrusive alternatives? Document your reasoning clearly."
    ),
    "assessor": FieldMetadata(
        field_name="assessor",
        field_type="text",
        description="Person or team who conducted the DPIA",
        required=False,
        examples=[
            "Jane Doe, Data Protection Officer",
            "Privacy Team",
            "John Smith, Legal Counsel",
            "External privacy consultant"
        ],
        ai_hints="Identify who conducted or is responsible for the DPIA. Should be someone with appropriate expertise in data protection and privacy. Often the DPO, privacy team, or external consultant."
    ),
}


# ============================================================================
# Risk Field Metadata
# ============================================================================

RISK_FIELD_METADATA: Dict[str, FieldMetadata] = {
    "title": FieldMetadata(
        field_name="title",
        field_type="text",
        description="Title of the identified risk",
        required=True,
        examples=[
            "Unauthorized access to customer payment data",
            "Data breach through third-party vendor",
            "Inadequate data retention controls"
        ],
        ai_hints="Provide a clear, concise title that identifies the specific risk. Should be specific enough to distinguish this risk from others. Typically describes the threat or vulnerability."
    ),
    "description": FieldMetadata(
        field_name="description",
        field_type="textarea",
        description="Detailed description of the risk, including potential impact",
        required=False,
        examples=[
            "Risk of unauthorized access to customer payment data due to weak access controls. Could result in financial fraud, identity theft, and regulatory penalties. Impact would affect all customers whose payment data is stored.",
            "Risk of data breach through third-party vendor with inadequate security measures. Could expose customer personal data, leading to privacy violations and loss of customer trust."
        ],
        ai_hints="Describe the risk in detail, including: What is the threat? What vulnerabilities exist? What could happen if the risk materializes? Who would be affected? What would be the impact (privacy, financial, reputational)?"
    ),
    "mitigation": FieldMetadata(
        field_name="mitigation",
        field_type="multiline",
        description="Measures taken or planned to mitigate the risk",
        required=False,
        examples=[
            "Implement multi-factor authentication for all database access. Encrypt data at rest and in transit. Conduct regular access reviews and remove unnecessary permissions. Monitor access logs for suspicious activity.",
            "Require vendors to undergo security assessments. Include data protection clauses in contracts. Implement data minimization and limit vendor access to necessary data only. Regular vendor audits."
        ],
        ai_hints="Describe the measures taken or planned to reduce the risk. Include: Technical measures (encryption, access controls), Organizational measures (policies, training), Process measures (monitoring, audits). Be specific and actionable."
    ),
    "risk_owner": FieldMetadata(
        field_name="risk_owner",
        field_type="text",
        description="Person or role responsible for managing this risk",
        required=False,
        examples=[
            "IT Security Manager",
            "Data Protection Officer",
            "Product Owner",
            "Risk Management Team"
        ],
        ai_hints="Identify who is responsible for managing and monitoring this risk. Should be someone with authority to implement mitigation measures and ensure ongoing risk management. Helps with accountability."
    ),
}



