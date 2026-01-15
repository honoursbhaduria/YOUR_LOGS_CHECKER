"""
URL routing for Core API
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import *
from .auth_views import RegisterView, current_user, update_profile
from .google_auth import google_login

# Create router and register viewsets
router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'evidence', EvidenceFileViewSet, basename='evidence')
router.register(r'parsed-events', ParsedEventViewSet, basename='parsed-event')
router.register(r'scored-events', ScoredEventViewSet, basename='scored-event')
router.register(r'scoring', ScoringViewSet, basename='scoring')
router.register(r'filter', FilterViewSet, basename='filter')
router.register(r'story', StoryPatternViewSet, basename='story')
router.register(r'notes', InvestigationNoteViewSet, basename='note')
router.register(r'report', ReportViewSet, basename='report')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/google/', google_login, name='google_login'),
    path('auth/me/', current_user, name='current_user'),
    path('auth/profile/', update_profile, name='update_profile'),
    
    # API routes
    path('', include(router.urls)),
]
