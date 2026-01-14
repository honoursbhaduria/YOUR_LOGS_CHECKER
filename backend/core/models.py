"""
Core Django models for forensic log analysis system
Implements chain of custody, parsing, scoring, and story synthesis
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import hashlib


class Case(models.Model):
    """Investigation case - groups related evidence files"""
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('CLOSED', 'Closed'),
        ('ARCHIVED', 'Archived'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='cases_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.status})"


class EvidenceFile(models.Model):
    """
    Uploaded log file with chain of custody
    Implements cryptographic hashing for legal defensibility
    """
    LOG_TYPE_CHOICES = [
        ('CSV', 'CSV'),
        ('SYSLOG', 'Syslog'),
        ('EVTX', 'Windows Event Log'),
        ('JSON', 'JSON'),
        ('UNKNOWN', 'Unknown'),
    ]
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='evidence_files')
    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='evidence/%Y/%m/%d/')
    file_hash = models.CharField(max_length=64, db_index=True)  # SHA-256 (not globally unique - same file can be in multiple cases)
    file_size = models.BigIntegerField()
    log_type = models.CharField(max_length=20, choices=LOG_TYPE_CHOICES, default='UNKNOWN')
    
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Processing status
    is_parsed = models.BooleanField(default=False)
    parsed_at = models.DateTimeField(null=True, blank=True)
    parse_error = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['file_hash']),
            models.Index(fields=['case', 'uploaded_at']),
        ]
        # Allow same file in different cases, but prevent duplicates within same case
        constraints = [
            models.UniqueConstraint(fields=['case', 'file_hash'], name='unique_file_per_case')
        ]
    
    def __str__(self):
        return f"{self.filename} ({self.file_hash[:8]}...)"
    
    def save(self, *args, **kwargs):
        """Auto-generate hash on save if not present"""
        if not self.file_hash and self.file:
            self.file_hash = self._calculate_hash()
        super().save(*args, **kwargs)
    
    def _calculate_hash(self):
        """Calculate SHA-256 hash of file"""
        sha256_hash = hashlib.sha256()
        for byte_block in iter(lambda: self.file.read(4096), b""):
            sha256_hash.update(byte_block)
        self.file.seek(0)  # Reset file pointer
        return sha256_hash.hexdigest()


class ParsedEvent(models.Model):
    """
    Normalized log event from raw evidence
    Master CSV schema: timestamp | user | host | event_type | raw_message
    """
    evidence_file = models.ForeignKey(EvidenceFile, on_delete=models.CASCADE, related_name='parsed_events')
    
    # Master CSV fields
    timestamp = models.DateTimeField(db_index=True)
    user = models.CharField(max_length=255, blank=True, db_index=True)
    host = models.CharField(max_length=255, blank=True, db_index=True)
    event_type = models.CharField(max_length=255, db_index=True)
    raw_message = models.TextField()
    
    # Metadata
    line_number = models.IntegerField()
    parsed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['evidence_file', 'timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.timestamp} - {self.event_type}"


class ScoredEvent(models.Model):
    """
    ML confidence-scored event
    Implements threshold-based filtering
    """
    RISK_LABELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    parsed_event = models.OneToOneField(ParsedEvent, on_delete=models.CASCADE, related_name='scored')
    
    # Scoring
    confidence = models.FloatField(db_index=True)  # 0.0 - 1.0
    risk_label = models.CharField(max_length=20, choices=RISK_LABELS, db_index=True)
    
    # Feature explainability
    feature_scores = models.JSONField(default=dict)  # {feature_name: score}
    
    # Threshold filtering
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    # LLM inference
    inference_text = models.TextField(blank=True)
    inference_generated_at = models.DateTimeField(null=True, blank=True)
    inference_model = models.CharField(max_length=50, blank=True)
    
    # Human override
    manual_explanation = models.TextField(blank=True)
    is_false_positive = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    scored_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-confidence', 'parsed_event__timestamp']
        indexes = [
            models.Index(fields=['confidence', 'is_archived']),
            models.Index(fields=['risk_label', 'is_archived']),
        ]
    
    def __str__(self):
        return f"{self.risk_label} ({self.confidence:.2f}) - {self.parsed_event.event_type}"
    
    def archive(self):
        """Archive low-confidence event"""
        self.is_archived = True
        self.archived_at = timezone.now()
        self.save()
    
    def restore(self):
        """Restore archived event"""
        self.is_archived = False
        self.archived_at = None
        self.save()


class StoryPattern(models.Model):
    """
    Attack narrative synthesized from multiple scored events
    Implements story pattern synthesis (core differentiator)
    """
    ATTACK_PHASES = [
        ('INITIAL_ACCESS', 'Initial Access'),
        ('PERSISTENCE', 'Persistence'),
        ('PRIVILEGE_ESCALATION', 'Privilege Escalation'),
        ('LATERAL_MOVEMENT', 'Lateral Movement'),
        ('EXECUTION', 'Execution'),
        ('EXFILTRATION', 'Data Exfiltration'),
        ('UNKNOWN', 'Unknown'),
    ]
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='story_patterns')
    
    # Story metadata
    title = models.CharField(max_length=255)
    narrative_text = models.TextField()
    attack_phase = models.CharField(max_length=30, choices=ATTACK_PHASES, default='UNKNOWN')
    
    # Linked evidence
    scored_events = models.ManyToManyField(ScoredEvent, related_name='story_patterns')
    
    # Confidence summary
    avg_confidence = models.FloatField()
    event_count = models.IntegerField()
    time_span_start = models.DateTimeField()
    time_span_end = models.DateTimeField()
    
    # Generation metadata
    generated_by_model = models.CharField(max_length=50)
    generated_at = models.DateTimeField(auto_now_add=True)
    regenerated_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-avg_confidence', 'time_span_start']
    
    def __str__(self):
        return f"{self.title} ({self.attack_phase})"


class InvestigationNote(models.Model):
    """
    Analyst annotations and notes
    """
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='notes')
    scored_event = models.ForeignKey(ScoredEvent, on_delete=models.CASCADE, null=True, blank=True, related_name='notes')
    
    content = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Note by {self.created_by.username} on {self.created_at}"


class Report(models.Model):
    """
    Generated forensic reports (PDF/JSON/CSV/LaTeX)
    """
    REPORT_FORMATS = [
        ('PDF', 'PDF'),
        ('PDF_LATEX', 'LaTeX PDF'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
    ]
    
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='reports')
    
    format = models.CharField(max_length=20, choices=REPORT_FORMATS)
    file = models.FileField(upload_to='reports/%Y/%m/%d/')
    file_hash = models.CharField(max_length=64)  # SHA-256 of report
    
    generated_by = models.ForeignKey(User, on_delete=models.PROTECT)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    # Versioning
    version = models.IntegerField(default=1)
    
    class Meta:
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"Report v{self.version} for {self.case.name} ({self.format})"
