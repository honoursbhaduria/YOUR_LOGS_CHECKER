"""
Django signals for automated processing
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EvidenceFile, ParsedEvent
from .tasks import parse_evidence_file_task, score_events_task


@receiver(post_save, sender=EvidenceFile)
def trigger_parsing(sender, instance, created, **kwargs):
    """Automatically trigger parsing when evidence is uploaded"""
    print(f"[SIGNAL] EvidenceFile post_save triggered: created={created}, is_parsed={instance.is_parsed}, id={instance.id}")
    if created and not instance.is_parsed:
        # Trigger async parsing task (gracefully handle if Celery/Redis unavailable)
        try:
            print(f"[SIGNAL] Attempting to queue parsing task for file ID {instance.id}")
            result = parse_evidence_file_task.delay(instance.id)
            print(f"[SIGNAL] Task queued successfully: {result.id}")
        except Exception as e:
            print(f"[SIGNAL ERROR] Could not queue parsing task: {e}")


@receiver(post_save, sender=ParsedEvent)
def trigger_scoring(sender, instance, created, **kwargs):
    """Automatically trigger ML scoring after parsing"""
    if created:
        # Trigger async scoring task (gracefully handle if Celery/Redis unavailable)
        try:
            score_events_task.delay(instance.id)
        except Exception as e:
            print(f"Could not queue scoring task (Celery/Redis unavailable): {e}")
