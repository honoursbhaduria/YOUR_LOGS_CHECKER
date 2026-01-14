"""
ML Confidence Scoring Service
Implements rule-based + ML hybrid scoring (MVP-friendly)
Generates confidence scores (0.0-1.0) and risk labels
"""
from typing import Dict, Tuple
from datetime import datetime
import re


class MLScorer:
    """
    ML-based confidence scoring engine
    Uses rule-based heuristics (MVP) with extensibility for ML models
    """
    
    # Scoring rules (can be replaced with trained ML model)
    RISK_KEYWORDS = {
        # High-risk indicators
        'powershell': 0.4,
        'cmd.exe': 0.3,
        'mimikatz': 0.9,
        'credential': 0.5,
        'password': 0.4,
        'admin': 0.3,
        'root': 0.3,
        'sudo': 0.3,
        'exec': 0.3,
        'remote': 0.3,
        'rdp': 0.4,
        'ssh': 0.3,
        'login': 0.2,
        'failed': 0.2,
        'denied': 0.2,
        'transfer': 0.3,
        'download': 0.2,
        'upload': 0.3,
        'exploit': 0.8,
        'payload': 0.7,
        'shell': 0.4,
        'backdoor': 0.9,
        'trojan': 0.9,
        'malware': 0.9,
    }
    
    # Event type risk scores
    EVENT_TYPE_SCORES = {
        'powershell_exec': 0.4,
        'remote_login': 0.3,
        'admin_login': 0.4,
        'file_transfer': 0.3,
        'service_start': 0.1,
        'process_creation': 0.2,
        'network_connection': 0.2,
    }
    
    def score_event(self, event_data: Dict) -> Tuple[float, str, Dict[str, float]]:
        """
        Calculate confidence score for event
        
        Args:
            event_data: Dict with keys: timestamp, user, host, event_type, raw_message
            
        Returns:
            Tuple of (confidence, risk_label, feature_scores)
        """
        feature_scores = {}
        total_score = 0.0
        
        # Score based on event type
        event_type_score = self._score_event_type(event_data['event_type'])
        feature_scores['event_type'] = event_type_score
        total_score += event_type_score
        
        # Score based on keywords in raw message
        keyword_score = self._score_keywords(event_data['raw_message'])
        feature_scores['keywords'] = keyword_score
        total_score += keyword_score
        
        # Score based on user (admin/root = higher risk)
        user_score = self._score_user(event_data.get('user', ''))
        feature_scores['user'] = user_score
        total_score += user_score
        
        # Score based on temporal patterns (could add time-based analysis)
        time_score = self._score_temporal(event_data.get('timestamp'))
        feature_scores['temporal'] = time_score
        total_score += time_score
        
        # Normalize to 0.0-1.0
        confidence = min(total_score, 1.0)
        
        # Assign risk label
        risk_label = self._assign_risk_label(confidence)
        
        return confidence, risk_label, feature_scores
    
    def _score_event_type(self, event_type: str) -> float:
        """Score based on event type"""
        event_type_lower = event_type.lower()
        
        # Check exact matches first
        for key, score in self.EVENT_TYPE_SCORES.items():
            if key in event_type_lower:
                return score
        
        # Check keyword matches
        for keyword, score in self.RISK_KEYWORDS.items():
            if keyword in event_type_lower:
                return score * 0.8  # Slightly lower weight
        
        return 0.1  # Base score
    
    def _score_keywords(self, message: str) -> float:
        """Score based on risk keywords in message"""
        message_lower = message.lower()
        max_score = 0.0
        
        for keyword, score in self.RISK_KEYWORDS.items():
            if keyword in message_lower:
                max_score = max(max_score, score)
        
        return max_score
    
    def _score_user(self, user: str) -> float:
        """Score based on user privileges"""
        user_lower = user.lower()
        
        high_priv_users = ['admin', 'administrator', 'root', 'system', 'nt authority']
        
        if any(priv in user_lower for priv in high_priv_users):
            return 0.3
        
        return 0.0
    
    def _score_temporal(self, timestamp) -> float:
        """
        Score based on temporal patterns
        For MVP: simple off-hours detection
        """
        if not timestamp:
            return 0.0
        
        if isinstance(timestamp, datetime):
            hour = timestamp.hour
            
            # Off-hours (10pm - 6am) = slightly higher risk
            if hour >= 22 or hour < 6:
                return 0.1
        
        return 0.0
    
    def _assign_risk_label(self, confidence: float) -> str:
        """Assign risk label based on confidence score"""
        if confidence >= 0.8:
            return 'CRITICAL'
        elif confidence >= 0.6:
            return 'HIGH'
        elif confidence >= 0.3:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def apply_threshold(self, confidence: float, threshold: float = 0.7) -> bool:
        """
        Determine if event passes threshold
        
        Args:
            confidence: Event confidence score
            threshold: Minimum threshold
            
        Returns:
            True if event passes threshold, False otherwise
        """
        return confidence >= threshold


# Singleton instance
scorer = MLScorer()
