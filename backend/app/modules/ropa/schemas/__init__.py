"""
ROPA module schemas.
"""

from .repository import (
    RepositoryBase,
    RepositoryCreate,
    RepositoryUpdate,
    RepositoryResponse,
)
from .activity import (
    ActivityBase,
    ActivityCreate,
    ActivityUpdate,
    ActivityResponse,
)
from .data_element import (
    DataElementBase,
    DataElementCreate,
    DataElementUpdate,
    DataElementResponse,
)
from .department import (
    DepartmentBase,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)
from .dpia import (
    DPIABase,
    DPIACreate,
    DPIAUpdate,
    DPIAResponse,
)
from .location import (
    LocationBase,
    LocationCreate,
    LocationUpdate,
    LocationResponse,
)
from .risk import (
    RiskBase,
    RiskCreate,
    RiskUpdate,
    RiskResponse,
)
from .system import (
    SystemBase,
    SystemCreate,
    SystemUpdate,
    SystemResponse,
)

__all__ = [
    # Repository
    "RepositoryBase",
    "RepositoryCreate",
    "RepositoryUpdate",
    "RepositoryResponse",
    # Activity
    "ActivityBase",
    "ActivityCreate",
    "ActivityUpdate",
    "ActivityResponse",
    # Data Element
    "DataElementBase",
    "DataElementCreate",
    "DataElementUpdate",
    "DataElementResponse",
    # Department
    "DepartmentBase",
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentResponse",
    # DPIA
    "DPIABase",
    "DPIACreate",
    "DPIAUpdate",
    "DPIAResponse",
    # Location
    "LocationBase",
    "LocationCreate",
    "LocationUpdate",
    "LocationResponse",
    # Risk
    "RiskBase",
    "RiskCreate",
    "RiskUpdate",
    "RiskResponse",
    # System
    "SystemBase",
    "SystemCreate",
    "SystemUpdate",
    "SystemResponse",
]



