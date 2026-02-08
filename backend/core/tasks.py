"""
Celery background tasks
Handles async processing: parsing, scoring, LLM inference, story synthesis, reporting
"""
from celery import shared_task
from django.utils import timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task
def parse_evidence_file_task(evidence_file_id):
    """
    Parse evidence file asynchronously
    
    Args:
        evidence_file_id: EvidenceFile ID to parse
    """
    from .models import EvidenceFile, ParsedEvent
    from .services.parsers.factory import ParserFactory
    
    try:
        evidence = EvidenceFile.objects.get(id=evidence_file_id)
        
        # Get appropriate parser
        parser = ParserFactory.get_parser(evidence.log_type)
        
        if not parser:
            evidence.parse_error = f"No parser available for log type: {evidence.log_type}"
            evidence.save()
            return
        
        logger.info(f"Starting to parse {evidence.filename} ({evidence.file_size / 1024:.2f} KB)")
        
        # Parse file
        events = parser.parse(evidence.file.path)
        
        logger.info(f"Parsed {len(events)} events, now saving to database...")
        
        # Save parsed events using bulk_create for better performance
        batch_size = 1000
        parsed_events = []
        
        for event_data in events:
            # Ensure extra_data is never None (safeguard against parser bugs)
            if 'extra_data' not in event_data or event_data['extra_data'] is None:
                event_data['extra_data'] = {}
            
            parsed_events.append(ParsedEvent(
                evidence_file=evidence,
                **event_data
            ))
            
            # Bulk insert in batches
            if len(parsed_events) >= batch_size:
                ParsedEvent.objects.bulk_create(parsed_events, batch_size=batch_size)
                logger.info(f"Saved {len(parsed_events)} events to database")
                parsed_events = []
        
        # Save remaining events
        if parsed_events:
            ParsedEvent.objects.bulk_create(parsed_events, batch_size=batch_size)
            logger.info(f"Saved final {len(parsed_events)} events to database")
        
        # Mark as parsed
        evidence.is_parsed = True
        evidence.parsed_at = timezone.now()
        evidence.parse_error = ''
        evidence.save()
        
        logger.info(f"Successfully completed parsing {len(events)} events from {evidence.filename}")
        
        # Trigger bulk ML scoring for all parsed events
        logger.info(f"Triggering bulk ML scoring for {len(events)} events...")
        score_events_bulk_task.delay(evidence.case_id)
        logger.info(f"Queued bulk scoring task for case {evidence.case_id}")
        
    except Exception as e:
        logger.error(f"Error parsing evidence file {evidence_file_id}: {str(e)}")
        if evidence_file_id:
            evidence = EvidenceFile.objects.get(id=evidence_file_id)
            evidence.parse_error = str(e)
            evidence.save()


@shared_task
def score_events_task(parsed_event_id, recalculate=False):
    """
    Score parsed event with ML confidence scoring
    
    Args:
        parsed_event_id: ParsedEvent ID to score
        recalculate: If True, recalculate existing score
    """
    from .models import ParsedEvent, ScoredEvent
    from .services.ml_scoring import scorer
    
    try:
        parsed_event = ParsedEvent.objects.get(id=parsed_event_id)
        
        # Check if already scored
        if hasattr(parsed_event, 'scored') and not recalculate:
            return
        
        # Prepare event data for scoring
        event_data = {
            'timestamp': parsed_event.timestamp,
            'user': parsed_event.user,
            'host': parsed_event.host,
            'event_type': parsed_event.event_type,
            'raw_message': parsed_event.raw_message,
        }
        
        # Score event
        confidence, risk_label, feature_scores = scorer.score_event(event_data)
        
        # Save or update scored event
        if hasattr(parsed_event, 'scored'):
            scored_event = parsed_event.scored
            scored_event.confidence = confidence
            scored_event.risk_label = risk_label
            scored_event.feature_scores = feature_scores
            scored_event.save()
        else:
            ScoredEvent.objects.create(
                parsed_event=parsed_event,
                confidence=confidence,
                risk_label=risk_label,
                feature_scores=feature_scores
            )
        
        logger.info(f"Scored event {parsed_event_id}: {risk_label} ({confidence:.2f})")
        
    except Exception as e:
        logger.error(f"Error scoring event {parsed_event_id}: {str(e)}")


