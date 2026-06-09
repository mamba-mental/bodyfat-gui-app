#!/usr/bin/env python3
"""
PRIME Universal LLM Client
Supports multiple LLM providers with unified interface for chat completion
"""

import os
import json
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger('prime_universal_llm')


class UniversalLLMClient:
    """
    Universal client for multiple LLM providers.
    Supports: Anthropic, OpenAI, Gemini, Groq, Perplexity, Mistral, xAI, 
              Fireworks, OpenRouter, Chutes, MiniMax, Mercury
    """
    
    # Provider configurations
    PROVIDER_CONFIGS = {
        'anthropic': {
            'base_url': 'https://api.anthropic.com/v1',
            'chat_endpoint': '/messages',
            'api_version': '2023-06-01'
        },
        'openai': {
            'base_url': 'https://api.openai.com/v1',
            'chat_endpoint': '/chat/completions'
        },
        'gemini': {
            'base_url': 'https://generativelanguage.googleapis.com/v1beta',
            'chat_endpoint': '/models/{model}:generateContent'
        },
        'groq': {
            'base_url': 'https://api.groq.com/openai/v1',
            'chat_endpoint': '/chat/completions'
        },
        'perplexity': {
            'base_url': 'https://api.perplexity.ai',
            'chat_endpoint': '/chat/completions'
        },
        'mistral': {
            'base_url': 'https://api.mistral.ai/v1',
            'chat_endpoint': '/chat/completions'
        },
        'xai': {
            'base_url': 'https://api.x.ai/v1',
            'chat_endpoint': '/chat/completions'
        },
        'fireworks': {
            'base_url': 'https://api.fireworks.ai/inference/v1',
            'chat_endpoint': '/chat/completions'
        },
        'openrouter': {
            'base_url': 'https://openrouter.ai/api/v1',
            'chat_endpoint': '/chat/completions'
        },
        'chutes': {
            'base_url': 'https://api.chutes.ai/v1',
            'chat_endpoint': '/chat/completions'
        },
        'minimax': {
            'base_url': 'https://api.minimax.chat/v1',
            'chat_endpoint': '/chat/completions'
        },
        'mercury': {
            'base_url': 'https://api.mercury.ai/v1',
            'chat_endpoint': '/chat/completions'
        }
    }
    
    def __init__(self, provider: str, api_key: str, model: str, base_url: Optional[str] = None):
        """
        Initialize Universal LLM Client.
        
        Args:
            provider: Provider name (e.g., 'anthropic', 'openai', 'gemini')
            api_key: API key for the provider
            model: Model identifier
            base_url: Optional custom base URL (overrides default)
        """
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model
        
        if self.provider not in self.PROVIDER_CONFIGS:
            # Custom OpenAI-compatible endpoint (PRIME 2026-06-09): providers like
            # 'custom1'/'custom2'/'custom3' (a user-defined cliproxy / self-hosted
            # OpenAI-compatible server) are not in the hardcoded table. If a base_url
            # is supplied, treat the endpoint as OpenAI-compatible (/chat/completions);
            # otherwise it's a real misconfiguration → raise.
            if not base_url:
                raise ValueError(
                    f"Unsupported provider '{provider}'. Supported: "
                    f"{list(self.PROVIDER_CONFIGS.keys())} — or pass base_url for a "
                    f"custom OpenAI-compatible endpoint."
                )
            self.base_url = base_url.rstrip('/')
            self.chat_endpoint = '/chat/completions'
            logger.info(
                f"Initialized custom OpenAI-compatible client: provider={provider}, "
                f"base_url={self.base_url}, model={model}"
            )
        else:
            config = self.PROVIDER_CONFIGS[self.provider]
            self.base_url = base_url or config['base_url']
            self.chat_endpoint = config['chat_endpoint']
        
        logger.info(f"Initialized UniversalLLMClient: provider={provider}, model={model}")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1500
    ) -> str:
        """
        Universal chat completion method.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Response text from the LLM
        """
        if self.provider == 'anthropic':
            return await self._call_anthropic(messages, temperature, max_tokens)
        elif self.provider == 'gemini':
            return await self._call_gemini(messages, temperature, max_tokens)
        else:
            # OpenAI-compatible providers
            return await self._call_openai_compatible(messages, temperature, max_tokens)
    
    async def _call_anthropic(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> str:
        """Call Anthropic API (Claude models)."""
        url = f"{self.base_url}{self.chat_endpoint}"
        
        headers = {
            'x-api-key': self.api_key,
            'anthropic-version': self.PROVIDER_CONFIGS['anthropic']['api_version'],
            'content-type': 'application/json'
        }
        
        payload = {
            'model': self.model,
            'max_tokens': max_tokens,
            'temperature': temperature,
            'messages': messages
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Anthropic API error ({response.status}): {error_text}")
                
                data = await response.json()
                return data['content'][0]['text']
    
    async def _call_gemini(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> str:
        """Call Google Gemini API."""
        # Gemini uses a different endpoint format
        endpoint = self.chat_endpoint.format(model=self.model)
        url = f"{self.base_url}{endpoint}?key={self.api_key}"
        
        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            role = 'user' if msg['role'] in ['user', 'system'] else 'model'
            contents.append({
                'role': role,
                'parts': [{'text': msg['content']}]
            })
        
        payload = {
            'contents': contents,
            'generationConfig': {
                'temperature': temperature,
                'maxOutputTokens': max_tokens
            }
        }
        
        headers = {'Content-Type': 'application/json'}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Gemini API error ({response.status}): {error_text}")
                
                data = await response.json()
                return data['candidates'][0]['content']['parts'][0]['text']
    
    async def _call_openai_compatible(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> str:
        """
        Call OpenAI-compatible APIs.
        Works for: OpenAI, Groq, Perplexity, Mistral, xAI, Fireworks,
                   OpenRouter, Chutes, MiniMax, Mercury
        """
        url = f"{self.base_url}{self.chat_endpoint}"
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        # OpenRouter requires additional headers
        if self.provider == 'openrouter':
            headers['HTTP-Referer'] = 'https://apexfit.ai'
            headers['X-Title'] = 'ApexFit PRIME'
        
        payload = {
            'model': self.model,
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"{self.provider.title()} API error ({response.status}): {error_text}")
                
                data = await response.json()
                return data['choices'][0]['message']['content']


# Test function
async def test_client():
    """Test the universal client with a simple prompt."""
    # Example: Test with OpenAI (or any configured provider)
    provider = os.getenv('TEST_PROVIDER', 'openai')
    api_key = os.getenv('TEST_API_KEY', '')
    model = os.getenv('TEST_MODEL', 'gpt-4o-mini')
    
    if not api_key:
        print("Set TEST_PROVIDER, TEST_API_KEY, and TEST_MODEL environment variables to test")
        return
    
    client = UniversalLLMClient(provider, api_key, model)
    
    messages = [
        {'role': 'user', 'content': 'Say "Hello from Universal LLM Client!" and nothing else.'}
    ]
    
    try:
        response = await client.chat_completion(messages, temperature=0.1, max_tokens=50)
        print(f"✓ Test successful!")
        print(f"Provider: {provider}")
        print(f"Model: {model}")
        print(f"Response: {response}")
    except Exception as e:
        print(f"✗ Test failed: {e}")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_client())
