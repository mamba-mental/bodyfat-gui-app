#!/usr/bin/env python3
"""
PRIME AI Analyzer Factory
Simple factory to create AI confidence analyzer with configured LLM
"""

import os
import asyncio
import logging
from typing import Dict, Optional, Any

logger = logging.getLogger('prime_ai_factory')

try:
    from PRIME_Universal_LLM_Client import UniversalLLMClient
    from PRIME_AI_Settings_Service import AISettingsService
    UNIVERSAL_SUPPORT = True
except ImportError as e:
    logger.warning(f"Universal LLM support not available: {e}")
    UNIVERSAL_SUPPORT = False

try:
    from PRIME_AI_Confidence_Analyzer import AIConfidenceAnalyzer, ConfidenceScore
except ImportError:
    logger.error("PRIME_AI_Confidence_Analyzer not found")
    AIConfidenceAnalyzer = None
    ConfidenceScore = None


async def create_ai_analyzer_with_settings():
    """
    Create an AI Confidence Analyzer using settings from the app.
    
    Returns:
        Configured analyzer instance, or None if configuration fails
    """
    if not UNIVERSAL_SUPPORT or not AIConfidenceAnalyzer:
        logger.warning("Creating analyzer without universal LLM support")
        return None
    
    try:
        # Fetch LLM configuration from app settings
        service = AISettingsService()
        config = await service.get_area_config('confidence_analysis')
        
        if not config['provider']:
            logger.info("No area-specific config, trying fallback...")
            config = await service.get_fallback_config()
        
        if not config['provider'] or not config['apiKey']:
            logger.warning("No valid LLM configuration found in settings")
            return None
        
        # Create universal client (base_url threads the custom OpenAI-compatible
        # endpoint URL through for cliproxy / self-hosted servers; None for built-ins)
        client = UniversalLLMClient(
            provider=config['provider'],
            api_key=config['apiKey'],
            model=config['model'],
            base_url=config.get('baseUrl')
        )
        
        logger.info(
            f"Created AI analyzer with {config['provider']} "
            f"({config['model']})"
        )
        
        # Return a wrapper that uses the universal client
        return ConfigurableAIAnalyzer(client, config)
        
    except Exception as e:
        logger.error(f"Failed to create AI analyzer from settings: {e}")
        return None