@shared_task
def score_events_bulk_task(case_id, threshold=0.0, recalculate=False):
    """
    Bulk score all parsed events for a case (optimized performance)
    
    Args:
        case_id: Case ID or evidence file case ID
        threshold: Minimum confidence threshold (default 0.0)
        recalculate: If True, recalculate existing scores
    """
    from .models import ParsedEvent, ScoredEvent, Case
    from .services.ml_scoring import scorer
    
    try:
        # Get all parsed events for this case
        parsed_events = ParsedEvent.objects.filter(
            evidence_file__case_id=case_id
        ).select_related('evidence_file')
        
        total_events = parsed_events.count()
        logger.info(f"Starting bulk scoring for {total_events} events in case {case_id}")
        
        # Filter out already scored events if not recalculating
        if not recalculate:
            already_scored_ids = ScoredEvent.objects.filter(
                parsed_event__evidence_file__case_id=case_id
            ).values_list('parsed_event_id', flat=True)
            parsed_events = parsed_events.exclude(id__in=already_scored_ids)
            logger.info(f"Skipping {len(already_scored_ids)} already scored events")
        
        # Batch process events
        batch_size = 1000
        scored_events_to_create = []
        scored_events_to_update = []
        processed = 0
        
        for parsed_event in parsed_events.iterator(chunk_size=batch_size):
            try:
                # Prepare event data for scoring
                event_data = {
                    'timestamp': parsed_event.timestamp,
                    'user': parsed_event.user or '',
                    'host': parsed_event.host or '',
                    'event_type': parsed_event.event_type or 'unknown',
                    'raw_message': parsed_event.raw_message or '',
                }
                
                # Score event
                confidence, risk_label, feature_scores = scorer.score_event(event_data)
                
                # Generate basic inference text
                event_type = parsed_event.event_type or 'unknown'
                user = parsed_event.user or 'unknown user'
                host = parsed_event.host or 'unknown host'
                
                if confidence >= 0.8:
                    inference_text = f"Critical {event_type} activity detected from {user} on {host}"
                elif confidence >= 0.6:
                    inference_text = f"High-risk {event_type} detected: {user}@{host}"
                elif confidence >= 0.3:
                    inference_text = f"Suspicious {event_type} activity: {user}@{host}"
                else:
                    inference_text = f"Normal {event_type} event: {user}@{host}"
                
                # Prepare for bulk create/update
                if recalculate and hasattr(parsed_event, 'scored'):
                    scored_event = parsed_event.scored
                    scored_event.confidence = confidence
                    scored_event.risk_label = risk_label
                    scored_event.feature_scores = feature_scores
                    scored_event.inference_text = inference_text
                    scored_events_to_update.append(scored_event)
                else:
                    scored_events_to_create.append(ScoredEvent(
                        parsed_event=parsed_event,
                        confidence=confidence,
                        risk_label=risk_label,
                        feature_scores=feature_scores,
                        inference_text=inference_text
                    ))
                
                processed += 1
                
                # Bulk insert/update in batches
                if len(scored_events_to_create) >= batch_size:
                    ScoredEvent.objects.bulk_create(scored_events_to_create, batch_size=batch_size)
                    logger.info(f"Bulk created {len(scored_events_to_create)} scored events")
                    scored_events_to_create = []
                
                if len(scored_events_to_update) >= batch_size:
                    ScoredEvent.objects.bulk_update(
                        scored_events_to_update,
                        ['confidence', 'risk_label', 'feature_scores', 'inference_text'],
                        batch_size=batch_size
                    )
                    logger.info(f"Bulk updated {len(scored_events_to_update)} scored events")
                    scored_events_to_update = []
                    
            except Exception as event_error:
                logger.error(f"Failed to score event {parsed_event.id}: {event_error}")
                continue
        
        # Save remaining events
        if scored_events_to_create:
            ScoredEvent.objects.bulk_create(scored_events_to_create, batch_size=batch_size)
            logger.info(f"Bulk created final {len(scored_events_to_create)} scored events")
        
        if scored_events_to_update:
            ScoredEvent.objects.bulk_update(
                scored_events_to_update,
                ['confidence', 'risk_label', 'feature_scores', 'inference_text'],
                batch_size=batch_size
            )
            logger.info(f"Bulk updated final {len(scored_events_to_update)} scored events")
        
        logger.info(f"Successfully bulk scored {processed} events for case {case_id}")
        
    except Exception as e:
        logger.error(f"Error in bulk scoring for case {case_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())


@shared_task
def generate_llm_explanation_task(scored_event_id):
    """
    Generate LLM explanation for scored event
    
    Args:
        scored_event_id: ScoredEvent ID
    """
    from .models import ScoredEvent
    from .services.llm_row_inference import get_llm_service
    
    try:
        scored_event = ScoredEvent.objects.select_related('parsed_event').get(id=scored_event_id)
        
        # Skip if already has explanation
        if scored_event.inference_text:
            return
        
        # Prepare event data
        event_data = {
            'timestamp': scored_event.parsed_event.timestamp,
            'user': scored_event.parsed_event.user,
            'host': scored_event.parsed_event.host,
            'event_type': scored_event.parsed_event.event_type,
            'raw_message': scored_event.parsed_event.raw_message,
        }
        
        # Generate explanation
        llm_service = get_llm_service()
        explanation = llm_service.generate_explanation(event_data)
        
        # Save explanation
        scored_event.inference_text = explanation
        scored_event.inference_generated_at = timezone.now()
        scored_event.inference_model = llm_service.model
        scored_event.save()
        
        logger.info(f"Generated explanation for event {scored_event_id}")
        
    except Exception as e:
        logger.error(f"Error generating explanation for event {scored_event_id}: {str(e)}")


@shared_task
def generate_story_task(case_id, story_id=None):
    """
    Generate attack story from high-confidence events
    
    Args:
        case_id: Case ID
        story_id: Optional existing story ID to regenerate
    """
    from .models import Case, ScoredEvent, StoryPattern
    from .services.story_synthesis import get_story_service
    
    try:
        case = Case.objects.get(id=case_id)
        
        # Get high-confidence events
        high_conf_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case=case,
            confidence__gte=settings.ML_CONFIDENCE_THRESHOLD,
            is_archived=False
        ).select_related('parsed_event').order_by('parsed_event__timestamp')
        
        if not high_conf_events.exists():
            logger.warning(f"No high-confidence events for case {case_id}")
            return
        
        # Prepare event data
        events_data = []
        for event in high_conf_events[:100]:  # Limit to 100 for token economy
            events_data.append({
                'timestamp': event.parsed_event.timestamp,
                'user': event.parsed_event.user,
                'host': event.parsed_event.host,
                'event_type': event.parsed_event.event_type,
                'raw_message': event.parsed_event.raw_message,
                'confidence': event.confidence,
                'risk_label': event.risk_label,
            })
        
        # Generate story
        story_service = get_story_service()
        story_data = story_service.synthesize_story(events_data)
        
        # Save or update story
        if story_id:
            story = StoryPattern.objects.get(id=story_id)
            story.title = story_data['title']
            story.narrative_text = story_data['narrative']
            story.attack_phase = story_data['attack_phase']
            story.avg_confidence = story_data['avg_confidence']
            story.event_count = story_data['event_count']
            story.time_span_start = story_data['time_span_start']
            story.time_span_end = story_data['time_span_end']
            story.save()
        else:
            story = StoryPattern.objects.create(
                case=case,
                title=story_data['title'],
                narrative_text=story_data['narrative'],
                attack_phase=story_data['attack_phase'],
                avg_confidence=story_data['avg_confidence'],
                event_count=story_data['event_count'],
                time_span_start=story_data['time_span_start'],
                time_span_end=story_data['time_span_end'],
                generated_by_model=story_service.model,
            )
        
        # Link events to story
        story.scored_events.set(high_conf_events)
        
        logger.info(f"Generated story for case {case_id}: {story.title}")
        
    except Exception as e:
        logger.error(f"Error generating story for case {case_id}: {str(e)}")


