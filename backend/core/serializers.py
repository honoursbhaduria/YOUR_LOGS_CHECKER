"""
Django REST Framework Serializers
Converts models to/from JSON for API
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Case, EvidenceFile, ParsedEvent, ScoredEvent,
    StoryPattern, InvestigationNote, Report
)


class UserSerializer(serializers.ModelSerializer):
    """User serializer"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class CaseSerializer(serializers.ModelSerializer):
    """Case serializer"""
    created_by = UserSerializer(read_only=True)
    evidence_count = serializers.SerializerMethodField()
    event_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = [
            'id', 'name', 'description', 'status',
            'created_by', 'created_at', 'updated_at', 'closed_at',
            'evidence_count', 'event_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_evidence_count(self, obj):
        return obj.evidence_files.count()
    
    def get_event_count(self, obj):
        return sum(
            evidence.parsed_events.count()
            for evidence in obj.evidence_files.all()
        )


class EvidenceFileSerializer(serializers.ModelSerializer):
    """Evidence file serializer"""
    uploaded_by = UserSerializer(read_only=True)
    event_count = serializers.SerializerMethodField()
    scored_event_count = serializers.SerializerMethodField()
    processing_status = serializers.SerializerMethodField()
    filename = serializers.CharField(required=False)  # Make optional - will be extracted from uploaded file
    
    class Meta:
        model = EvidenceFile
        fields = [
            'id', 'case', 'filename', 'file', 'file_hash',
            'file_size', 'log_type', 'uploaded_by', 'uploaded_at',
            'is_parsed', 'parsed_at', 'parse_error', 'event_count',
            'scored_event_count', 'processing_status'
        ]
        read_only_fields = [
            'id', 'file_hash', 'file_size', 'log_type',
            'uploaded_at', 'is_parsed', 'parsed_at', 'event_count',
            'scored_event_count', 'processing_status'
        ]
    
    def get_event_count(self, obj):
        return obj.event_count
    
    def get_scored_event_count(self, obj):
        return obj.scored_event_count
    
    def get_processing_status(self, obj):
        """Get detailed processing status"""
        status = {
            'upload': 'completed',
            'hash': 'completed',
            'parsing': 'pending',
            'scoring': 'pending',
            'story_generation': 'pending'
        }
        
        if obj.is_parsed:
            status['parsing'] = 'completed'
            if obj.event_count > 0:
                if obj.scored_event_count > 0:
                    status['scoring'] = 'completed'
                    status['story_generation'] = 'ready'
                else:
                    status['scoring'] = 'in_progress'
            else:
                status['scoring'] = 'no_events'
        elif obj.parse_error:
            status['parsing'] = 'failed'
        else:
            status['parsing'] = 'in_progress'
            
        return status


class ParsedEventSerializer(serializers.ModelSerializer):
    """Parsed event serializer"""
    evidence_filename = serializers.CharField(source='evidence_file.filename', read_only=True)
    
    class Meta:
        model = ParsedEvent
        fields = [
            'id', 'evidence_file', 'evidence_filename',
            'timestamp', 'user', 'host', 'event_type', 'raw_message',
            'extra_data', 'line_number', 'parsed_at'
        ]
        read_only_fields = ['id', 'parsed_at']


class ScoredEventSerializer(serializers.ModelSerializer):
    """Scored event serializer"""
    parsed_event = ParsedEventSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    
    # Flatten parsed event fields for convenience
    timestamp = serializers.DateTimeField(source='parsed_event.timestamp', read_only=True)
    event_type = serializers.CharField(source='parsed_event.event_type', read_only=True)
    raw_message = serializers.CharField(source='parsed_event.raw_message', read_only=True)
    
    class Meta:
        model = ScoredEvent
        fields = [
            'id', 'parsed_event', 'confidence', 'risk_label',
            'feature_scores', 'is_archived', 'archived_at',
            'inference_text', 'inference_generated_at', 'inference_model',
            'manual_explanation', 'is_false_positive',
            'reviewed_by', 'reviewed_at', 'scored_at',
            # Flattened fields
            'timestamp', 'event_type', 'raw_message'
        ]
        read_only_fields = [
            'id', 'scored_at', 'inference_generated_at',
            'timestamp', 'event_type', 'raw_message'
        ]


class StoryPatternSerializer(serializers.ModelSerializer):
    """Story pattern serializer"""
    scored_events = ScoredEventSerializer(many=True, read_only=True)
    scored_event_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=ScoredEvent.objects.all(),
        source='scored_events'
    )
    
    class Meta:
        model = StoryPattern
        fields = [
            'id', 'case', 'title', 'narrative_text', 'attack_phase',
            'scored_events', 'scored_event_ids',
            'avg_confidence', 'event_count',
            'time_span_start', 'time_span_end',
            'generated_by_model', 'generated_at', 'regenerated_count'
        ]
        read_only_fields = ['id', 'generated_at']


class InvestigationNoteSerializer(serializers.ModelSerializer):
    """Investigation note serializer"""
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = InvestigationNote
        fields = [
            'id', 'case', 'scored_event', 'content',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Ensure either case or scored_event is provided"""
        if not data.get('case') and not data.get('scored_event'):
            raise serializers.ValidationError(
                "Either 'case' or 'scored_event' must be provided"
            )
        return data


class ReportSerializer(serializers.ModelSerializer):
    """Report serializer"""
    generated_by = UserSerializer(read_only=True)
    file_path = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'case', 'format', 'file', 'file_path', 'file_hash',
            'generated_by', 'generated_at', 'version'
        ]
        read_only_fields = ['id', 'file_hash', 'generated_at']
    
    def get_file_path(self, obj):
        """Return full URL for file download"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DashboardSummarySerializer(serializers.Serializer):
    """Dashboard summary statistics"""
    total_cases = serializers.IntegerField()
    total_evidence_files = serializers.IntegerField()
    total_events = serializers.IntegerField()
    high_risk_events = serializers.IntegerField()
    critical_events = serializers.IntegerField()
    recent_cases = CaseSerializer(many=True)
    risk_distribution = serializers.DictField()
    confidence_distribution = serializers.DictField()
