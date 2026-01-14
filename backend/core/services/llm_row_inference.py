"""
LLM Row-Level Inference Service
Provides technical one-sentence explanations for individual events
"""
from typing import Optional
import os


class LLMInferenceService:
    """
    LLM service for generating row-level explanations
    Supports OpenAI, Anthropic, and Google Gemini
    """
    
    def __init__(self, provider: str = 'google', model: str = 'gemini-2.5-flash'):
        """
        Initialize LLM service
        
        Args:
            provider: 'openai', 'anthropic', or 'google'
            model: Model name
        """
        self.provider = provider
        self.model = model
        
        if provider == 'openai':
            import openai
            openai.api_key = os.getenv('OPENAI_API_KEY')
            self.client = openai
        elif provider == 'anthropic':
            from anthropic import Anthropic
            self.client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        elif provider == 'google':
            import google.generativeai as genai
            api_key = os.getenv('GOOGLE_API_KEY')
            if not api_key:
                raise ValueError("GOOGLE_API_KEY not found in environment variables")
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel(model)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def generate_explanation(self, event_data: dict) -> str:
        """
        Generate one-sentence technical explanation for event
        
        Args:
            event_data: Dict with timestamp, user, host, event_type, raw_message
            
        Returns:
            One-sentence explanation string
        """
        prompt = self._build_prompt(event_data)
        
        try:
            if self.provider == 'openai':
                response = self._openai_inference(prompt)
            elif self.provider == 'anthropic':
                response = self._anthropic_inference(prompt)
            elif self.provider == 'google':
                response = self._google_inference(prompt)
            else:
                response = "LLM provider not configured"
            
            return response.strip()
        except Exception as e:
            return f"Error generating explanation: {str(e)}"
    
    def _build_prompt(self, event_data: dict) -> str:
        """Build prompt for LLM"""
        return f"""Explain this security event in ONE technical sentence:

Event Type: {event_data['event_type']}
User: {event_data.get('user', 'N/A')}
Host: {event_data.get('host', 'N/A')}
Timestamp: {event_data.get('timestamp', 'N/A')}
Context: {event_data['raw_message'][:200]}

Provide a concise, technical explanation of what this event means and why it might be security-relevant."""
    
    def _openai_inference(self, prompt: str) -> str:
        """Call OpenAI API"""
        response = self.client.ChatCompletion.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a cybersecurity analyst. Explain log events concisely in one sentence."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Low creativity for deterministic output
            max_tokens=100,
        )
        return response.choices[0].message.content
    
    def _anthropic_inference(self, prompt: str) -> str:
        """Call Anthropic API"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=100,
            temperature=0.3,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text
    
    def _google_inference(self, prompt: str) -> str:
        """Call Google Gemini API"""
        response = self.client.generate_content(
            prompt,
            generation_config={
                'temperature': 0.3,
                'max_output_tokens': 100,
            }
        )
        return response.text


# Singleton instance
def get_llm_service() -> LLMInferenceService:
    """Get configured LLM service instance"""
    provider = os.getenv('DEFAULT_LLM_PROVIDER', 'google')
    model = os.getenv('DEFAULT_LLM_MODEL', 'gemini-2.5-flash')
    return LLMInferenceService(provider=provider, model=model)
