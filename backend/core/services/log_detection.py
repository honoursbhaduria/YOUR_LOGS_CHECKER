"""
Log type detection service
Auto-detects CSV, Syslog, EVTX, JSON formats
"""
import os
from typing import Optional


def detect_log_type(file_path: str, filename: str) -> str:
    """
    Detect log file type based on extension and content
    
    Args:
        file_path: Path to file
        filename: Original filename
        
    Returns:
        Log type string: CSV, SYSLOG, EVTX, JSON, or UNKNOWN
    """
    # Check extension first
    extension = os.path.splitext(filename)[1].lower()
    
    if extension == '.csv':
        return 'CSV'
    elif extension == '.evtx':
        return 'EVTX'
    elif extension == '.json':
        return 'JSON'
    elif extension in ['.log', '.txt']:
        # Try to detect access log format first
        if _is_access_log_format(file_path):
            return 'ACCESS_LOG'
        # Try to detect syslog format
        if _is_syslog_format(file_path):
            return 'SYSLOG'
    
    # Fallback: Try to parse as CSV
    if _is_csv_format(file_path):
        return 'CSV'
    
    return 'UNKNOWN'


def _is_csv_format(file_path: str) -> bool:
    """Check if file looks like CSV"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            first_line = f.readline()
            # Simple heuristic: contains commas and no weird characters
            return ',' in first_line and first_line.count(',') >= 2
    except Exception:
        return False


def _is_syslog_format(file_path: str) -> bool:
    """Check if file looks like syslog"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            first_line = f.readline()
            # Syslog typically starts with date/time pattern
            # Simple heuristic: look for common syslog patterns
            syslog_indicators = ['<', '>', 'kernel:', 'syslog', 'daemon']
            return any(indicator in first_line.lower() for indicator in syslog_indicators)
    except Exception:
        return False


def _is_access_log_format(file_path: str) -> bool:
    """Check if file looks like Apache/Nginx access log"""
    import re
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            first_line = f.readline()
            # Access logs typically have IP, timestamp in brackets, HTTP method
            # Pattern: IP - user [timestamp] "METHOD /path HTTP/x.x" status size
            access_pattern = re.compile(
                r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s+.*\[.*\]\s+"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)'
            )
            return bool(access_pattern.match(first_line))
    except Exception:
        return False
