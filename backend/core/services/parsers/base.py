"""
Base parser interface
All log parsers must implement this interface
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime


class BaseParser(ABC):
    """
    Abstract base class for log parsers
    Ensures consistent Master CSV output format
    """
    
    @abstractmethod
    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Parse log file and return normalized events
        
        Args:
            file_path: Path to log file
            
        Returns:
            List of dicts with keys: timestamp, user, host, event_type, raw_message, line_number
        """
        pass
    
    def normalize_timestamp(self, timestamp_str: str) -> datetime:
        """
        Normalize timestamp to UTC datetime object
        Override this for custom timestamp formats
        """
        from dateutil import parser
        try:
            dt = parser.parse(timestamp_str)
            return dt
        except Exception:
            # Fallback to current time if parsing fails
            return datetime.utcnow()
    
    def validate_event(self, event: Dict[str, Any]) -> bool:
        """
        Validate that event has required Master CSV fields
        """
        required_fields = ['timestamp', 'event_type', 'raw_message', 'line_number']
        return all(field in event for field in required_fields)
