# ROPA Database Structure with Allowed Values

This document provides a complete reference for the ROPA (Record of Processing Activities) database structure, including all tables, fields, data types, constraints, and allowed values.

## Table of Contents

1. [Repositories](#repositories)
2. [Locations](#locations)
3. [Activities](#activities)
4. [Data Elements](#data-elements)
5. [DPIAs](#dpias)
6. [Risks](#risks)
7. [Enums Reference](#enums-reference)

---

## Repositories

**Table:** `ropa_repositories`

### Fields

| Field | Type | Nullable | Indexed | Description | Allowed Values |
|-------|------|----------|---------|-------------|----------------|
| `id` | UUID | NO | YES | Primary key | Auto-generated |
| `tenant_id` | UUID | NO | YES | Foreign key to tenants | - |
| `data_repository_name` | VARCHAR(255) | NO | YES | Repository name | Free text |
| `data_repository_description` | TEXT | YES | NO | Repository description | Free text |
| `external_vendor` | VARCHAR(255) | YES | NO | Vendor/provider | Free text |
| `business_owner` | UUID | YES | YES | FK to `ropa_departments` | - |
| `data_format` | VARCHAR | YES | NO | Data format | See [DataFormat](#dataformat) |
| `geographical_location_ids` | JSONB | YES | NO | Region IDs (UUID array) | `ropa_locations` (type=region) |
| `access_location_ids` | JSONB | YES | NO | Country IDs (UUID array) | `ropa_locations` (type=country) |
| `transfer_mechanism` | VARCHAR | YES | NO | Cross-border mechanism | See [TransferMechanism](#transfermechanism) |
| `derogation_type` | VARCHAR | YES | NO | Derogation type | See [DerogationType](#derogationtype) |
| `cross_border_safeguards` | VARCHAR | YES | NO | Safeguards | See [CrossBorderSafeguards](#crossbordersafeguards) |
| `cross_border_transfer_detail` | VARCHAR(255) | YES | NO | Transfer details | Free text |
| `gdpr_compliant` | BOOLEAN | NO | YES | GDPR compliant flag | true/false (default: false) |
| `dpa_url` | VARCHAR(500) | YES | NO | DPA URL/reference | URL or text |
| `dpa_file` | VARCHAR(500) | YES | NO | DPA file path | Deferred |
| `vendor_gdpr_compliance` | BOOLEAN | YES | NO | Vendor GDPR compliance | true/false |
| `certification` | VARCHAR | YES | NO | Certification | See [Certification](#certification) |
| `record_count` | INTEGER | YES | NO | Record count | >= 0 |
| `system_interfaces` | JSONB | YES | NO | System IDs (UUID array) | `ropa_systems` |
| `interface_type` | VARCHAR | YES | NO | Interface type | See [InterfaceType](#interfacetype) |
| `interface_location_ids` | JSONB | YES | NO | Interface region IDs | `ropa_locations` (type=region) |
| `data_recipients` | VARCHAR(255) | YES | NO | Data recipients | Free text |
| `sub_processors` | VARCHAR(255) | YES | NO | Sub-processors | Free text |
| `status` | VARCHAR | NO | YES | Operational status | See [RepositoryStatus](#repositorystatus) |
| `comments` | JSONB | YES | NO | Comments | Array of strings |
| `created_at` | DATETIME | NO | NO | Creation timestamp | Auto-generated |
| `updated_at` | DATETIME | NO | NO | Update timestamp | Auto-updated |

### Relationships

- **One-to-Many:** `activities` → Multiple `Activity` records

---

## Locations

**Table:** `ropa_locations`

### Fields

| Field | Type | Nullable | Indexed | Description | Allowed Values |
|-------|------|----------|---------|-------------|----------------|
| `id` | UUID | NO | YES | Primary key | Auto-generated |
| `name` | VARCHAR(255) | NO | YES | Location name | Free text |
| `type` | VARCHAR | NO | YES | Location type | `region` or `country` |
| `country_code` | VARCHAR(10) | YES | NO | ISO country code | ISO 3166-1 alpha-2 |
| `region` | VARCHAR(100) | YES | NO | Region label | e.g., "EU", "APAC" |
| `parent_id` | UUID | YES | YES | Parent location | Region ID for countries |
| `created_at` | DATETIME | NO | NO | Creation timestamp | Auto-generated |
| `updated_at` | DATETIME | NO | NO | Update timestamp | Auto-updated |

### Relationships

- **Self-referencing:** `parent_id` → `ropa_locations.id`

---

## Activities

**Table:** `ropa_activities`

### Fields

| Field | Type | Nullable | Indexed | Description | Allowed Values |
|-------|------|----------|---------|-------------|----------------|
| `id` | UUID | NO | YES | Primary key | Auto-generated |
| `repository_id` | UUID | NO | YES | Foreign key to repositories | - |
| `name` | VARCHAR(255) | NO | YES | Activity name | Free text |
| `description` | TEXT | YES | NO | Activity description | Free text |
| `purpose` | VARCHAR(255) | YES | NO | Purpose of processing | Free text |
| `legal_basis` | VARCHAR(100) | YES | NO | Legal basis for processing | Free text (e.g., "Consent", "Contract", "Legal obligation", "Legitimate interests", "Vital interests", "Public task") |
| `business_function` | VARCHAR(255) | YES | NO | Business function/domain | Free text |
| `processing_owner` | VARCHAR(255) | YES | NO | Owner/responsible person | Free text |
| `processing_status` | VARCHAR(50) | YES | YES | Processing status | Free text (e.g., "active", "inactive", "archived") |
| `processing_operations` | TEXT | YES | NO | Processing operations description | Free text |
| `processing_systems` | TEXT | YES | NO | Systems used for processing | Free text |
| `processing_locations` | TEXT | YES | NO | Geographic locations | Free text |
| `degree_of_automation` | VARCHAR(50) | YES | NO | Level of automation | Free text (e.g., "fully_automated", "semi_automated", "manual") |
| `use_of_profiling` | BOOLEAN | NO | NO | Profiling flag | true/false (default: false) |
| `storage_system` | VARCHAR(255) | YES | NO | Storage system reference | Free text |
| `data_format` | VARCHAR(100) | YES | NO | Data format | Free text (e.g., "structured", "unstructured", "semi-structured") |
| `retention_period` | VARCHAR(100) | YES | NO | Retention period | Free text (e.g., "7 years", "indefinite") |
| `deletion_method` | VARCHAR(100) | YES | NO | Deletion method | Free text |
| `internal_access_roles` | JSONB | YES | NO | Internal roles with access | Array of strings/objects |
| `external_recipients` | JSONB | YES | NO | External recipients/categories | Array of strings/objects |
| `international_transfer` | BOOLEAN | NO | YES | International transfer flag | true/false (default: false) |
| `created_at` | DATETIME | NO | NO | Creation timestamp | Auto-generated |
| `updated_at` | DATETIME | NO | NO | Update timestamp | Auto-updated |

### Relationships

- **Many-to-One:** `repository` → One `Repository` record
- **One-to-Many:** `data_elements` → Multiple `DataElement` records
- **One-to-Many:** `dpias` → Multiple `DPIA` records

---

## Data Elements

**Table:** `ropa_data_elements`

### Fields

| Field | Type | Nullable | Indexed | Description | Allowed Values |
|-------|------|----------|---------|-------------|----------------|
| `id` | UUID | NO | YES | Primary key | Auto-generated |
| `activity_id` | UUID | NO | YES | Foreign key to activities | - |
| `name` | VARCHAR(255) | NO | YES | Data element name | Free text |
| `description` | TEXT | YES | NO | Data element description | Free text |
| `category` | VARCHAR(100) | YES | NO | Data category | Free text (e.g., "Contact data", "Identity data", "Financial data", "Behavioral data", "Location data", "Health data") |
| `data_subject_category` | VARCHAR(100) | YES | NO | Data subject category | Free text (e.g., "Customer", "Employee", "Visitor", "Prospect", "Vendor", "Minor") |
| `is_personal_data` | BOOLEAN | NO | YES | Personal data flag | true/false (default: true) |
| `is_special_category_data` | BOOLEAN | NO | YES | Special category data flag (GDPR Article 9) | true/false (default: false) |
| `is_children_data` | BOOLEAN | NO | YES | Children data flag | true/false (default: false) |
| `data_source` | VARCHAR(255) | YES | NO | Source of data | Free text (e.g., "Direct from user", "Third party", "Public source", "Automated collection") |
| `collection_method` | VARCHAR(100) | YES | NO | Collection method | Free text (e.g., "Form submission", "API", "Import", "Cookie tracking", "Manual entry") |
| `collection_frequency` | VARCHAR(50) | YES | NO | Collection frequency | Free text (e.g., "One-time", "Daily", "Real-time", "On-demand", "Continuous") |
| `approximate_data_subject_volume` | VARCHAR(100) | YES | NO | Approximate data subject volume | Free text (e.g., "1000-5000", "10000+") |
| `created_at` | DATETIME | NO | NO | Creation timestamp | Auto-generated |
| `updated_at` | DATETIME | NO | NO | Update timestamp | Auto-updated |

### Relationships

- **Many-to-One:** `activity` → One `Activity` record

---

## DPIAs

**Table:** `ropa_dpias`

### Fields

| Field | Type | Nullable | Indexed | Description | Allowed Values |
|-------|------|----------|---------|-------------|----------------|
| `id` | UUID | NO | YES | Primary key | Auto-generated |
| `activity_id` | UUID | NO | YES | Foreign key to activities | - |
| `title` | VARCHAR(255) | NO | YES | DPIA title | Free text |
| `description` | TEXT | YES | NO | DPIA description | Free text |
| `status` | VARCHAR(50) | NO | YES | DPIA status | "draft", "in_review", "approved", "rejected" (default: "draft") |
| `necessity_proportionality_assessment` | TEXT | YES | NO | Necessity and proportionality assessment | Free text |
| `assessor` | VARCHAR(255) | YES | NO | Person who conducted assessment | Free text |
| `assessment_date` | DATETIME | YES | NO | Assessment completion date | Date/time |
| `dpo_consultation_required` | BOOLEAN | NO | YES | DPO consultation required | true/false (default: false) |
| `dpo_consultation_date` | DATETIME | YES | NO | DPO consultation date | Date/time |
| `supervisory_authority_consultation_required` | BOOLEAN | NO | YES | Supervisory authority consultation required | true/false (default: false) |
| `supervisory_authority_consultation_date` | DATETIME | YES | NO | Supervisory authority consultation date | Date/time |
| `created_at` | DATETIME | NO | NO | Creation timestamp | Auto-generated |
| `updated_at` | DATETIME | NO | NO | Update timestamp | Auto-updated |

### Relationships

- **Many-to-One:** `activity` → One `Activity` record
- **One-to-Many:** `risks` → Multiple `Risk` records

---

## Risks

**Table:** `ropa_risks`

### Fields

| Field | Type | Nullable | Indexed | Description | Allowed Values |
|-------|------|----------|---------|-------------|----------------|
| `id` | UUID | NO | YES | Primary key | Auto-generated |
| `dpia_id` | UUID | NO | YES | Foreign key to dpias | - |
| `title` | VARCHAR(255) | NO | YES | Risk title | Free text |
| `description` | TEXT | YES | NO | Risk description | Free text |
| `severity` | VARCHAR(50) | YES | YES | Inherent risk severity | "low", "medium", "high", "critical" |
| `likelihood` | VARCHAR(50) | YES | NO | Inherent risk likelihood | "low", "medium", "high" |
| `residual_severity` | VARCHAR(50) | YES | NO | Residual severity after mitigation | "low", "medium", "high", "critical" |
| `residual_likelihood` | VARCHAR(50) | YES | NO | Residual likelihood after mitigation | "low", "medium", "high" |
| `mitigation` | TEXT | YES | NO | Mitigation measures | Free text |
| `risk_owner` | VARCHAR(255) | YES | NO | Person responsible for risk | Free text |
| `risk_status` | VARCHAR(50) | YES | YES | Risk status | "open", "mitigated", "accepted", "closed" |
| `created_at` | DATETIME | NO | NO | Creation timestamp | Auto-generated |
| `updated_at` | DATETIME | NO | NO | Update timestamp | Auto-updated |

### Relationships

- **Many-to-One:** `dpia` → One `DPIA` record

---

## Enums Reference

### RepositoryType

| Value | Description |
|-------|-------------|
| `database` | Relational or NoSQL database systems (PostgreSQL, MySQL, MongoDB, etc.) |
| `cloud_storage` | Object storage services (AWS S3, Azure Blob, Google Cloud Storage) |
| `file_system` | Traditional file system storage (local or network-attached) |
| `data_warehouse` | Large-scale analytical data storage (Snowflake, Redshift, BigQuery) |
| `backup_storage` | Dedicated storage for backups and disaster recovery |
| `archive` | Long-term archival storage for compliance or historical data |

### RepositoryStatus

| Value | Description |
|-------|-------------|
| `active` | Repository is currently in use and operational |
| `archived` | Repository is archived but data is still accessible |
| `decommissioned` | Repository has been permanently shut down |
| `maintenance` | Repository is temporarily unavailable for maintenance |

### StorageType

| Value | Description |
|-------|-------------|
| `relational_db` | SQL-based relational database (PostgreSQL, MySQL, SQL Server, Oracle) |
| `nosql` | Non-relational database (MongoDB, Cassandra, DynamoDB, CouchDB) |
| `object_storage` | Object-based storage (S3, Blob Storage, Cloud Storage) |
| `file_storage` | Traditional file system storage (NFS, CIFS, local filesystem) |
| `block_storage` | Block-level storage (SAN, EBS, Azure Disk) |

### Environment

| Value | Description |
|-------|-------------|
| `production` | Live production environment serving real users |
| `staging` | Pre-production environment for final testing |
| `development` | Development environment for active development work |
| `test` | Testing environment for automated or manual testing |

### AccessControlMethod

| Value | Description |
|-------|-------------|
| `rbac` | Role-Based Access Control - Access control based on user roles |
| `abac` | Attribute-Based Access Control - Access control based on user attributes and context |
| `ip_whitelist` | IP Whitelist - Access restricted to specific IP addresses or ranges |
| `vpn` | VPN - Access through Virtual Private Network |
| `certificate` | Certificate-Based - Access control using client certificates |
| `api_key` | API Key - Access control using API keys |
| `other` | Other - Other access control method not listed |

### AuthenticationMethod

| Value | Description |
|-------|-------------|
| `mfa` | Multi-Factor Authentication - Authentication requiring multiple factors (password + token) |
| `sso` | Single Sign-On - Centralized authentication (SAML, OAuth, LDAP) |
| `password` | Password - Traditional username/password authentication |
| `api_key` | API Key - Authentication using API keys |
| `certificate` | Certificate - Certificate-based authentication |
| `oauth` | OAuth - OAuth-based authentication |
| `other` | Other - Other authentication method not listed |

### BackupFrequency

| Value | Description |
|-------|-------------|
| `continuous` | Continuous - Continuous backup or replication |
| `hourly` | Hourly - Backups performed every hour |
| `daily` | Daily - Backups performed once per day |
| `weekly` | Weekly - Backups performed once per week |
| `monthly` | Monthly - Backups performed once per month |
| `on_demand` | On Demand - Backups performed manually when needed |
| `none` | None - No automated backups configured |

### DeletionMethod

| Value | Description |
|-------|-------------|
| `automated` | Automated - Data is automatically deleted based on retention policy |
| `manual` | Manual - Data is deleted manually by administrators |
| `scheduled` | Scheduled - Data deletion is scheduled but requires approval |
| `on_demand` | On Demand - Data is deleted on-demand when requested |
| `none` | None - No deletion method configured |

### DPIA Status

| Value | Description |
|-------|-------------|
| `draft` | Draft - DPIA is in draft status (default) |
| `in_review` | In Review - DPIA is under review |
| `approved` | Approved - DPIA has been approved |
| `rejected` | Rejected - DPIA has been rejected |

### Risk Severity

| Value | Description |
|-------|-------------|
| `low` | Low - Low severity risk |
| `medium` | Medium - Medium severity risk |
| `high` | High - High severity risk |
| `critical` | Critical - Critical severity risk |

### Risk Likelihood

| Value | Description |
|-------|-------------|
| `low` | Low - Low likelihood of occurrence |
| `medium` | Medium - Medium likelihood of occurrence |
| `high` | High - High likelihood of occurrence |

### Risk Status

| Value | Description |
|-------|-------------|
| `open` | Open - Risk is open and being managed |
| `mitigated` | Mitigated - Risk has been mitigated |
| `accepted` | Accepted - Risk has been accepted |
| `closed` | Closed - Risk has been closed |

---

## Notes

1. **UUID Fields:** All primary keys and foreign keys use UUID type (PostgreSQL UUID).

2. **JSONB Fields:** The following fields use JSONB (PostgreSQL JSON Binary) for flexible array/object storage:
   - `secondary_countries` (Repository)
   - `compliance_certifications` (Repository)
   - `tags` (Repository)
   - `internal_access_roles` (Activity)
   - `external_recipients` (Activity)

3. **Timestamps:** All tables include `created_at` and `updated_at` timestamps that are automatically managed.

4. **Cascade Deletes:** 
   - Deleting a Repository cascades to its Activities
   - Deleting an Activity cascades to its Data Elements and DPIAs
   - Deleting a DPIA cascades to its Risks

5. **Free Text Fields:** Many fields are free text (VARCHAR/TEXT) without strict enum constraints. The allowed values listed are common examples or recommendations, not exhaustive lists.

6. **Boolean Defaults:** Most boolean fields default to `false` except:
   - `is_personal_data` (DataElement) defaults to `true`
   - `is_production` (Repository) defaults to `true`
   - `status` (Repository) defaults to `active`
   - `status` (DPIA) defaults to `draft`
