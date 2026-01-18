"""
Django signals for automated processing

NOTE: Celery/Redis signals are DISABLED for production reliability.
Parsing is done synchronously in the view's perform_create method.
This file is kept for reference but signals are commented out.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EvidenceFile, ParsedEvent

# DISABLED: Celery tasks require Redis which may not be available in production
# Parsing is now done synchronously in EvidenceFileViewSet.perform_create()

# @receiver(post_save, sender=EvidenceFile)
# def trigger_parsing(sender, instance, created, **kwargs):
#     """Automatically trigger parsing when evidence is uploaded"""
#     pass

# @receiver(post_save, sender=ParsedEvent)  
# def trigger_scoring(sender, instance, created, **kwargs):
#     """Automatically trigger ML scoring after parsing"""
#     pass
