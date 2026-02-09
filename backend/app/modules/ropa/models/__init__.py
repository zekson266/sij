"""
ROPA module models.
"""

from .repository import Repository
from .activity import Activity
from .data_element import DataElement
from .department import Department
from .dpia import DPIA
from .location import Location
from .risk import Risk
from .system import System
from .ai_suggestion_job import AISuggestionJob

__all__ = [
    "Repository",
    "Activity",
    "DataElement",
    "Department",
    "DPIA",
    "Location",
    "Risk",
    "System",
    "AISuggestionJob",
]



