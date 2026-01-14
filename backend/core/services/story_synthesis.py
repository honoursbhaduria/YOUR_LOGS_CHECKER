"""
Story Pattern Synthesis Service
Generates attack narratives from multiple scored events
Core differentiator vs traditional SIEM
"""
from typing import List, Dict
from datetime import datetime
import os


class StorySynthesisService:
    """
    Synthesizes attack stories from multiple security events
    Identifies attack phases and creates plain-English narratives
    """
    
    ATTACK_PHASES = [
        'INITIAL_ACCESS',
        'PERSISTENCE',
        'PRIVILEGE_ESCALATION',
        'LATERAL_MOVEMENT',
        'EXECUTION',
        'EXFILTRATION',
    ]
    
    def __init__(self, provider: str = 'openai', model: str = 'gpt-4'):
        self.provider = provider
        self.model = model
        
        if provider == 'openai':
            import openai
            openai.api_key = os.getenv('OPENAI_API_KEY')
            self.client = openai
        elif provider == 'anthropic':
            from anthropic import Anthropic
            self.client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    def synthesize_story(self, scored_events: List[Dict]) -> Dict:
        """
        Generate attack story from multiple events
        
        Args:
            scored_events: List of scored event dicts
            
        Returns:
            Dict with: title, narrative, attack_phase, confidence_summary
        """
        if not scored_events:
            return self._empty_story()
        
        # Sort by timestamp
        sorted_events = sorted(scored_events, key=lambda e: e['timestamp'])
        
        # Build timeline summary
        timeline = self._build_timeline(sorted_events)
        
        # Generate narrative with LLM
        prompt = self._build_story_prompt(sorted_events, timeline)
        
        try:
            narrative = self._generate_narrative(prompt)
            attack_phase = self._identify_attack_phase(narrative, scored_events)
            title = self._generate_title(narrative)
            
            return {
                'title': title,
                'narrative': narrative,
                'attack_phase': attack_phase,
                'avg_confidence': sum(e['confidence'] for e in scored_events) / len(scored_events),
                'event_count': len(scored_events),
                'time_span_start': sorted_events[0]['timestamp'],
                'time_span_end': sorted_events[-1]['timestamp'],
            }
        except Exception as e:
            return {
                'title': 'Story Generation Failed',
                'narrative': f'Error: {str(e)}',
                'attack_phase': 'UNKNOWN',
                'avg_confidence': 0.0,
                'event_count': len(scored_events),
                'time_span_start': sorted_events[0]['timestamp'],
                'time_span_end': sorted_events[-1]['timestamp'],
            }
    
    def _build_timeline(self, events: List[Dict]) -> str:
        """Build chronological timeline summary"""
        timeline_entries = []
        
        for i, event in enumerate(events[:20], 1):  # Limit to 20 for token economy
            time = event['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(event['timestamp'], datetime) else str(event['timestamp'])
            entry = f"{i}. [{time}] {event['event_type']} (confidence: {event['confidence']:.2f})"
            timeline_entries.append(entry)
        
        return '\n'.join(timeline_entries)
    
    def _build_story_prompt(self, events: List[Dict], timeline: str) -> str:
        """Build prompt for story synthesis"""
        return f"""You are a cybersecurity forensic analyst. Analyze these security events and create a coherent attack narrative.

TIMELINE OF EVENTS:
{timeline}

Task: Write a clear, plain-English story that explains:
1. What happened (initial access, actions taken, potential objectives)
2. Which attack phase this represents (Initial Access, Lateral Movement, etc.)
3. Why these events are suspicious together
4. Potential impact

Write 2-3 paragraphs. Be specific but executive-friendly. Focus on the story, not individual log entries."""
    
    def _generate_narrative(self, prompt: str) -> str:
        """Generate narrative with LLM"""
        if self.provider == 'openai':
            response = self.client.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior cybersecurity forensic analyst specializing in attack chain reconstruction."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=500,
            )
            return response.choices[0].message.content
        elif self.provider == 'anthropic':
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.5,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        
        return "LLM not configured"
    
    def _identify_attack_phase(self, narrative: str, events: List[Dict]) -> str:
        """Identify MITRE ATT&CK phase from narrative and events"""
        narrative_lower = narrative.lower()
        
        # Simple keyword matching (can be enhanced with ML)
        phase_keywords = {
            'INITIAL_ACCESS': ['initial access', 'login', 'remote', 'exploit', 'entry point'],
            'PERSISTENCE': ['persistence', 'scheduled task', 'startup', 'registry'],
            'PRIVILEGE_ESCALATION': ['privilege', 'escalation', 'admin', 'root', 'elevation'],
            'LATERAL_MOVEMENT': ['lateral', 'movement', 'rdp', 'psexec', 'smb'],
            'EXECUTION': ['execution', 'powershell', 'command', 'script', 'payload'],
            'EXFILTRATION': ['exfiltration', 'data transfer', 'upload', 'copy', 'steal'],
        }
        
        for phase, keywords in phase_keywords.items():
            if any(kw in narrative_lower for kw in keywords):
                return phase
        
        return 'UNKNOWN'
    
    def _generate_title(self, narrative: str) -> str:
        """Extract/generate short title from narrative"""
        # Take first sentence and truncate
        first_sentence = narrative.split('.')[0]
        if len(first_sentence) > 60:
            return first_sentence[:57] + '...'
        return first_sentence
    
    def _empty_story(self) -> Dict:
        """Return empty story structure"""
        return {
            'title': 'No Events',
            'narrative': 'No events available for story synthesis',
            'attack_phase': 'UNKNOWN',
            'avg_confidence': 0.0,
            'event_count': 0,
            'time_span_start': datetime.utcnow(),
            'time_span_end': datetime.utcnow(),
        }


def get_story_service() -> StorySynthesisService:
    """Get configured story synthesis service"""
    provider = os.getenv('DEFAULT_LLM_PROVIDER', 'openai')
    model = os.getenv('DEFAULT_LLM_MODEL', 'gpt-4')
    return StorySynthesisService(provider=provider, model=model)
