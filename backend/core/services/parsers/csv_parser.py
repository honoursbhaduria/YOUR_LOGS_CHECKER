"""
CSV log parser
Handles CSV files with intelligent automatic column mapping
Optimized for speed with pandas (falls back to standard csv if pandas unavailable)
"""
import csv
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from .base import BaseParser

# Try to import pandas for performance, fallback to standard csv
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False


class CSVParser(BaseParser):
    """
    Parses CSV log files with smart field detection
    Uses content-based analysis to work with any CSV structure
    Optimized with pandas for 10-100x faster parsing of large files
    """
    
    # IP address regex pattern (compiled once for performance)
    IP_PATTERN = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
    
    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse CSV file to normalized events with high performance"""
        if HAS_PANDAS:
            return self._parse_with_pandas(file_path)
        else:
            return self._parse_with_csv(file_path)
    
    def _parse_with_pandas(self, file_path: str) -> List[Dict[str, Any]]:
        """Fast parsing using pandas - handles large CSVs efficiently"""
        events = []
        
        try:
            # Read CSV with pandas - much faster for large files
            # Use chunksize for memory efficiency with very large files
            chunk_size = 10000
            
            for chunk_df in pd.read_csv(
                file_path,
                encoding='utf-8',
                encoding_errors='ignore',
                chunksize=chunk_size,
                dtype=str,  # Read all columns as strings
                na_filter=False,  # Don't convert empty strings to NaN
            ):
                # Process each row in the chunk
                for idx, row in chunk_df.iterrows():
                    try:
                        line_num = idx + 2  # +2 because: 1-indexed + header row
                        row_dict = row.to_dict()
                        event = self._map_csv_row(row_dict, line_num)
                        if self.validate_event(event):
                            events.append(event)
                    except Exception as e:
                        print(f"Error parsing CSV line {idx + 2}: {e}")
                        continue
        except Exception as e:
            print(f"Pandas parsing failed, falling back to standard CSV: {e}")
            return self._parse_with_csv(file_path)
        
        return events
    
    def _parse_with_csv(self, file_path: str) -> List[Dict[str, Any]]:
        """Fallback parsing using standard csv module"""
        events = []
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            # Try to detect CSV dialect, with fallback to default
            try:
                sample = f.read(8192)  # Larger sample for better detection
                f.seek(0)
                sniffer = csv.Sniffer()
                dialect = sniffer.sniff(sample, delimiters=',;\t')  # Limit to common delimiters
                f.seek(0)
            except Exception:
                # If sniffer fails, use default CSV dialect (comma-separated)
                f.seek(0)
                dialect = csv.excel
            
            reader = csv.DictReader(f, dialect=dialect)
            
            for line_num, row in enumerate(reader, start=2):  # Start at 2 (1 is header)
                try:
                    event = self._map_csv_row(row, line_num)
                    if self.validate_event(event):
                        events.append(event)
                except Exception as e:
                    # Log parsing error but continue
                    print(f"Error parsing CSV line {line_num}: {e}")
                    continue
        
        return events
    
    def _map_csv_row(self, row: Dict[str, str], line_num: int) -> Dict[str, Any]:
        """
        Map CSV row to Master CSV schema using smart field detection
        Analyzes both column names AND actual content
        Stores ALL original CSV columns in extra_data for dynamic display
        """
        from django.utils import timezone
        
        # Smart timestamp detection (content-based)
        timestamp = self._find_timestamp_smart(row)
        
        # Smart user detection
        user = self._find_user(row)
        
        # Smart host/IP detection (prioritize IP addresses)
        host = self._find_host_smart(row)
        
        # Smart event type detection
        event_type = self._find_event_type_smart(row)
        
        # Raw message is entire row as string (preserves all data for display)
        raw_message = ' | '.join([f"{k}={v}" for k, v in row.items() if v])
        
        # Store ALL CSV columns in extra_data for dynamic frontend display
        extra_data = {}
        for key, value in row.items():
            if value:  # Only store non-empty values
                # Clean column name (remove special characters for better display)
                clean_key = key.strip().replace(' ', '_').replace('.', '_').lower()
                extra_data[clean_key] = value
        
        return {
            'timestamp': timezone.make_aware(timestamp) if timezone.is_naive(timestamp) else timestamp,
            'user': user,
            'host': host,
            'event_type': event_type,
            'raw_message': raw_message,
            'line_number': line_num,
            'extra_data': extra_data,
        }
    
    def _find_timestamp_smart(self, row: Dict[str, str]) -> datetime:
        """
        Smart timestamp detection - tries parsing actual values
        Handles Apache/Nginx log formats and other common timestamp formats
        Returns timezone-aware datetime
        """
        from django.utils import timezone as django_tz
        
        timestamp_keywords = ['time', 'timestamp', 'date', 'datetime', 'created', 'logged', 'when']
        
        # First: Try columns with timestamp-related names
        for key, value in row.items():
            if any(kw in key.lower() for kw in timestamp_keywords):
                parsed = self._try_parse_timestamp(value)
                if parsed:
                    return django_tz.make_aware(parsed) if django_tz.is_naive(parsed) else parsed
        
        # Second: Try parsing ALL columns (in case timestamp column has unusual name)
        for key, value in row.items():
            parsed = self._try_parse_timestamp(value)
            if parsed:
                return django_tz.make_aware(parsed) if django_tz.is_naive(parsed) else parsed
        
        # Fallback: current time (timezone-aware)
        return django_tz.now()
    
    def _try_parse_timestamp(self, value: str) -> Optional[datetime]:
        """
        Try to parse timestamp from string value
        Supports multiple formats including Apache/Nginx logs
        """
        if not value or len(value) < 8:
            return None
        
        # Handle Apache/Nginx format: [29/Nov/2017:06:58:55 or [29/Nov/2017:06:58:55]
        if value.startswith('['):
            # Remove brackets and any timezone info
            cleaned = value.strip('[]').split()[0]  # Get just the datetime part
            try:
                # Try Apache common log format: DD/Mon/YYYY:HH:MM:SS
                return datetime.strptime(cleaned, "%d/%b/%Y:%H:%M:%S")
            except:
                pass
        
        # Try standard timestamp parsing using dateutil
        try:
            return self.normalize_timestamp(value)
        except:
            return None
    
    def _find_user(self, row: Dict[str, str]) -> str:
        """Find user field using keyword matching"""
        user_keywords = ['user', 'username', 'account', 'actor', 'identity', 'login']
        
        for key, value in row.items():
            if any(kw in key.lower() for kw in user_keywords):
                return value or ''
        return ''
    
    def _find_host_smart(self, row: Dict[str, str]) -> str:
        """
        Smart host detection - prioritizes IP addresses over hostnames
        """
        # Priority 1: Look for IP address columns (by name)
        ip_keywords = ['ip', 'src_ip', 'source_ip', 'dest_ip', 'destination_ip', 'client_ip', 'remote_ip']
        for key, value in row.items():
            if any(kw in key.lower() for kw in ip_keywords):
                if value and self._is_ip_address(value):
                    return value
        
        # Priority 2: Look for any column containing an IP address (content-based)
        for key, value in row.items():
            if value and self._is_ip_address(value):
                return value
        
        # Priority 3: Look for hostname-like columns
        host_keywords = ['host', 'hostname', 'computer', 'source', 'server', 'machine']
        for key, value in row.items():
            if any(kw in key.lower() for kw in host_keywords):
                return value or ''
        
        return ''
    
    def _is_ip_address(self, value: str) -> bool:
        """Check if value looks like an IP address"""
        if not value:
            return False
        return bool(self.IP_PATTERN.search(value))
    
    def _find_event_type_smart(self, row: Dict[str, str]) -> str:
        """
        Smart event type detection
        Looks for action/event columns, then URLs, then event IDs
        """
        # Priority 1: Action/Event columns
        action_keywords = ['action', 'event_type', 'event', 'activity', 'operation', 'method']
        for key, value in row.items():
            if any(kw in key.lower() for kw in action_keywords):
                return value or ''
        
        # Priority 2: URL/Request columns (for web logs)
        url_keywords = ['url', 'request', 'uri', 'path']
        for key, value in row.items():
            if any(kw in key.lower() for kw in url_keywords):
                if value:
                    # Extract HTTP method from URL if present (e.g., "GET /login.php")
                    parts = value.split()
                    if parts:
                        return parts[0]  # Return first part (method or path)
        
        # Priority 3: Event ID columns
        id_keywords = ['event_id', 'eventid', 'id', 'code']
        for key, value in row.items():
            if any(kw in key.lower() for kw in id_keywords):
                return value or ''
        
        # Fallback: use first non-empty column value
        for value in row.values():
            if value:
                return value
        
        return 'UNKNOWN'