class ConfigurableAIAnalyzer:
    """
    Wrapper for AI confidence analysis using configurable LLM.
    Mimics the interface of AIConfidenceAnalyzer.
    """
    
    def __init__(self, llm_client: 'UniversalLLMClient', config: Dict):
        self.client = llm_client
        self.provider = config['provider']
        self.model = config['model']
        logger.info(f"Configurable analyzer initialized: {self.provider}/{self.model}")
    
    def analyze_input_parameters(self, profile_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Analyze input parameters for reliability (non-AI heuristics).
        This matches the AIConfidenceAnalyzer interface.
        """
        try:
            required_params = [
                'current_weight', 'height_feet', 'height_inches', 'gender', 
                'dob', 'activity_factor', 'goal_weight', 'goal_bf'
            ]
            
            missing_params = [
                param for param in required_params 
                if param not in profile_data or profile_data[param] in (None, '', 0)
            ]
            
            # Simple heuristic scoring
            anthropometric_score = self._score_anthropometric(profile_data)
            activity_score = self._score_activity(profile_data)
            goal_score = self._score_goals(profile_data)
            completeness = max(0, 100 - (len(missing_params) * 15))
            
            return {
                'anthropometric_reliability': anthropometric_score,
                'activity_reliability': activity_score,
                'goal_reliability': goal_score,
                'data_completeness': completeness,
                'missing_parameters': missing_params
            }
            
        except Exception as e:
            logger.error(f"Error in input analysis: {e}")
            return {
                'anthropometric_reliability': 75.0,
                'activity_reliability': 75.0,
                'goal_reliability': 75.0,
                'data_completeness': 75.0,
                'missing_parameters': []
            }
    
    def _score_anthropometric(self, data: Dict) -> float:
        """Score anthropometric data quality."""
        score = 100.0
        weight = data.get('current_weight', 0)
        if weight < 80 or weight > 400:
            score -= 20
        return max(score, 0)
    
    def _score_activity(self, data: Dict) -> float:
        """Score activity data quality."""
        return 85.0  # Simple default
    
    def _score_goals(self, data: Dict) -> float:
        """Score goal feasibility."""
        score = 100.0
        current_weight = data.get('current_weight', 0)
        goal_weight = data.get('goal_weight', 0)
        if current_weight and goal_weight:
            change_pct = abs(current_weight - goal_weight) / current_weight * 100
            if change_pct > 30:
                score -= 25
        return max(score, 0)
    
    async def generate_ai_confidence_analysis(
        self,
        profile_data: Dict[str, Any],
        calculation_results: Dict[str, Any]
    ) -> 'ConfidenceScore':
        """
        Generate AI confidence analysis using configured LLM.
        """
        try:
            # Get input analysis first
            input_analysis = self.analyze_input_parameters(profile_data)
            
            # Build prompt
            prompt = self._build_prompt(profile_data, calculation_results, input_analysis)
            
            # Call LLM
            messages = [{'role': 'user', 'content': prompt}]
            response = await self.client.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=1500
            )
            
            # Parse response
            return self._parse_response(response, input_analysis)
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            # Return fallback score
            return self._fallback_score(input_analysis)
    
    def _build_prompt(self, profile: Dict, results: Dict, input_analysis: Dict) -> str:
        """Build analysis prompt."""
        return f"""Analyze this body transformation plan and provide confidence assessment in JSON format.

INPUT: Weight {profile.get('current_weight')}lbs → {profile.get('goal_weight')}lbs, BF {profile.get('current_bf')}% → {profile.get('goal_bf')}%
TDEE: {results.get('tdee')} cal, Daily: {results.get('daily_calorie_intake')} cal
DATA QUALITY: Anthropometric {input_analysis.get('anthropometric_reliability')}/100, Activity {input_analysis.get('activity_reliability')}/100

Provide JSON with:
{{
    "overall_confidence": <0-100>,
    "overall_confidence_explanation": "...",
    "input_reliability": <0-100>,
    "input_reliability_explanation": "...",
    "calculation_accuracy": <0-100>,
    "calculation_accuracy_explanation": "...",
    "goal_feasibility": <0-100>,
    "goal_feasibility_explanation": "...",
    "warnings": [...],
    "suggestions": [...],
    "confidence_factors": {{"timeframe_realism": <0-100>, ...}},
    "detailed_analysis": "..."
}}"""
    
    def _parse_response(self, response: str, input_analysis: Dict) -> 'ConfidenceScore':
        """Parse LLM JSON response into ConfidenceScore."""
        import json
        try:
            # Extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            json_str = response[start:end]
            data = json.loads(json_str)
            
            return ConfidenceScore(
                overall_score=float(data.get('overall_confidence', 75)),
                input_reliability=float(data.get('input_reliability', 75)),
                calculation_accuracy=float(data.get('calculation_accuracy', 85)),
                goal_feasibility=float(data.get('goal_feasibility', 70)),
                warnings=data.get('warnings', []),
                suggestions=data.get('suggestions', []),
                confidence_factors=data.get('confidence_factors', {}),
                overall_confidence_explanation=data.get('overall_confidence_explanation', ''),
                input_reliability_explanation=data.get('input_reliability_explanation', ''),
                calculation_accuracy_explanation=data.get('calculation_accuracy_explanation', ''),
                goal_feasibility_explanation=data.get('goal_feasibility_explanation', ''),
                detailed_analysis=data.get('detailed_analysis', '')
            )
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return self._fallback_score(input_analysis)
    
    def _fallback_score(self, input_analysis: Dict) -> 'ConfidenceScore':
        """Generate fallback score when AI fails."""
        avg = sum([
            input_analysis.get('anthropometric_reliability', 75),
            input_analysis.get('activity_reliability', 75),
            input_analysis.get('goal_reliability', 75),
            input_analysis.get('data_completeness', 75)
        ]) / 4
        
        return ConfidenceScore(
            overall_score=avg,
            input_reliability=avg,
            calculation_accuracy=85.0,
            goal_feasibility=70.0,
            warnings=["AI analysis unavailable - using fallback scoring"],
            suggestions=["Verify all inputs", "Consult fitness professional"],
            confidence_factors={"data_quality": avg}
        )


# Synchronous wrapper for backwards compatibility
def create_ai_analyzer_sync():
    """Synchronous version of create_ai_analyzer_with_settings."""
    try:
        return asyncio.run(create_ai_analyzer_with_settings())
    except Exception as e:
        logger.error(f"Failed to create analyzer: {e}")
        return None
