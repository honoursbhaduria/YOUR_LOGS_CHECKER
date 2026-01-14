from django.contrib import admin
from .models import (
    Case, EvidenceFile, ParsedEvent, ScoredEvent,
    StoryPattern, InvestigationNote, Report
)

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'description']

@admin.register(EvidenceFile)
class EvidenceFileAdmin(admin.ModelAdmin):
    list_display = ['filename', 'case', 'log_type', 'uploaded_at', 'is_parsed']
    list_filter = ['log_type', 'is_parsed', 'uploaded_at']
    search_fields = ['filename', 'file_hash']

@admin.register(ParsedEvent)
class ParsedEventAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'event_type', 'user', 'host', 'evidence_file']
    list_filter = ['event_type', 'timestamp']
    search_fields = ['event_type', 'user', 'host', 'raw_message']

@admin.register(ScoredEvent)
class ScoredEventAdmin(admin.ModelAdmin):
    list_display = ['parsed_event', 'confidence', 'risk_label', 'is_archived']
    list_filter = ['risk_label', 'is_archived', 'scored_at']
    search_fields = ['inference_text']

@admin.register(StoryPattern)
class StoryPatternAdmin(admin.ModelAdmin):
    list_display = ['title', 'case', 'attack_phase', 'avg_confidence', 'generated_at']
    list_filter = ['attack_phase', 'generated_at']
    search_fields = ['title', 'narrative_text']

@admin.register(InvestigationNote)
class InvestigationNoteAdmin(admin.ModelAdmin):
    list_display = ['case', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content']

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['case', 'format', 'version', 'generated_by', 'generated_at']
    list_filter = ['format', 'generated_at']
    search_fields = ['file_hash']
