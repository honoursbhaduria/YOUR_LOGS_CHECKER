"""
Django REST Framework ViewSets
Implements all API endpoints
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q, Avg
from django.utils import timezone
from django.conf import settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from .models import (
    Case, EvidenceFile, ParsedEvent, ScoredEvent,
    StoryPattern, InvestigationNote, Report
)
from .serializers import (
    CaseSerializer, EvidenceFileSerializer, ParsedEventSerializer,
    ScoredEventSerializer, StoryPatternSerializer, InvestigationNoteSerializer,
    ReportSerializer, DashboardSummarySerializer
)
from .services.log_detection import detect_log_type
from .services.hashing import calculate_sha256
from .tasks import (
    parse_evidence_file_task, score_events_task,
    generate_story_task, generate_report_task
)


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Case management
    Each user can only see their own cases
    """
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    
    def get_queryset(self):
        """Return only cases created by the current user"""
        return Case.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a case"""
        case = self.get_object()
        case.status = 'CLOSED'
        case.closed_at = timezone.now()
        case.save()
        return Response({'status': 'case closed'})
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get case summary statistics"""
        case = self.get_object()
        
        # Aggregate statistics
        evidence_files = case.evidence_files.all()
        scored_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case=case
        )
        
        summary = {
            'case': CaseSerializer(case).data,
            'evidence_count': evidence_files.count(),
            'total_events': scored_events.count(),
            'high_risk_events': scored_events.filter(risk_label='HIGH').count(),
            'critical_events': scored_events.filter(risk_label='CRITICAL').count(),
            'avg_confidence': scored_events.aggregate(Avg('confidence'))['confidence__avg'] or 0,
            'story_count': case.story_patterns.count(),
        }
        
        return Response(summary)
    
    @action(detail=True, methods=['post'])
    def score(self, request, pk=None):
        """Trigger ML scoring for case events"""
        case = self.get_object()
        threshold = request.data.get('threshold', 0.7)
        
        # Get all parsed events for this case
        parsed_events = ParsedEvent.objects.filter(evidence_file__case=case)
        
        if parsed_events.count() == 0:
            return Response(
                {'error': 'No parsed events found. Upload and parse evidence files first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Trigger scoring tasks
        task_ids = []
        try:
            for event in parsed_events:
                task = score_events_task.delay(event.id)
                task_ids.append(str(task.id))
        except Exception as e:
            return Response(
                {'status': 'partial', 'message': f'Celery not available: {str(e)}', 'events_count': parsed_events.count()},
                status=status.HTTP_202_ACCEPTED
            )
        
        return Response({
            'status': 'scoring initiated',
            'events_count': parsed_events.count(),
            'task_ids': task_ids[:5],  # Return first 5 task IDs
            'threshold': threshold
        })
    
    @action(detail=True, methods=['post'])
    def generate_story(self, request, pk=None):
        """Generate attack narrative story for case"""
        case = self.get_object()
        provider = request.data.get('provider', 'openai')
        model = request.data.get('model', 'gpt-4')
        
        # Check if there are scored events
        scored_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case=case,
            is_archived=False
        )
        
        if scored_events.count() == 0:
            return Response(
                {'error': 'No scored events found. Run scoring first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Trigger story generation
        try:
            task = generate_story_task.delay(case.id, provider=provider, model=model)
            return Response({
                'status': 'story generation initiated',
                'task_id': str(task.id),
                'events_count': scored_events.count(),
                'provider': provider,
                'model': model
            })
        except Exception as e:
            return Response(
                {'status': 'failed', 'message': f'Celery not available: {str(e)}'},
                status=status.HTTP_202_ACCEPTED
            )
    
    @action(detail=True, methods=['post'])
    def generate_report(self, request, pk=None):
        """Generate forensic report for case"""
        case = self.get_object()
        format_type = request.data.get('format', 'pdf').upper()
        include_llm = request.data.get('include_llm_explanations', True)
        
        # Support multiple formats: PDF, PDF_LATEX, CSV, JSON
        valid_formats = ['PDF', 'PDF_LATEX', 'CSV', 'JSON']
        if format_type not in valid_formats:
            return Response(
                {'error': f'Invalid format. Use one of: {", ".join(valid_formats)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Trigger report generation
        try:
            task = generate_report_task.delay(
                case.id, 
                format_type, 
                request.user.id,
                include_llm_explanations=include_llm
            )
            return Response({
                'status': 'report generation initiated',
                'task_id': str(task.id),
                'format': format_type,
                'include_llm_explanations': include_llm
            })
        except Exception as e:
            return Response(
                {'status': 'failed', 'message': f'Celery not available: {str(e)}'},
                status=status.HTTP_202_ACCEPTED
            )


class EvidenceFileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Evidence file upload and management
    Users can only see evidence from their own cases
    """
    serializer_class = EvidenceFileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['case', 'log_type', 'is_parsed']
    ordering_fields = ['uploaded_at', 'filename']
    
    def get_queryset(self):
        """Return only evidence files from cases owned by the current user"""
        return EvidenceFile.objects.filter(case__created_by=self.request.user)
    
    def perform_create(self, serializer):
        try:
            file_obj = self.request.FILES.get('file')
            if not file_obj:
                raise ValidationError({'file': 'No file provided'})
            
            case = serializer.validated_data.get('case')
            
            # Verify user owns this case
            if case.created_by != self.request.user:
                raise ValidationError({'case': 'You do not have permission to add evidence to this case'})
            
            case_id = case.id
            
            # Calculate hash
            file_hash = calculate_sha256(file_obj)
            
            # Check if file already exists in THIS case only
            existing_file = EvidenceFile.objects.filter(
                file_hash=file_hash, 
                case_id=case_id
            ).first()
            if existing_file:
                raise ValidationError({
                    'detail': f'File already exists in this case: {existing_file.filename} (uploaded {existing_file.uploaded_at.strftime("%Y-%m-%d %H:%M")})',
                    'existing_file_id': existing_file.id,
                    'duplicate': True
                })
            
            # Extract filename if not provided
            filename = serializer.validated_data.get('filename', file_obj.name)
            
            # Save with filename
            evidence = serializer.save(
                uploaded_by=self.request.user,
                filename=filename,
                file_hash=file_hash,
                file_size=file_obj.size,
            )
            
            # Detect log type - handle potential file path issues
            try:
                file_path = evidence.file.path
                log_type = detect_log_type(file_path, evidence.filename)
            except Exception as e:
                # Fallback to filename-based detection
                logger.warning(f"Could not get file path for detection: {e}")
                log_type = 'CSV' if evidence.filename.lower().endswith('.csv') else 'UNKNOWN'
            
            evidence.log_type = log_type
            evidence.save()
            
            # Attempt synchronous parsing - don't fail if parsing fails
            # Parsing errors are stored in the evidence record
            try:
                self._parse_evidence_sync(evidence.id)
            except Exception as parse_error:
                logger.error(f"Parsing failed for evidence {evidence.id}: {parse_error}")
                evidence.parse_error = str(parse_error)
                evidence.save()
                # Don't raise - file is uploaded, just parsing failed
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error uploading evidence: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise ValidationError({'detail': f'Upload failed: {str(e)}'})
    
    def _parse_evidence_sync(self, evidence_id):
        """Synchronous parsing fallback when Celery is not available"""
        import os
        from .models import EvidenceFile, ParsedEvent
        from .services.parsers.factory import ParserFactory
        
        try:
            evidence = EvidenceFile.objects.get(id=evidence_id)
            
            # Check file exists - handle potential path access errors
            try:
                file_path = evidence.file.path if evidence.file else None
            except Exception as path_err:
                evidence.parse_error = f"Cannot access file path: {path_err}"
                evidence.save()
                logger.error(f"Cannot access file path for evidence {evidence_id}: {path_err}")
                return
            
            if not file_path or not os.path.exists(file_path):
                evidence.parse_error = f"File not found: {file_path}"
                evidence.save()
                logger.error(f"File not found for evidence {evidence_id}: {file_path}")
                return
            
            parser = ParserFactory.get_parser(evidence.log_type)
            
            if not parser:
                evidence.parse_error = f"No parser available for log type: {evidence.log_type}"
                evidence.save()
                return
            
            events = parser.parse(file_path)
            
            for event_data in events:
                ParsedEvent.objects.create(
                    evidence_file=evidence,
                    **event_data
                )
            
            evidence.is_parsed = True
            evidence.parsed_at = timezone.now()
            evidence.parse_error = ''
            evidence.save()
            
            logger.info(f"Synchronously parsed {len(events)} events from {evidence.filename}")
            
        except Exception as e:
            logger.error(f"Error parsing evidence file {evidence_id}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            try:
                evidence = EvidenceFile.objects.get(id=evidence_id)
                evidence.parse_error = str(e)
                evidence.save()
            except:
                pass
    
    @action(detail=True, methods=['get'])
    def hash(self, request, pk=None):
        """Get file hash for verification"""
        evidence = self.get_object()
        return Response({
            'filename': evidence.filename,
            'hash': evidence.file_hash,
            'algorithm': 'SHA-256'
        })
    
    @action(detail=True, methods=['post'])
    def reparse(self, request, pk=None):
        """Trigger re-parsing of evidence file"""
        import os
        try:
            evidence = self.get_object()
            
            # Check if file exists on disk - handle potential errors
            try:
                file_path = evidence.file.path if evidence.file else None
            except Exception as path_error:
                return Response({
                    'error': 'Cannot access file path',
                    'detail': str(path_error),
                    'file_url': evidence.file.url if evidence.file else None
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not file_path or not os.path.exists(file_path):
                return Response({
                    'error': 'File not found on server',
                    'detail': 'The original file is no longer available. Please re-upload the file.',
                    'file_path': file_path
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Clear existing parsed events
            from .models import ParsedEvent
            ParsedEvent.objects.filter(evidence_file=evidence).delete()
            evidence.is_parsed = False
            evidence.parse_error = ''
            evidence.save()
            
            # Always use sync parsing for reliability (Celery may not be available)
            # This ensures parsing happens immediately rather than being queued
            self._parse_evidence_sync(evidence.id)
            evidence.refresh_from_db()
            return Response({
                'status': 'parsing completed (sync)',
                'is_parsed': evidence.is_parsed,
                'event_count': evidence.parsed_events.count(),
                'parse_error': evidence.parse_error
            })
        except Exception as e:
            logger.error(f"Reparse error: {str(e)}")
            import traceback
            return Response({
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=500)


class ParsedEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for parsed events (read-only)
    Users can only see events from their own cases
    """
    serializer_class = ParsedEventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['evidence_file', 'event_type', 'user', 'host']
    search_fields = ['event_type', 'raw_message', 'user', 'host']
    ordering_fields = ['timestamp', 'parsed_at']
    
    def get_queryset(self):
        """Return only events from cases owned by the current user"""
        return ParsedEvent.objects.filter(evidence_file__case__created_by=self.request.user)


class ScoredEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for scored events
    Users can only see scored events from their own cases
    """
    serializer_class = ScoredEventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['risk_label', 'is_archived', 'is_false_positive']
    search_fields = ['parsed_event__event_type', 'inference_text']
    ordering_fields = ['confidence', 'parsed_event__timestamp', 'scored_at']
    
    def get_queryset(self):
        """Return only scored events from cases owned by the current user"""
        return ScoredEvent.objects.select_related('parsed_event').filter(
            parsed_event__evidence_file__case__created_by=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive event"""
        event = self.get_object()
        event.archive()
        return Response({'status': 'archived'})
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore archived event"""
        event = self.get_object()
        event.restore()
        return Response({'status': 'restored'})
    
    @action(detail=True, methods=['post'])
    def mark_false_positive(self, request, pk=None):
        """Mark event as false positive"""
        event = self.get_object()
        event.is_false_positive = True
        event.reviewed_by = request.user
        event.reviewed_at = timezone.now()
        event.save()
        return Response({'status': 'marked as false positive'})
    
    @action(detail=True, methods=['post'])
    def generate_explanation(self, request, pk=None):
        """Generate LLM explanation for event"""
        from .tasks import generate_llm_explanation_task
        event = self.get_object()
        generate_llm_explanation_task.delay(event.id)
        return Response({'status': 'explanation generation initiated'})


class ScoringViewSet(viewsets.ViewSet):
    """
    ViewSet for ML scoring operations
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def run(self, request):
        """Run scoring on case"""
        case_id = request.data.get('case_id')
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Trigger scoring for all parsed events in case
        parsed_events = ParsedEvent.objects.filter(evidence_file__case_id=case_id)
        
        for event in parsed_events:
            score_events_task.delay(event.id)
        
        return Response({
            'status': 'scoring initiated',
            'events_count': parsed_events.count()
        })
    
    @action(detail=False, methods=['post'])
    def recalculate(self, request):
        """Recalculate scores for existing scored events"""
        case_id = request.data.get('case_id')
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        scored_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case_id=case_id
        )
        
        for event in scored_events:
            score_events_task.delay(event.parsed_event_id, recalculate=True)
        
        return Response({
            'status': 'recalculation initiated',
            'events_count': scored_events.count()
        })


class FilterViewSet(viewsets.ViewSet):
    """
    ViewSet for threshold filtering operations
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def apply(self, request):
        """Apply confidence threshold filter"""
        case_id = request.data.get('case_id')
        threshold = float(request.data.get('threshold', 0.7))
        
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Archive events below threshold
        scored_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case_id=case_id
        )
        
        archived_count = 0
        for event in scored_events:
            if event.confidence < threshold and not event.is_archived:
                event.archive()
                archived_count += 1
            elif event.confidence >= threshold and event.is_archived:
                event.restore()
        
        return Response({
            'status': 'filter applied',
            'threshold': threshold,
            'archived_count': archived_count
        })
    
    @action(detail=False, methods=['get'])
    def state(self, request):
        """Get current filter state"""
        case_id = request.query_params.get('case_id')
        
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        scored_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case_id=case_id
        )
        
        return Response({
            'total_events': scored_events.count(),
            'archived_events': scored_events.filter(is_archived=True).count(),
            'active_events': scored_events.filter(is_archived=False).count(),
        })
    
    @action(detail=False, methods=['post'])
    def reset(self, request):
        """Reset all filters (restore all archived events)"""
        case_id = request.data.get('case_id')
        
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        scored_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case_id=case_id,
            is_archived=True
        )
        
        for event in scored_events:
            event.restore()
        
        return Response({
            'status': 'filters reset',
            'restored_count': scored_events.count()
        })


class StoryPatternViewSet(viewsets.ModelViewSet):
    """
    ViewSet for story pattern synthesis
    Users can only see stories from their own cases
    """
    serializer_class = StoryPatternSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['case', 'attack_phase']
    ordering_fields = ['avg_confidence', 'generated_at', 'time_span_start']
    
    def get_queryset(self):
        """Return only stories from cases owned by the current user"""
        return StoryPattern.objects.filter(case__created_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate story from high-confidence events"""
        case_id = request.data.get('case_id')
        
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Trigger async story generation
        generate_story_task.delay(case_id)
        
        return Response({'status': 'story generation initiated'})
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """Regenerate specific story"""
        story = self.get_object()
        
        # Increment regeneration count
        story.regenerated_count += 1
        story.save()
        
        # Trigger regeneration
        generate_story_task.delay(story.case_id, story_id=story.id)
        
        return Response({'status': 'story regeneration initiated'})


class InvestigationNoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for investigation notes
    Users can only see notes from their own cases
    """
    serializer_class = InvestigationNoteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['case', 'scored_event']
    ordering_fields = ['created_at', 'updated_at']
    
    def get_queryset(self):
        """Return only notes from cases owned by the current user"""
        return InvestigationNote.objects.filter(case__created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for report generation and export
    Users can only see reports from their own cases
    """
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['case', 'format']
    ordering_fields = ['generated_at', 'version']
    
    def get_queryset(self):
        """Return only reports from cases owned by the current user"""
        return Report.objects.filter(case__created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def capabilities(self, request):
        """Check what report capabilities are available on this server"""
        from .services.latex_report_generator import latex_generator
        
        pdf_available = latex_generator._is_pdflatex_available()
        
        return Response({
            'pdf_compilation': pdf_available,
            'latex_preview': True,
            'csv_export': True,
            'message': 'PDF compilation available' if pdf_available else 'PDF compilation not available - LaTeX source will be provided instead'
        })
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate new report"""
        case_id = request.data.get('case_id')
        format = request.data.get('format', 'PDF')
        
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Trigger async report generation
        generate_report_task.delay(case_id, format, request.user.id)
        
        return Response({'status': 'report generation initiated'})
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download report file - serves file directly"""
        from django.http import FileResponse
        import os
        
        report = self.get_object()
        
        # Check if file exists
        if not report.file or not os.path.exists(report.file.path):
            return Response(
                {'error': 'Report file not found on server'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Determine content type based on format
        content_types = {
            'PDF': 'application/pdf',
            'PDF_LATEX': 'application/pdf',
            'CSV': 'text/csv',
            'JSON': 'application/json',
        }
        content_type = content_types.get(report.format, 'application/octet-stream')
        
        # Create filename
        extension = report.format.lower() if report.format != 'PDF_LATEX' else 'pdf'
        filename = f"report_case_{report.case.id}_v{report.version}.{extension}"
        
        # Open and return file
        try:
            file_response = FileResponse(
                open(report.file.path, 'rb'),
                as_attachment=True,
                filename=filename,
                content_type=content_type
            )
            return file_response
        except Exception as e:
            return Response(
                {'error': f'Failed to download file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def preview_url(self, request, pk=None):
        """Get preview URL for report (for API consumers who need URL)"""
        report = self.get_object()
        
        return Response({
            'preview_url': report.file.url,
            'filename': f"report_case_{report.case.id}_v{report.version}.{report.format.lower()}",
            'format': report.format,
            'hash': report.file_hash,
            'generated_at': report.generated_at.isoformat(),
            'size_mb': report.file.size / (1024*1024) if report.file else 0
        })
    
    @action(detail=False, methods=['post'])
    def preview_latex(self, request):
        """Generate LaTeX source code for preview/editing"""
        case_id = request.data.get('case_id')
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .models import Case, ScoredEvent
            from .services.latex_report_generator import latex_generator
            
            try:
                case = Case.objects.get(id=case_id)
            except Case.DoesNotExist:
                return Response(
                    {'error': f'Case with id {case_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Prepare case data
            case_data = {
                'case': {
                    'name': case.name,
                    'description': case.description or '',
                    'status': case.status,
                    'created_by': case.created_by.username if case.created_by else 'Unknown',
                    'created_at': case.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                },
                'evidence_files': [],
                'scored_events': [],
                'stories': [],
            }
            
            # Evidence files
            for evidence in case.evidence_files.all():
                case_data['evidence_files'].append({
                    'filename': evidence.filename or 'Unknown',
                    'file_hash': evidence.file_hash or '',
                    'uploaded_at': evidence.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'uploaded_by': evidence.uploaded_by.username if evidence.uploaded_by else 'Unknown',
                })
            
            # Scored events
            scored_events = ScoredEvent.objects.filter(
                parsed_event__evidence_file__case=case,
                is_archived=False
            ).select_related('parsed_event').order_by('-confidence')[:500]
            
            for event in scored_events:
                case_data['scored_events'].append({
                    'timestamp': str(event.parsed_event.timestamp) if event.parsed_event.timestamp else '',
                    'event_type': event.parsed_event.event_type or '',
                    'user': event.parsed_event.user or 'N/A',
                    'host': event.parsed_event.host or 'N/A',
                    'confidence': float(event.confidence),
                    'risk_label': event.risk_label or 'UNKNOWN',
                    'inference_text': event.inference_text or '',
                    'raw_message': event.parsed_event.raw_message or '',
                })
            
            # Story patterns
            for story in case.story_patterns.all():
                case_data['stories'].append({
                    'title': story.title or 'Untitled',
                    'narrative': story.narrative_text or '',
                    'attack_phase': story.attack_phase or 'Unknown',
                    'avg_confidence': float(story.avg_confidence) if story.avg_confidence else 0.0,
                })
            
            # Generate LaTeX source
            try:
                latex_source = latex_generator.generate_latex_preview(case_data)
            except Exception as latex_error:
                logger.error(f"LaTeX generation error: {str(latex_error)}", exc_info=True)
                return Response(
                    {'error': f'LaTeX generation failed: {str(latex_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'latex_source': latex_source,
                'case_name': case.name,
                'event_count': len(case_data['scored_events']),
                'story_count': len(case_data['stories'])
            })
            
        except Exception as e:
            logger.error(f"Error generating LaTeX preview: {str(e)}")
            return Response(
                {'error': f'Failed to generate preview: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def compile_custom_latex(self, request):
        """Compile custom LaTeX source code to PDF"""
        from django.http import FileResponse
        import io
        
        latex_source = request.data.get('latex_source')
        filename = request.data.get('filename', 'custom_report.pdf')
        
        if not latex_source:
            return Response({'error': 'latex_source required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .services.latex_report_generator import latex_generator
            
            # Compile custom LaTeX to PDF
            pdf_bytes, error = latex_generator.compile_custom_latex(latex_source)
            
            if error:
                return Response(
                    {'error': f'LaTeX compilation failed: {error}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Return PDF file
            pdf_buffer = io.BytesIO(pdf_bytes)
            return FileResponse(
                pdf_buffer,
                as_attachment=True,
                filename=filename,
                content_type='application/pdf'
            )
            
        except Exception as e:
            logger.error(f"Error compiling LaTeX: {str(e)}")
            return Response(
                {'error': f'Failed to compile: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generate_combined(self, request):
        """Generate nested LaTeX PDF report with accompanying CSV"""
        from django.http import FileResponse
        import zipfile
        import os
        
        case_id = request.data.get('case_id')
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .models import Case, ScoredEvent
            from .services.latex_report_generator import latex_generator
            
            case = Case.objects.get(id=case_id)
            
            # Prepare case data
            case_data = {
                'case': {
                    'name': case.name,
                    'description': case.description or '',
                    'status': case.status,
                    'created_by': case.created_by.username if case.created_by else 'Unknown',
                    'created_at': case.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                },
                'evidence_files': [],
                'scored_events': [],
                'stories': [],
            }
            
            # Evidence files
            for evidence in case.evidence_files.all():
                case_data['evidence_files'].append({
                    'filename': evidence.filename or 'Unknown',
                    'file_hash': evidence.file_hash or '',
                    'uploaded_at': evidence.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'uploaded_by': evidence.uploaded_by.username if evidence.uploaded_by else 'Unknown',
                })
            
            # Scored events
            scored_events = ScoredEvent.objects.filter(
                parsed_event__evidence_file__case=case,
                is_archived=False
            ).select_related('parsed_event').order_by('-confidence')[:500]
            
            for event in scored_events:
                case_data['scored_events'].append({
                    'timestamp': str(event.parsed_event.timestamp) if event.parsed_event.timestamp else '',
                    'event_type': event.parsed_event.event_type or '',
                    'user': event.parsed_event.user or 'N/A',
                    'host': event.parsed_event.host or 'N/A',
                    'confidence': float(event.confidence),
                    'risk_label': event.risk_label or 'UNKNOWN',
                    'inference_text': event.inference_text or '',
                    'raw_message': event.parsed_event.raw_message or '',
                })
            
            # Story patterns
            for story in case.story_patterns.all():
                case_data['stories'].append({
                    'title': story.title or 'Untitled',
                    'narrative': story.narrative_text or '',
                    'attack_phase': story.attack_phase or 'Unknown',
                    'avg_confidence': float(story.avg_confidence) if story.avg_confidence else 0.0,
                })
            
            # Generate PDF and CSV report
            latex_content, pdf_bytes, csv_data = latex_generator.generate_nested_latex_report(case_data)
            
            import io
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                zip_file.writestr(f'report_case_{case.id}.pdf', pdf_bytes)
                zip_file.writestr(f'report_case_{case.id}_data.csv', csv_data.encode('utf-8'))
                
                metadata = f"""Case Report - {case.name}
Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
Status: {case.status}
Events Analyzed: {len(case_data['scored_events'])}
Attack Patterns: {len(case_data['stories'])}
Evidence Files: {len(case_data['evidence_files'])}
"""
                zip_file.writestr('README.txt', metadata)
            
            zip_buffer.seek(0)
            
            return FileResponse(
                zip_buffer,
                as_attachment=True,
                filename=f"report_case_{case.id}_combined.zip",
                content_type='application/zip'
            )
                )
            
        except Exception as e:
            logger.error(f"Error generating combined report: {str(e)}")
            return Response(
                {'error': f'Failed to generate report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard analytics
    Users only see their own data
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get dashboard summary statistics for the current user"""
        user = request.user
        
        # Aggregate statistics for current user only
        total_cases = Case.objects.filter(created_by=user).count()
        total_evidence = EvidenceFile.objects.filter(case__created_by=user).count()
        total_events = ScoredEvent.objects.filter(parsed_event__evidence_file__case__created_by=user).count()
        high_risk = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case__created_by=user,
            risk_label='HIGH', 
            is_archived=False
        ).count()
        critical = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case__created_by=user,
            risk_label='CRITICAL', 
            is_archived=False
        ).count()
        
        # Recent cases for current user
        recent_cases = Case.objects.filter(created_by=user).order_by('-created_at')[:5]
        
        # Risk distribution for current user
        risk_dist = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case__created_by=user,
            is_archived=False
        ).values('risk_label').annotate(count=Count('id'))
        risk_distribution = {item['risk_label']: item['count'] for item in risk_dist}
        
        # Confidence distribution (bins) for current user
        user_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case__created_by=user,
            is_archived=False
        )
        confidence_bins = {
            '0.0-0.3': user_events.filter(confidence__lt=0.3).count(),
            '0.3-0.6': user_events.filter(confidence__gte=0.3, confidence__lt=0.6).count(),
            '0.6-0.8': user_events.filter(confidence__gte=0.6, confidence__lt=0.8).count(),
            '0.8-1.0': user_events.filter(confidence__gte=0.8).count(),
        }
        
        summary_data = {
            'total_cases': total_cases,
            'total_evidence_files': total_evidence,
            'total_events': total_events,
            'high_risk_events': high_risk,
            'critical_events': critical,
            'recent_cases': CaseSerializer(recent_cases, many=True).data,
            'risk_distribution': risk_distribution,
            'confidence_distribution': confidence_bins,
        }
        
        serializer = DashboardSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def timeline(self, request):
        """Get timeline data for visualization"""
        case_id = request.query_params.get('case_id')
        
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify user owns this case
        case = Case.objects.filter(id=case_id, created_by=request.user).first()
        if not case:
            return Response({'error': 'Case not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get events ordered by time
        events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case_id=case_id,
            is_archived=False
        ).select_related('parsed_event').order_by('parsed_event__timestamp')[:1000]
        
        timeline_data = []
        for event in events:
            timeline_data.append({
                'timestamp': event.parsed_event.timestamp,
                'event_type': event.parsed_event.event_type,
                'confidence': event.confidence,
                'risk_label': event.risk_label,
            })
        
        return Response(timeline_data)
    
    @action(detail=False, methods=['get'])
    def confidence_distribution(self, request):
        """Get confidence score distribution"""
        case_id = request.query_params.get('case_id')
        
        if not case_id:
            return Response({'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify user owns this case
        case = Case.objects.filter(id=case_id, created_by=request.user).first()
        if not case:
            return Response({'error': 'Case not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
        
        events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case_id=case_id,
            is_archived=False
        )
        
        # Create histogram bins
        bins = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        distribution = []
        
        for i in range(len(bins) - 1):
            count = events.filter(
                confidence__gte=bins[i],
                confidence__lt=bins[i+1]
            ).count()
            distribution.append({
                'bin': f"{bins[i]:.1f}-{bins[i+1]:.1f}",
                'count': count
            })
        
        return Response(distribution)
