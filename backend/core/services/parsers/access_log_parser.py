"""
Access Log Parser - Flexible & Large File Support
Handles Apache/Nginx logs with ANY fields and large files efficiently
"""
import re
import os
from typing import List, Dict, Any, Optional, Generator
from datetime import datetime
from .base import BaseParser


class AccessLogParser(BaseParser):
    """
    Flexible access log parser that handles:
    - Any access log format (Common, Combined, Custom)
    - Large files (streaming/chunked processing)
    - Auto-detects fields from log structure
    """
    
    # Multiple format patterns (tried in order)
    PATTERNS = [
        # Combined Log Format (most common)
        re.compile(
            r'(?P<ip>\S+)\s+'
            r'(?P<ident>\S+)\s+'
            r'(?P<user>\S+)\s+'
            r'\[(?P<timestamp>[^\]]+)\]\s+'
            r'"(?P<method>\S+)\s+(?P<path>\S+)\s*(?P<protocol>[^"]*)"\s+'
            r'(?P<status>\d+)\s+'
            r'(?P<size>\S+)'
            r'(?:\s+"(?P<referer>[^"]*)")?'
            r'(?:\s+"(?P<user_agent>[^"]*)")?'
            r'(?:\s+(?P<extra>.*))?'
        ),
        # Common Log Format
        re.compile(
            r'(?P<ip>\S+)\s+'
            r'(?P<ident>\S+)\s+'
            r'(?P<user>\S+)\s+'
            r'\[(?P<timestamp>[^\]]+)\]\s+'
            r'"(?P<method>\S+)\s+(?P<path>\S+)\s*(?P<protocol>[^"]*)"\s+'
            r'(?P<status>\d+)\s+'
            r'(?P<size>\S+)'
        ),
        # Nginx default format
        re.compile(
            r'(?P<ip>\S+)\s+-\s+'
            r'(?P<user>\S+)\s+'
            r'\[(?P<timestamp>[^\]]+)\]\s+'
            r'"(?P<request>[^"]+)"\s+'
            r'(?P<status>\d+)\s+'
            r'(?P<size>\S+)\s+'
            r'"(?P<referer>[^"]*)"\s+'
            r'"(?P<user_agent>[^"]*)"'
            r'(?:\s+(?P<extra>.*))?'
        ),
        # Simple space-delimited format
        re.compile(
            r'(?P<ip>\S+)\s+.*\[(?P<timestamp>[^\]]+)\]\s+'
            r'"(?P<request>[^"]+)"\s+'
            r'(?P<status>\d+)'
        ),
        # JSON-like log format
        re.compile(
            r'\{[^}]*"(?:ip|remote_addr|client_ip)":\s*"(?P<ip>[^"]+)".*'
            r'"(?:timestamp|time|@timestamp)":\s*"(?P<timestamp>[^"]+)".*'
            r'"(?:status|status_code|response_code)":\s*(?P<status>\d+)'
        ),
    ]
    
    # Timestamp patterns to try
    TIMESTAMP_PATTERNS = [
        "%d/%b/%Y:%H:%M:%S %z",      # Apache: 07/Feb/2026:10:15:32 +0000
        "%d/%b/%Y:%H:%M:%S",          # Apache without TZ
        "%Y-%m-%dT%H:%M:%S.%fZ",      # ISO 8601 with microseconds
        "%Y-%m-%dT%H:%M:%SZ",         # ISO 8601
        "%Y-%m-%d %H:%M:%S",          # Standard datetime
        "%b %d %H:%M:%S",             # Syslog style
        "%d-%b-%Y %H:%M:%S",          # Custom
        "%Y/%m/%d %H:%M:%S",          # Alternative
    ]
    
    # Chunk size for large file processing (64KB)
    CHUNK_SIZE = 65536
    
    # Maximum events to hold in memory before yielding
    BATCH_SIZE = 10000
    
    def __init__(self):
        super().__init__()
        self._detected_pattern = None
        self._detected_timestamp_format = None
        
        # Performance optimization: precompile patterns for event type detection
        self._attack_patterns_compiled = [
            (re.compile(r'\.\./', re.IGNORECASE), 'PATH_TRAVERSAL_ATTEMPT'),
            (re.compile(r'etc/passwd', re.IGNORECASE), 'PATH_TRAVERSAL_ATTEMPT'),
            (re.compile(r"'", re.IGNORECASE), 'SQL_INJECTION_ATTEMPT'),
            (re.compile(r"or\s+'1'\s*=\s*'1", re.IGNORECASE), 'SQL_INJECTION_ATTEMPT'),
            (re.compile(r'union\s+select', re.IGNORECASE), 'SQL_INJECTION_ATTEMPT'),
            (re.compile(r'--', re.IGNORECASE), 'SQL_INJECTION_ATTEMPT'),
            (re.compile(r'<script', re.IGNORECASE), 'XSS_ATTEMPT'),
            (re.compile(r'javascript:', re.IGNORECASE), 'XSS_ATTEMPT'),
            (re.compile(r'cmd=', re.IGNORECASE), 'COMMAND_INJECTION_ATTEMPT'),
            (re.compile(r'exec\(', re.IGNORECASE), 'COMMAND_INJECTION_ATTEMPT'),
            (re.compile(r'\.php\?', re.IGNORECASE), 'PHP_INJECTION_ATTEMPT'),
        ]
        
        # Pre-compile other patterns for faster matching
        self._scanner_pattern = re.compile(r'(sqlmap|nikto|nmap|masscan|burp|zap|acunetix|nessus)', re.IGNORECASE)
        self._auth_paths_pattern = re.compile(r'/(login|signin|auth|authenticate|session)', re.IGNORECASE)
        self._admin_paths_pattern = re.compile(r'/(admin|dashboard)', re.IGNORECASE)
        self._file_extensions_pattern = re.compile(r'\.(pdf|xlsx|doc|csv|zip|tar|gz)$', re.IGNORECASE)
        self._user_modification_pattern = re.compile(r'/(user|account|profile)', re.IGNORECASE)
    
    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse access log file - handles large files efficiently"""
        file_size = os.path.getsize(file_path)
        
        # For very large files (>100MB), use streaming
        if file_size > 100 * 1024 * 1024:
            print(f"Large file detected ({file_size / 1024 / 1024:.1f}MB), using streaming parser...")
            return list(self.parse_streaming(file_path))
        
        events = []
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            # Auto-detect format from first few lines
            self._detect_format(f)
            f.seek(0)
            
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line or line.startswith('#'):  # Skip empty/comments
                    continue
                
                try:
                    event = self._parse_line(line, line_num)
                    if event and self.validate_event(event):
                        events.append(event)
                except Exception as e:
                    if line_num <= 5:  # Only warn on first few errors
                        print(f"Warning: Error parsing line {line_num}: {e}")
                    continue
                
                # Progress indicator for large files
                if line_num % 100000 == 0:
                    print(f"  Processed {line_num:,} lines...")
        
        return events
    
    def parse_streaming(self, file_path: str) -> Generator[Dict[str, Any], None, None]:
        """Stream parse for very large files - yields events as generator"""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            # Auto-detect format
            self._detect_format(f)
            f.seek(0)
            
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                try:
                    event = self._parse_line(line, line_num)
                    if event and self.validate_event(event):
                        yield event
                except Exception:
                    continue
    
    def _detect_format(self, file_handle) -> None:
        """Auto-detect log format from first few lines"""
        sample_lines = []
        for _ in range(10):
            line = file_handle.readline()
            if line and not line.startswith('#'):
                sample_lines.append(line.strip())
        
        if not sample_lines:
            return
        
        # Try each pattern on sample lines
        for pattern in self.PATTERNS:
            matches = sum(1 for line in sample_lines if pattern.match(line))
            if matches >= len(sample_lines) * 0.5:  # 50% match threshold
                self._detected_pattern = pattern
                break
        
        # Detect timestamp format
        for line in sample_lines:
            if self._detected_pattern:
                match = self._detected_pattern.match(line)
                if match and match.group('timestamp'):
                    ts_str = match.group('timestamp')
                    for fmt in self.TIMESTAMP_PATTERNS:
                        try:
                            # Handle timezone
                            ts_clean = ts_str.split()[0] if ' ' in ts_str and '+' not in fmt else ts_str
                            datetime.strptime(ts_clean, fmt.replace(' %z', ''))
                            self._detected_timestamp_format = fmt
                            break
                        except ValueError:
                            continue
                    break
    
    def _parse_line(self, line: str, line_num: int) -> Optional[Dict[str, Any]]:
        """Parse a single log line with flexible field handling"""
        match = None
        
        # Try detected pattern first, then others
        patterns_to_try = [self._detected_pattern] if self._detected_pattern else []
        patterns_to_try.extend(p for p in self.PATTERNS if p != self._detected_pattern)
        
        for pattern in patterns_to_try:
            if pattern:
                match = pattern.match(line)
                if match:
                    break
        
        if match:
            return self._build_event_from_match(match, line, line_num)
        else:
            # Fallback: flexible field extraction
            return self._flexible_parse(line, line_num)
    
    def _build_event_from_match(self, match: re.Match, line: str, line_num: int) -> Dict[str, Any]:
        """Build event dict from regex match"""
        groups = match.groupdict()
        
        # Handle request field (nginx style)
        if 'request' in groups and groups['request']:
            request_parts = groups['request'].split()
            if len(request_parts) >= 2:
                groups['method'] = request_parts[0]
                groups['path'] = request_parts[1]
                groups['protocol'] = request_parts[2] if len(request_parts) > 2 else ''
        
        # Extract core fields with defaults
        ip = groups.get('ip', '')
        user = groups.get('user', '-')
        user = user if user != '-' else ''
        timestamp_str = groups.get('timestamp', '')
        method = groups.get('method', 'GET')
        path = groups.get('path', '/')
        status = int(groups.get('status', 0)) if groups.get('status', '').isdigit() else 0
        size = groups.get('size', '0')
        size = int(size) if size.isdigit() else 0
        referer = groups.get('referer', '')
        user_agent = groups.get('user_agent', '')
        
        # Parse extra fields if present
        extra_fields = {}
        if groups.get('extra'):
            extra_fields = self._parse_extra_fields(groups['extra'])
        
        event_type = self._determine_event_type(method, path, status, user_agent)
        
        # Build comprehensive raw_message with all important details
        raw_parts = [f"{method} {path}"]
        if status:
            raw_parts.append(f"Status:{status}")
        if size:
            raw_parts.append(f"Size:{size}")
        if user_agent and user_agent != '-':
            raw_parts.append(f"UA:{user_agent[:50]}")
        if referer and referer != '-':
            raw_parts.append(f"Ref:{referer[:50]}")
        
        # Store ALL additional fields in extra_data for dynamic display
        extra_data = {
            'method': method,
            'path': path,
            'status_code': status,
            'response_size': size,
            'user_agent': user_agent,
            'referer': referer,
            'protocol': protocol,
        }
        # Add any extra fields from log
        extra_data.update(extra_fields)
        
        # Only include fields that ParsedEvent model accepts (6 core + extra_data)
        event = {
            'timestamp': self._parse_timestamp(timestamp_str),
            'user': user,
            'host': ip,
            'event_type': event_type,
            'raw_message': ' | '.join(raw_parts),
            'line_number': line_num,
            'extra_data': extra_data,
        }
        
        return event
    
    def _flexible_parse(self, line: str, line_num: int) -> Dict[str, Any]:
        """Flexible parsing for ANY log format - extracts fields dynamically"""
        from django.utils import timezone
        
        # Temporary storage for extracted data
        extracted = {
            'timestamp': timezone.now(),
            'user': '',
            'host': '',
            'event_type': 'LOG_ENTRY',
            'raw_message': line,
            'line_number': line_num,
            'method': '',
            'path': '',
            'status_code': 0,
            'user_agent': '',
            'referer': '',
            'is_web_log': False,
        }
        
        # 1. Try to extract IP address (IPv4 or IPv6)
        ip_match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})', line)
        if ip_match:
            extracted['host'] = ip_match.group(1)
        
        # 2. Try to extract timestamp in brackets or quotes
        ts_match = re.search(r'[\[\(]([^\]\)]+)[\]\)]', line)
        if ts_match:
            ts_str = ts_match.group(1)
            # Check if it looks like a timestamp (has numbers and possibly colons)
            if re.search(r'\d{1,4}[:/\-]\d{1,2}[:/\-]\d{1,4}|\d{2}:\d{2}:\d{2}', ts_str):
                extracted['timestamp'] = self._parse_timestamp(ts_str)
        else:
            # Try to find ISO 8601 timestamp
            iso_match = re.search(r'\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?', line)
            if iso_match:
                extracted['timestamp'] = self._parse_timestamp(iso_match.group(0))
        
        # 3. Try to extract HTTP method and path (if web log)
        http_match = re.search(r'"?(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT|TRACE)\s+([^"\s]+)', line, re.IGNORECASE)
        if http_match:
            extracted['method'] = http_match.group(1).upper()
            extracted['path'] = http_match.group(2)
            extracted['is_web_log'] = True
        
        # 4. Try to extract HTTP status code (if web log)
        status_match = re.search(r'["\s](\d{3})[\s"]', line)
        if status_match:
            extracted['status_code'] = int(status_match.group(1))
            extracted['is_web_log'] = True
        
        # 5. Extract all key=value or key: value pairs dynamically
        # This makes it work for ANY log format with structured fields
        kv_patterns = [
            re.findall(r'(\w+)=("[^"]*"|\S+)', line),  # key=value or key="value"
            re.findall(r'(\w+):\s*("[^"]*"|[^,\s]+)', line),  # key: value or key:"value"
        ]
        
        for kv_pairs in kv_patterns:
            for key, value in kv_pairs:
                value = value.strip('"\'')
                key_lower = key.lower()
                
                # Map common field names to standard fields
                if key_lower in ['user', 'username', 'user_id', 'userid', 'uid']:
                    extracted['user'] = value
                elif key_lower in ['ip', 'client_ip', 'remote_addr', 'src_ip', 'source_ip', 'clientip']:
                    extracted['host'] = value
                elif key_lower in ['status', 'status_code', 'response_code', 'statuscode']:
                    extracted['status_code'] = int(value) if value.isdigit() else 0
                    extracted['is_web_log'] = True
                elif key_lower in ['method', 'http_method', 'request_method']:
                    extracted['method'] = value.upper()
                    extracted['is_web_log'] = True
                elif key_lower in ['path', 'uri', 'url', 'request_uri', 'endpoint']:
                    extracted['path'] = value
                    extracted['is_web_log'] = True
                elif key_lower in ['time', 'timestamp', 'datetime', '@timestamp', 'event_time']:
                    extracted['timestamp'] = self._parse_timestamp(value)
                elif key_lower in ['message', 'msg', 'log_message']:
                    extracted['raw_message'] = value
                elif key_lower in ['level', 'severity', 'priority']:
                    extracted['severity'] = value
                elif key_lower in ['source', 'logger', 'component', 'service']:
                    extracted['source'] = value
        
        # 6. Extract quoted strings (might be user agents, referers, etc.)
        quoted_strings = re.findall(r'"([^"]+)"', line)
        if quoted_strings:
            # Common patterns: first quote = request, second = referer, third = user agent
            if len(quoted_strings) >= 2:
                extracted['referer'] = quoted_strings[-2] if quoted_strings[-2] != '-' else ''
            if len(quoted_strings) >= 1:
                extracted['user_agent'] = quoted_strings[-1] if quoted_strings[-1] != '-' else ''
        
        # 7. Determine event type based on available fields
        if extracted['is_web_log']:
            extracted['event_type'] = self._determine_event_type(
                extracted['method'], 
                extracted['path'], 
                extracted['status_code'], 
                extracted['user_agent']
            )
        else:
            # For non-web logs, use severity or default to LOG_ENTRY
            severity = extracted.get('severity', '').upper()
            if severity in ['ERROR', 'FATAL', 'CRITICAL']:
                extracted['event_type'] = 'ERROR'
            elif severity in ['WARNING', 'WARN']:
                extracted['event_type'] = 'WARNING'
            elif severity in ['INFO', 'INFORMATION']:
                extracted['event_type'] = 'INFO'
            elif severity in ['DEBUG', 'TRACE']:
                extracted['event_type'] = 'DEBUG'
            else:
                extracted['event_type'] = 'LOG_ENTRY'
        
        # Build comprehensive raw_message with all important details
        extra_data = {}
        if extracted['is_web_log']:
            raw_parts = []
            if extracted['method'] and extracted['path']:
                raw_parts.append(f"{extracted['method']} {extracted['path']}")
                extra_data['method'] = extracted['method']
                extra_data['path'] = extracted['path']
            if extracted['status_code']:
                raw_parts.append(f"Status:{extracted['status_code']}")
                extra_data['status_code'] = extracted['status_code']
            if extracted['user_agent'] and extracted['user_agent'] != '-':
                raw_parts.append(f"UA:{extracted['user_agent'][:50]}")
                extra_data['user_agent'] = extracted['user_agent']
            if extracted['referer'] and extracted['referer'] != '-':
                raw_parts.append(f"Ref:{extracted['referer'][:50]}")
                extra_data['referer'] = extracted['referer']
            if raw_parts:
                extracted['raw_message'] = ' | '.join(raw_parts)
        
        # Store severity/source if present
        if extracted.get('severity'):
            extra_data['severity'] = extracted['severity']
        if extracted.get('source'):
            extra_data['source'] = extracted['source']
        
        # Return only fields that ParsedEvent model accepts
        return {
            'timestamp': extracted['timestamp'],
            'user': extracted['user'],
            'host': extracted['host'],
            'event_type': extracted['event_type'],
            'raw_message': extracted['raw_message'],
            'line_number': extracted['line_number'],
            'extra_data': extra_data,
        }
    
    def _parse_extra_fields(self, extra: str) -> Dict[str, Any]:
        """Parse additional fields from log line"""
        fields = {}
        
        # Try key=value format
        kv_pairs = re.findall(r'(\w+)=("[^"]*"|\S+)', extra)
        for key, value in kv_pairs:
            fields[key] = value.strip('"')
        
        # Try space-separated quoted values
        quoted_vals = re.findall(r'"([^"]*)"', extra)
        for i, val in enumerate(quoted_vals):
            if val and val != '-':
                fields[f'extra_field_{i+1}'] = val
        
        # Try to extract response time (common custom field)
        time_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:ms|s)?$', extra)
        if time_match:
            fields['response_time'] = float(time_match.group(1))
        
        return fields
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp with multiple format support - returns timezone-aware datetime"""
        from django.utils import timezone
        import pytz
        
        if not timestamp_str:
            return timezone.now()
        
        # Try detected format first
        if self._detected_timestamp_format:
            try:
                ts_clean = timestamp_str.split()[0] if ' ' in timestamp_str and '+' not in self._detected_timestamp_format else timestamp_str
                dt = datetime.strptime(ts_clean, self._detected_timestamp_format.replace(' %z', ''))
                # Make timezone-aware
                if dt.tzinfo is None:
                    dt = timezone.make_aware(dt, pytz.UTC)
                return dt
            except ValueError:
                pass
        
        # Try all formats
        for fmt in self.TIMESTAMP_PATTERNS:
            try:
                ts_clean = timestamp_str
                # Handle timezone suffix
                if ' +' in ts_clean or ' -' in ts_clean:
                    ts_clean = ts_clean.rsplit(' ', 1)[0]
                dt = datetime.strptime(ts_clean, fmt.replace(' %z', ''))
                # Make timezone-aware
                if dt.tzinfo is None:
                    dt = timezone.make_aware(dt, pytz.UTC)
                return dt
            except ValueError:
                continue
        
        # Last resort: try dateutil
        try:
            from dateutil import parser as date_parser
            dt = date_parser.parse(timestamp_str)
            # Make timezone-aware if needed
            if dt.tzinfo is None:
                dt = timezone.make_aware(dt, pytz.UTC)
            return dt
        except Exception:
            pass
        
        return timezone.now()
    
    def _determine_event_type(self, method: str, path: str, status: int, user_agent: str) -> str:
        """Determine event type based on request characteristics - OPTIMIZED with precompiled patterns"""
        if not path and not method and not user_agent:
            return 'LOG_ENTRY'  # Generic for non-web logs
        
        path_str = path if path else ''
        user_agent_str = user_agent if user_agent else ''
        
        # Check for attack patterns using precompiled regex (faster)
        for pattern, event_type in self._attack_patterns_compiled:
            if pattern.search(path_str):
                return event_type
        
        # Check for scanner/bot user agents using precompiled pattern
        if user_agent_str and self._scanner_pattern.search(user_agent_str):
            return 'SCANNER_DETECTED'
        
        # Check for authentication events using precompiled pattern
        if path_str and self._auth_paths_pattern.search(path_str):
            if status == 401 or status == 403:
                return 'LOGIN_FAILURE'
            elif status == 200 and method == 'POST':
                return 'LOGIN_SUCCESS'
        
        # Check for forbidden access
        if status == 403:
            return 'ACCESS_DENIED'
        
        if status == 401:
            return 'UNAUTHORIZED'
        
        # Check for admin access using precompiled pattern
        if path_str and self._admin_paths_pattern.search(path_str):
            return 'ADMIN_ACCESS'
        
        # Check for sensitive operations
        if method == 'DELETE':
            return 'DELETE_OPERATION'
        
        if method in ['POST', 'PUT', 'PATCH'] and path_str and self._user_modification_pattern.search(path_str):
            return 'USER_MODIFICATION'
        
        # Check for file access using precompiled pattern
        if path_str and self._file_extensions_pattern.search(path_str):
            return 'FILE_ACCESS'
        
        # Check for errors
        if status >= 500:
            return 'SERVER_ERROR'
        
        if status >= 400:
            return 'CLIENT_ERROR'
        
        # Default based on what fields are present
        if method or status:
            return 'WEB_ACCESS'
        else:
            return 'LOG_ENTRY'  # Generic for any log type
    
    def get_statistics(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate statistics from parsed events"""
        from collections import Counter
        
        stats = {
            'total_events': len(events),
            'unique_ips': len(set(e.get('host', '') for e in events)),
            'unique_users': len(set(e.get('user', '') for e in events if e.get('user'))),
            'event_types': dict(Counter(e.get('event_type', 'UNKNOWN') for e in events)),
            'status_codes': dict(Counter(e.get('status_code', 0) for e in events)),
            'methods': dict(Counter(e.get('method', 'UNKNOWN') for e in events)),
            'top_ips': dict(Counter(e.get('host', '') for e in events).most_common(10)),
            'top_paths': dict(Counter(e.get('path', '') for e in events).most_common(10)),
        }
        
        # Time range
        timestamps = [e.get('timestamp') for e in events if e.get('timestamp')]
        if timestamps:
            stats['time_range'] = {
                'start': min(timestamps).isoformat(),
                'end': max(timestamps).isoformat(),
            }
        
        return stats
