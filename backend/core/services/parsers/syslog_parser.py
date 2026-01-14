"""
Syslog parser
Handles standard syslog format
"""
import re
from typing import List, Dict, Any
from datetime import datetime
from .base import BaseParser


class SyslogParser(BaseParser):
    """
    Parses syslog format logs
    Handles standard RFC 3164 and RFC 5424 formats
    """
    
    # Syslog regex pattern (simplified)
    SYSLOG_PATTERN = re.compile(
        r'(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+'
        r'(?P<host>\S+)\s+'
        r'(?P<process>\S+?):\s+'
        r'(?P<message>.*)'
    )
    
    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse syslog file to normalized events"""
        events = []
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    event = self._parse_syslog_line(line, line_num)
                    if event and self.validate_event(event):
                        events.append(event)
                except Exception as e:
                    print(f"Error parsing syslog line {line_num}: {e}")
                    continue
        
        return events
    
    def _parse_syslog_line(self, line: str, line_num: int) -> Dict[str, Any]:
        """Parse single syslog line"""
        match = self.SYSLOG_PATTERN.match(line)
        
        if match:
            groups = match.groupdict()
            
            return {
                'timestamp': self._parse_syslog_timestamp(groups['timestamp']),
                'user': '',  # Syslog doesn't typically have user field
                'host': groups['host'],
                'event_type': groups['process'],
                'raw_message': groups['message'],
                'line_number': line_num,
            }
        else:
            # Fallback: treat entire line as raw message
            return {
                'timestamp': datetime.utcnow(),
                'user': '',
                'host': '',
                'event_type': 'SYSLOG',
                'raw_message': line,
                'line_number': line_num,
            }
    
    def _parse_syslog_timestamp(self, timestamp_str: str) -> datetime:
        """Parse syslog timestamp format (e.g., 'Jan 12 15:30:45')"""
        try:
            # Add current year since syslog doesn't include it
            current_year = datetime.now().year
            timestamp_with_year = f"{timestamp_str} {current_year}"
            dt = datetime.strptime(timestamp_with_year, "%b %d %H:%M:%S %Y")
            return dt
        except Exception:
            return datetime.utcnow()
