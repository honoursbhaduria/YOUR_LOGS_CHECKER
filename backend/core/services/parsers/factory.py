"""
Parser factory
Routes log files to appropriate parser based on log type
"""
from typing import Optional
from .base import BaseParser
from .csv_parser import CSVParser
from .syslog_parser import SyslogParser


class ParserFactory:
    """
    Factory class for creating appropriate log parser
    """
    
    _parsers = {
        'CSV': CSVParser,
        'SYSLOG': SyslogParser,
        # Add more parsers here: 'EVTX': EVTXParser, etc.
    }
    
    @classmethod
    def get_parser(cls, log_type: str) -> Optional[BaseParser]:
        """
        Get appropriate parser for log type
        
        Args:
            log_type: Log type string (CSV, SYSLOG, EVTX, etc.)
            
        Returns:
            Parser instance or None if unsupported
        """
        parser_class = cls._parsers.get(log_type.upper())
        if parser_class:
            return parser_class()
        return None
    
    @classmethod
    def register_parser(cls, log_type: str, parser_class: type):
        """
        Register custom parser
        
        Args:
            log_type: Log type identifier
            parser_class: Parser class (must inherit from BaseParser)
        """
        if not issubclass(parser_class, BaseParser):
            raise ValueError("Parser must inherit from BaseParser")
        cls._parsers[log_type.upper()] = parser_class