@shared_task
def generate_report_task(case_id, format='PDF', user_id=None, include_llm_explanations=False):
    """
    Generate forensic report
    
    Args:
        case_id: Case ID
        format: Report format (PDF, PDF_LATEX, CSV, or JSON)
        user_id: User ID generating report
        include_llm_explanations: Whether to include LLM explanations in report
    """
    from .models import Case, Report, User, ScoredEvent
    from .services.report_generator import report_generator
    from .services.hashing import calculate_string_hash
    from django.core.files.base import ContentFile
    import json
    
    try:
        case = Case.objects.get(id=case_id)
        user = User.objects.get(id=user_id) if user_id else None
        
        # Gather case data
        case_data = {
            'case': {
                'name': case.name,
                'description': case.description,
                'status': case.status,
                'created_by': case.created_by.username,
                'created_at': case.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            },
            'evidence_files': [],
            'scored_events': [],
            'stories': [],
        }
        
        # Evidence files
        for evidence in case.evidence_files.all():
            case_data['evidence_files'].append({
                'filename': evidence.filename,
                'file_hash': evidence.file_hash,
                'uploaded_at': evidence.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
                'uploaded_by': evidence.uploaded_by.username,
            })
        
        # Scored events - ALL real data from parsed logs
        scored_events = ScoredEvent.objects.filter(
            parsed_event__evidence_file__case=case,
            is_archived=False
        ).select_related('parsed_event', 'parsed_event__evidence_file').order_by('-confidence')[:500]
        
        logger.info(f"Generating report with {scored_events.count()} real parsed events")
        
        for event in scored_events:
            case_data['scored_events'].append({
                'timestamp': event.parsed_event.timestamp,
                'event_type': event.parsed_event.event_type or 'UNKNOWN',
                'user': event.parsed_event.user or 'N/A',
                'host': event.parsed_event.host or 'N/A',
                'confidence': float(event.confidence),
                'risk_label': event.risk_label or 'UNKNOWN',
                'inference_text': event.inference_text if include_llm_explanations else '',
                'raw_message': event.parsed_event.raw_message or '',
            })
        
        # Story patterns
        for story in case.story_patterns.all():
            case_data['stories'].append({
                'title': story.title,
                'narrative': story.narrative_text,
                'attack_phase': story.attack_phase,
                'avg_confidence': story.avg_confidence,
            })
        
        # Generate report based on format
        if format == 'PDF':
            filename = f"report_case_{case.id}.pdf"
            pdf_bytes = report_generator.generate_pdf_report(case_data)
            file_content = ContentFile(pdf_bytes, name=filename)
            file_hash = calculate_string_hash(str(case_data))
        elif format == 'PDF_LATEX':
            from .services.latex_report_generator import latex_generator
            filename = f"report_case_{case.id}_latex.pdf"
            latex_content, pdf_bytes, csv_data = latex_generator.generate_nested_latex_report(case_data)
            file_content = ContentFile(pdf_bytes, name=filename)
            file_hash = calculate_string_hash(latex_content)
        elif format == 'CSV':
            from .services.latex_report_generator import latex_generator
            filename = f"report_case_{case.id}.csv"
            # Generate CSV from nested report generator
            _, _, csv_data = latex_generator.generate_nested_latex_report(case_data)
            file_content = ContentFile(csv_data.encode('utf-8'), name=filename)
            file_hash = calculate_string_hash(csv_data)
        elif format == 'JSON':
            filename = f"report_case_{case.id}.json"
            json_content = json.dumps(case_data, indent=2, default=str)
            file_content = ContentFile(json_content.encode('utf-8'), name=filename)
            file_hash = calculate_string_hash(json_content)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        # Get next version number
        last_report = Report.objects.filter(case=case, format=format).order_by('-version').first()
        version = (last_report.version + 1) if last_report else 1
        
        # Save report
        report = Report.objects.create(
            case=case,
            format=format,
            file_hash=file_hash,
            generated_by=user or case.created_by,
            version=version,
        )
        report.file.save(filename, file_content)
        report.save()
        
        logger.info(f"Generated {format} report for case {case_id}: version {version}")
        
    except Exception as e:
        logger.error(f"Error generating report for case {case_id}: {str(e)}")
