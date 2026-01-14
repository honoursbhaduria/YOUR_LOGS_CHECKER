"""
CSV log parser
Handles CSV files with automatic column mapping
"""
import csv
from typing import List, Dict, Any
from datetime import datetime
from .base import BaseParser


class CSVParser(BaseParser):
    """
    Parses CSV log files
    Attempts to auto-map columns to Master CSV schema
    """
    
    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse CSV file to normalized events"""
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
        Map CSV row to Master CSV schema
        Uses heuristics to find timestamp, user, host, event_type
        """
        # Try to find timestamp column
        timestamp = self._find_timestamp(row)
        
        # Try to find user column
        user = self._find_field(row, ['user', 'username', 'account', 'actor'])
        
        # Try to find host column
        host = self._find_field(row, ['host', 'hostname', 'computer', 'source', 'ip'])
        
        # Try to find event type column
        event_type = self._find_field(row, ['event', 'event_type', 'action', 'activity', 'event_id'])
        
        # Fallback: use first column as event_type if not found
        if not event_type:
            event_type = list(row.values())[0] if row else 'UNKNOWN'
        
        # Raw message is entire row as string
        raw_message = ' | '.join([f"{k}={v}" for k, v in row.items()])
        
        return {
            'timestamp': timestamp,
            'user': user,
            'host': host,
            'event_type': event_type,
            'raw_message': raw_message,
            'line_number': line_num,
        }
    
    def _find_timestamp(self, row: Dict[str, str]) -> datetime:
        """Find and parse timestamp from CSV row"""
        timestamp_keywords = ['time', 'timestamp', 'date', 'datetime', 'created', 'logged']
        
        for key, value in row.items():
            if any(kw in key.lower() for kw in timestamp_keywords):
                try:
                    return self.normalize_timestamp(value)
                except:
                    continue
        
        # Fallback: current time
        return datetime.utcnow()
    
    def _find_field(self, row: Dict[str, str], keywords: List[str]) -> str:
        """Find field value by matching keywords in column names"""
        for key, value in row.items():
            if any(kw in key.lower() for kw in keywords):
                return value or ''
        return ''
