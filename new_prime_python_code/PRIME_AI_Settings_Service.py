#!/usr/bin/env python3
"""
PRIME AI Settings Service
Fetches AI configuration from Next.js app settings API
"""

import os
import aiohttp
import logging
from typing import Dict, Optional, Any

logger = logging.getLogger('prime_ai_settings')


class AISettingsService:
    """
    Service to fetch AI provider configuration from the Next.js application.
    Reads the 'confidence_analysis' area settings to determine which LLM to use.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize AI Settings Service.
        
        Args:
            base_url: Base URL of the Next.js app (default: from env or localhost:3000)
        """
        self.base_url = base_url or os.getenv('AI_SETTINGS_API_URL', 'http://localhost:3000')
        self.settings_endpoint = '/api/ai/settings'
        logger.info(f"AISettingsService initialized with base_url: {self.base_url}")
    
    async def get_settings(self) -> Optional[Dict[str, Any]]:
        """
        Fetch complete AI settings from the API.
        
        Returns:
            Settings dictionary or None if fetch fails
        """
        url = f"{self.base_url}{self.settings_endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        settings = await response.json()
                        logger.info("Successfully fetched AI settings from API")
                        return settings
                    else:
                        error_text = await response.text()
                        logger.warning(f"Failed to fetch settings (HTTP {response.status}): {error_text}")
                        return None
        except aiohttp.ClientError as e:
            logger.warning(f"Network error fetching AI settings: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching AI settings: {e}")
            return None
    
    async def get_area_config(self, area_id: str) -> Dict[str, Optional[str]]:
        """
        Get AI configuration for a specific area (e.g., 'confidence_analysis').
        
        Args:
            area_id: Area identifier (e.g., 'confidence_analysis', 'chat_assistant')
            
        Returns:
            Dict with 'provider', 'model', and 'apiKey' keys (None if not configured)
        """
        settings = await self.get_settings()
        
        if not settings:
            logger.warning(f"No settings available for area: {area_id}")
            return {'provider': None, 'model': None, 'apiKey': None}
        
        # Find the area configuration
        areas = settings.get('areas', [])
        area = next((a for a in areas if a.get('id') == area_id), None)
        
        if not area:
            logger.warning(f"Area '{area_id}' not found in settings")
            return {'provider': None, 'model': None, 'apiKey': None}
        
        provider = area.get('currentProvider')
        model = area.get('currentModel')
        
        if not provider or not model:
            logger.warning(f"Area '{area_id}' has no provider/model configured")
            return {'provider': None, 'model': None, 'apiKey': None}
        
        # Get API key from provider configuration
        providers = settings.get('providers', {})
        provider_config = providers.get(provider, {})
        
        if not provider_config.get('enabled'):
            logger.warning(f"Provider '{provider}' is not enabled")
            return {'provider': None, 'model': None, 'apiKey': None}
        
        api_key = provider_config.get('apiKey')
        
        if not api_key:
            logger.warning(f"Provider '{provider}' has no API key configured")
            return {'provider': None, 'model': None, 'apiKey': None}
        
        logger.info(f"Area '{area_id}' configured: provider={provider}, model={model}")
        return {
            'provider': provider,
            'model': model,
            'apiKey': api_key,
            # baseUrl carries the custom OpenAI-compatible endpoint URL (cliproxy
            # etc.) through to the client; None for built-in providers. PRIME 2026-06-09.
            'baseUrl': provider_config.get('baseUrl')
        }
    
    async def get_fallback_config(self) -> Dict[str, Optional[str]]:
        """
        Get the first available provider configuration as fallback.
        Tries providers in order of preference.
        
        Returns:
            Dict with 'provider', 'model', and 'apiKey' keys
        """
        settings = await self.get_settings()
        
        if not settings:
            logger.warning("No settings available for fallback")
            return {'provider': None, 'model': None, 'apiKey': None}
        
        # Provider preference order (cheapest/fastest first)
        preferred_order = [
            'groq',       # Very cheap and fast
            'gemini',     # Cheap
            'openai',     # Moderate cost
            'anthropic',  # More expensive
            'perplexity',
            'mistral',
            'xai',
            'fireworks',
            'openrouter',
            'chutes',
            'minimax',
            'mercury'
        ]
        
        providers = settings.get('providers', {})
        
        for provider_name in preferred_order:
            provider_config = providers.get(provider_name, {})
            
            if provider_config.get('enabled') and provider_config.get('apiKey'):
                models = provider_config.get('models', [])
                if models and len(models) > 0:
                    model = models[0].get('id')
                    if model:
                        logger.info(f"Fallback provider selected: {provider_name} with model {model}")
                        return {
                            'provider': provider_name,
                            'model': model,
                            'apiKey': provider_config['apiKey'],
                            'baseUrl': provider_config.get('baseUrl')
                        }
        
        logger.warning("No fallback provider available")
        return {'provider': None, 'model': None, 'apiKey': None}


class SettingsNotFoundError(Exception):
    """Raised when AI settings cannot be fetched."""
    pass


# Test function
async def test_service():
    """Test the AI settings service."""
    service = AISettingsService()
    
    print("Testing AI Settings Service...")
    print(f"Base URL: {service.base_url}")
    print()
    
    # Test get area config
    print("1. Testing get_area_config('confidence_analysis')...")
    config = await service.get_area_config('confidence_analysis')
    print(f"   Provider: {config['provider']}")
    print(f"   Model: {config['model']}")
    print(f"   API Key: {'*' * 8 if config['apiKey'] else 'None'}")
    print()
    
    # Test fallback config
    print("2. Testing get_fallback_config()...")
    fallback = await service.get_fallback_config()
    print(f"   Provider: {fallback['provider']}")
    print(f"   Model: {fallback['model']}")
    print(f"   API Key: {'*' * 8 if fallback['apiKey'] else 'None'}")


if __name__ == '__main__':
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_service())
