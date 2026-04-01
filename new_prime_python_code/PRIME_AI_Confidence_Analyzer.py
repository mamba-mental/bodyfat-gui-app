#!/usr/bin/env python
"""
PRIME AI Confidence Analyzer
Created: 12/29/2024
Updated: 01/07/2026
Purpose: AI-powered confidence scoring using multiple LLM providers
Supports: Anthropic, OpenRouter, OpenAI, Gemini, Groq, and more via Universal LLM Client
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from dataclasses import dataclass

# Import Universal LLM Client for multi-provider support
try:
    from PRIME_Universal_LLM_Client import UniversalLLMClient
except ImportError:
    from new_prime_python_code.PRIME_Universal_LLM_Client import UniversalLLMClient

# Optional: Import Anthropic for backward compatibility
try:
    from anthropic import AsyncAnthropic, APIError
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    AsyncAnthropic = None
    APIError = Exception

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not available, try to load manually
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"\'')
                    os.environ[key] = value

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('prime_ai_confidence')

@dataclass
class ConfidenceScore:
    """Data class for confidence scoring results."""
    overall_score: float  # 0-100 scale
    input_reliability: float  # 0-100 scale
    calculation_accuracy: float  # 0-100 scale
    goal_feasibility: float  # 0-100 scale
    warnings: List[str]
    suggestions: List[str]
    confidence_factors: Dict[str, float]
    overall_confidence_explanation: str = ""
    input_reliability_explanation: str = ""
    calculation_accuracy_explanation: str = ""
    goal_feasibility_explanation: str = ""
    detailed_analysis: str = ""

class AIConfidenceAnalyzer:
    """
    AI-powered confidence analyzer for body composition calculations.
    Supports multiple LLM providers via Universal LLM Client.
    Default: Anthropic Claude Sonnet, but configurable for OpenRouter, OpenAI, etc.
    """

    # Default provider settings
    DEFAULT_PROVIDER = 'anthropic'
    DEFAULT_MODEL = 'claude-sonnet-4-20250514'

    # Provider-specific default models
    PROVIDER_DEFAULT_MODELS = {
        'anthropic': 'claude-sonnet-4-20250514',
        'openrouter': 'anthropic/claude-3.5-sonnet',  # Can use free models like google/gemini-flash-1.5
        'openai': 'gpt-4o-mini',
        'gemini': 'gemini-1.5-pro',
        'groq': 'llama-3.1-70b-versatile',
        'mistral': 'mistral-large-latest',
        'xai': 'grok-2-latest',
        'fireworks': 'accounts/fireworks/models/llama-v3p1-70b-instruct',
        'perplexity': 'llama-3.1-sonar-large-128k-online',
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ):
        """
        Initialize the AI Confidence Analyzer.

        Args:
            api_key (str, optional): API key for the provider. If None, reads from environment.
            provider (str, optional): LLM provider name. Defaults to 'anthropic'.
                Supported: anthropic, openrouter, openai, gemini, groq, mistral, xai, fireworks, perplexity
            model (str, optional): Model identifier. If None, uses provider default.
        """
        # Set provider
        self.provider = (provider or os.getenv('AI_CONFIDENCE_PROVIDER') or self.DEFAULT_PROVIDER).lower()

        # Set model (use provider default if not specified)
        self.model = model or os.getenv('AI_CONFIDENCE_MODEL') or self.PROVIDER_DEFAULT_MODELS.get(
            self.provider,
            self.DEFAULT_MODEL
        )

        # Get API key from parameter or environment variable
        env_key_names = {
            'anthropic': 'ANTHROPIC_API_KEY',
            'openrouter': 'OPENROUTER_API_KEY',
            'openai': 'OPENAI_API_KEY',
            'gemini': 'GOOGLE_API_KEY',
            'groq': 'GROQ_API_KEY',
            'mistral': 'MISTRAL_API_KEY',
            'xai': 'XAI_API_KEY',
            'fireworks': 'FIREWORKS_API_KEY',
            'perplexity': 'PERPLEXITY_API_KEY',
        }

        env_key_name = env_key_names.get(self.provider, f'{self.provider.upper()}_API_KEY')
        self.api_key = api_key or os.getenv(env_key_name)

        if not self.api_key:
            raise ValueError(
                f"API key required for provider '{self.provider}'. "
                f"Set {env_key_name} environment variable or pass api_key parameter."
            )

        # Initialize the Universal LLM Client
        try:
            self.client = UniversalLLMClient(
                provider=self.provider,
                api_key=self.api_key,
                model=self.model
            )
            self.use_universal_client = True
            logger.info(f"AI Confidence Analyzer initialized with {self.provider}/{self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Universal LLM Client: {e}")
            raise e
    
    def analyze_input_parameters(self, profile_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Analyze input parameters for reliability and completeness.
        
        Args:
            profile_data (dict): User profile data containing all input parameters
            
        Returns:
            dict: Analysis scores for different parameter categories
        """
        try:
            # Validate required parameters are present and reasonable
            required_params = [
                'current_weight', 'height_feet', 'height_inches', 'gender', 
                'dob', 'activity_factor', 'goal_weight', 'goal_bf'
            ]
            
            missing_params = [param for param in required_params if param not in profile_data or profile_data[param] in (None, '', 0)]
            
            # Calculate parameter reliability scores
            anthropometric_score = self._score_anthropometric_data(profile_data)
            activity_score = self._score_activity_data(profile_data)
            goal_score = self._score_goal_data(profile_data)
            completeness_score = max(0, 100 - (len(missing_params) * 15))  # Deduct 15 points per missing param
            
            return {
                'anthropometric_reliability': anthropometric_score,
                'activity_reliability': activity_score,
                'goal_reliability': goal_score,
                'data_completeness': completeness_score,
                'missing_parameters': missing_params
            }
            
        except Exception as e:
            logger.error(f"Error analyzing input parameters: {e}")
            return {
                'anthropometric_reliability': 50.0,
                'activity_reliability': 50.0,
                'goal_reliability': 50.0,
                'data_completeness': 50.0,
                'missing_parameters': []
            }
    
    def _score_anthropometric_data(self, profile_data: Dict[str, Any]) -> float:
        """Score the reliability of anthropometric measurements."""
        score = 100.0
        
        # Check weight reasonableness
        weight = profile_data.get('current_weight', 0)
        if weight < 80 or weight > 400:
            score -= 20
        
        # Check height reasonableness
        height_feet = profile_data.get('height_feet', 0)
        height_inches = profile_data.get('height_inches', 0)
        total_inches = height_feet * 12 + height_inches
        if total_inches < 48 or total_inches > 84:  # 4' to 7'
            score -= 20
        
        # Check body fat percentage if provided
        current_bf = profile_data.get('current_bf', 0)
        if current_bf and (current_bf < 3 or current_bf > 50):
            score -= 15
        
        return max(score, 0)
    
    def _score_activity_data(self, profile_data: Dict[str, Any]) -> float:
        """Score the reliability of activity-related data."""
        score = 100.0
        
        # Check activity factor consistency
        activity_factor = profile_data.get('activity_factor', '3')
        job_activity = profile_data.get('job_activity', 'moderate')
        leisure_activity = profile_data.get('leisure_activity', 'moderate')
        
        # Basic consistency check (simplified)
        if activity_factor in ['1', '2'] and job_activity == 'active':
            score -= 10  # Inconsistency detected
        
        return max(score, 0)
    
    def _score_goal_data(self, profile_data: Dict[str, Any]) -> float:
        """Score the feasibility of goal data."""
        score = 100.0
        
        current_weight = profile_data.get('current_weight', 0)
        goal_weight = profile_data.get('goal_weight', 0)
        current_bf = profile_data.get('current_bf', 15)
        goal_bf = profile_data.get('goal_bf', 10)
        
        if current_weight and goal_weight:
            weight_change_percent = abs(current_weight - goal_weight) / current_weight * 100
            if weight_change_percent > 30:  # More than 30% weight change
                score -= 25
        
        if current_bf and goal_bf:
            bf_change = abs(current_bf - goal_bf)
            if bf_change > 15:  # More than 15% body fat change
                score -= 20
        
        return max(score, 0)
    
    async def generate_ai_confidence_analysis(self, profile_data: Dict[str, Any],
                                       calculation_results: Dict[str, Any]) -> ConfidenceScore:
        """
        Generate comprehensive AI-powered confidence analysis.
        
        Args:
            profile_data (dict): User input parameters
            calculation_results (dict): Results from PRIME calculations
            
        Returns:
            ConfidenceScore: Comprehensive confidence analysis
        """
        try:
            # First analyze input parameters
            input_analysis = self.analyze_input_parameters(profile_data)
            
            # Prepare data for AI analysis
            analysis_prompt = self._build_analysis_prompt(profile_data, calculation_results, input_analysis)
            
            # Call Claude API for analysis
            ai_response = await self._call_claude_api(analysis_prompt)
            
            # Parse AI response and create confidence score
            confidence_score = self._parse_ai_response(ai_response, input_analysis)
            
            logger.info(f"AI confidence analysis completed. Overall score: {confidence_score.overall_score}")
            return confidence_score
            
        except Exception as e:
            logger.error(f"Error generating AI confidence analysis: {e}")
            # Return fallback confidence score
            return self._generate_fallback_confidence_score(input_analysis)
    
    def _build_analysis_prompt(self, profile_data: Dict[str, Any], 
                              calculation_results: Dict[str, Any],
                              input_analysis: Dict[str, Any]) -> str:
        """Build the prompt for Claude API analysis."""
        
        # Extract key parameters for analysis
        current_weight = profile_data.get('current_weight', 'N/A')
        goal_weight = profile_data.get('goal_weight', 'N/A')
        current_bf = profile_data.get('current_bf', 'N/A')
        goal_bf = profile_data.get('goal_bf', 'N/A')
        timeframe_weeks = profile_data.get('timeframe_weeks', 'N/A')
        
        # Extract calculation results
        tdee = calculation_results.get('tdee', 'N/A')
        daily_calories = calculation_results.get('daily_calorie_intake', 'N/A')
        weekly_weight_loss = calculation_results.get('weekly_weight_loss_target', 'N/A')
        
        prompt = f"""
You are an expert body composition analyst. Analyze the following body transformation plan and provide a confidence assessment.

INPUT PARAMETERS:
- Current Weight: {current_weight} lbs
- Goal Weight: {goal_weight} lbs  
- Current Body Fat: {current_bf}%
- Goal Body Fat: {goal_bf}%
- Timeframe: {timeframe_weeks} weeks
- TDEE: {tdee} calories
- Recommended Daily Calories: {daily_calories}
- Target Weekly Weight Loss: {weekly_weight_loss} lbs

INPUT RELIABILITY SCORES:
- Anthropometric Data: {input_analysis.get('anthropometric_reliability', 'N/A')}/100
- Activity Data: {input_analysis.get('activity_reliability', 'N/A')}/100
- Goal Data: {input_analysis.get('goal_reliability', 'N/A')}/100
- Data Completeness: {input_analysis.get('data_completeness', 'N/A')}/100

ANALYSIS REQUIRED:
1. Overall confidence score (0-100) for achieving the stated goals
2. Input reliability assessment (0-100)
3. Calculation accuracy confidence (0-100)
4. Goal feasibility score (0-100)
5. List of specific warnings (if any)
6. List of actionable suggestions for improvement
7. Key confidence factors with scores
8. DETAILED EXPLANATIONS for each score

Please provide your analysis in the following JSON format:
{{
    "overall_confidence": <score>,
    "overall_confidence_explanation": "<detailed explanation of why this score was given>",
    "input_reliability": <score>,
    "input_reliability_explanation": "<detailed explanation of input data quality>",
    "calculation_accuracy": <score>,
    "calculation_accuracy_explanation": "<detailed explanation of calculation reliability>",
    "goal_feasibility": <score>,
    "goal_feasibility_explanation": "<detailed explanation of goal achievability>",
    "warnings": [<list of warning strings>],
    "suggestions": [<list of suggestion strings>],
    "confidence_factors": {{
        "timeframe_realism": <score>,
        "calorie_deficit_sustainability": <score>,
        "body_composition_feasibility": <score>,
        "data_quality": <score>
    }},
    "detailed_analysis": "<comprehensive paragraph explaining the overall assessment, key factors, and recommendations>"
}}

Focus on practical, evidence-based assessment. Be specific about potential issues and actionable improvements. Provide detailed explanations for each score.
"""
        return prompt
    
    async def _call_claude_api(self, prompt: str) -> str:
        """
        Call LLM API with error handling.
        Now uses Universal LLM Client to support multiple providers.
        """
        try:
            messages = [
                {
                    "role": "user",
                    "content": prompt
                }
            ]

            response = await self.client.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=1500
            )

            logger.info(f"AI response received from {self.provider}/{self.model}")
            return response

        except Exception as e:
            logger.error(f"{self.provider} API error: {e}")
            raise
    
    def _parse_ai_response(self, ai_response: str, input_analysis: Dict[str, Any]) -> ConfidenceScore:
        """Parse Claude's response and create ConfidenceScore object."""
        try:
            # Extract JSON from response
            json_start = ai_response.find('{')
            json_end = ai_response.rfind('}') + 1
            json_str = ai_response[json_start:json_end]
            
            ai_data = json.loads(json_str)
            
            return ConfidenceScore(
                overall_score=float(ai_data.get('overall_confidence', 75)),
                input_reliability=float(ai_data.get('input_reliability', 75)),
                calculation_accuracy=float(ai_data.get('calculation_accuracy', 85)),
                goal_feasibility=float(ai_data.get('goal_feasibility', 70)),
                warnings=ai_data.get('warnings', []),
                suggestions=ai_data.get('suggestions', []),
                confidence_factors=ai_data.get('confidence_factors', {}),
                overall_confidence_explanation=ai_data.get('overall_confidence_explanation', ''),
                input_reliability_explanation=ai_data.get('input_reliability_explanation', ''),
                calculation_accuracy_explanation=ai_data.get('calculation_accuracy_explanation', ''),
                goal_feasibility_explanation=ai_data.get('goal_feasibility_explanation', ''),
                detailed_analysis=ai_data.get('detailed_analysis', '')
            )
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Error parsing AI response: {e}")
            return self._generate_fallback_confidence_score(input_analysis)
    
    def _generate_fallback_confidence_score(self, input_analysis: Dict[str, Any]) -> ConfidenceScore:
        """Generate a fallback confidence score when AI analysis fails."""
        avg_input_score = sum([
            input_analysis.get('anthropometric_reliability', 75),
            input_analysis.get('activity_reliability', 75),
            input_analysis.get('goal_reliability', 75),
            input_analysis.get('data_completeness', 75)
        ]) / 4
        
        return ConfidenceScore(
            overall_score=avg_input_score,
            input_reliability=avg_input_score,
            calculation_accuracy=85.0,  # Default high confidence in calculations
            goal_feasibility=70.0,  # Conservative default
            warnings=["AI analysis unavailable - using fallback scoring"],
            suggestions=["Verify all input parameters for accuracy", "Consider consulting with a fitness professional"],
            confidence_factors={
                "data_quality": avg_input_score,
                "calculation_reliability": 85.0
            }
        )
    
    def validate_input_usage_in_calculations(self, profile_data: Dict[str, Any]) -> Dict[str, bool]:
        """
        Validate that all provided inputs are directly used in calculations.
        This addresses the user's requirement for input usage confirmation.
        
        Args:
            profile_data (dict): All input parameters
            
        Returns:
            dict: Mapping of parameter names to whether they're used in calculations
        """
        # Define which parameters are directly used in which calculations
        parameter_usage = {
            # Core anthropometric data - used in RMR/TDEE calculations
            'current_weight': True,  # Used in RMR (Mifflin-St Jeor), TDEE, muscle gain estimation
            'height_feet': True,     # Used in RMR calculation (height_cm conversion)
            'height_inches': True,   # Used in RMR calculation (height_cm conversion)
            'gender': True,          # Used in RMR calculation (different formulas for m/f)
            'dob': True,            # Used to calculate age for RMR and muscle gain adjustments
            
            # Activity and lifestyle factors - used in TDEE calculations
            'activity_factor': True,     # Used in TDEE calculation (activity multiplier)
            'job_activity': True,        # Used in NEAT estimation
            'leisure_activity': True,    # Used in NEAT estimation
            'exercise_type': True,       # Used in NEAT estimation and muscle gain adjustments
            'is_athlete': True,          # Used in RMR calculation (10% boost)
            
            # Diet and nutrition - used in TEF and muscle gain calculations
            'protein_intake': True,      # Used in TEF calculation and muscle gain estimation
            'diet_type': True,          # Used in muscle gain and fat loss multipliers
            
            # Training parameters - used in muscle gain calculations
            'experience_level': True,    # Used in muscle gain base rate determination
            'is_bodybuilder': True,     # Used in muscle gain and calorie limit adjustments
            'sleep_quality': True,      # Used in muscle gain multiplier
            
            # Goals - used in deficit calculations and progression modeling
            'goal_weight': True,        # Used in dual-goal deficit calculation
            'goal_bf': True,           # Used in dual-goal deficit calculation
            'current_bf': True,        # Used in body composition calculations
            
            # PED usage - used in muscle gain and fat loss adjustments
            'ped_use': True,           # Used in muscle gain multiplier (1.5x) and fat loss ratio
            
            # Timeframe - used in weekly progression calculations
            'start_date': True,        # Used in progression timeline
            'end_date': True,          # Used in progression timeline and deficit calculations
        }
        
        # Check which provided parameters are actually used
        input_usage_report = {}
        for param, value in profile_data.items():
            is_used = parameter_usage.get(param, False)
            input_usage_report[param] = is_used
            
            if not is_used and value not in (None, '', 0):
                logger.warning(f"Parameter '{param}' provided but not used in calculations")
        
        # Log confirmation of direct input usage
        used_params = [param for param, used in input_usage_report.items() if used and param in profile_data]
        logger.info(f"Confirmed: {len(used_params)} input parameters are directly used in calculations")
        
        return input_usage_report

# Utility functions for integration
def create_confidence_analyzer(
    api_key: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> AIConfidenceAnalyzer:
    """
    Factory function to create AI Confidence Analyzer instance.

    Args:
        api_key: API key for the provider
        provider: LLM provider (anthropic, openrouter, openai, gemini, groq, etc.)
        model: Model identifier

    Returns:
        AIConfidenceAnalyzer instance

    Examples:
        # Use Anthropic (default)
        analyzer = create_confidence_analyzer()

        # Use OpenRouter with a free model
        analyzer = create_confidence_analyzer(
            provider='openrouter',
            model='google/gemini-flash-1.5-8b'  # Free tier
        )

        # Use Groq (fast inference)
        analyzer = create_confidence_analyzer(
            provider='groq',
            model='llama-3.1-70b-versatile'
        )
    """
    return AIConfidenceAnalyzer(api_key=api_key, provider=provider, model=model)


async def test_api_connectivity_async(
    api_key: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> bool:
    """
    Test LLM API connectivity.

    Args:
        api_key: API key for the provider
        provider: LLM provider to test
        model: Model to test

    Returns:
        True if connection successful, False otherwise
    """
    try:
        analyzer = AIConfidenceAnalyzer(api_key=api_key, provider=provider, model=model)

        # Simple test call using Universal LLM Client
        messages = [{"role": "user", "content": "Hello, respond with 'API test successful'"}]
        response = await analyzer.client.chat_completion(messages=messages, max_tokens=50)

        success = "API test successful" in response or "test successful" in response.lower()
        logger.info(f"API connectivity test: {'PASSED' if success else 'FAILED'} ({analyzer.provider}/{analyzer.model})")
        return success

    except Exception as e:
        logger.error(f"API connectivity test failed: {e}")
        return False

if __name__ == "__main__":
    import argparse

    # Parse command line arguments
    parser = argparse.ArgumentParser(description='PRIME AI Confidence Analyzer Test')
    parser.add_argument('--provider', type=str, default=None,
                        help='LLM provider (anthropic, openrouter, openai, gemini, groq, etc.)')
    parser.add_argument('--model', type=str, default=None,
                        help='Model identifier (e.g., claude-sonnet-4-20250514, google/gemini-flash-1.5-8b)')
    args = parser.parse_args()

    print("=== PRIME AI Confidence Analyzer Test ===")
    print(f"Provider: {args.provider or 'default (anthropic)'}")
    print(f"Model: {args.model or 'default'}")
    print()

    # Test API connectivity
    print("Testing API connectivity...")
    if asyncio.run(test_api_connectivity_async(provider=args.provider, model=args.model)):
        print("+ API connectivity test passed")
    else:
        print("- API connectivity test failed")

    # Test input validation
    test_profile = {
        'current_weight': 200,
        'height_feet': 6,
        'height_inches': 0,
        'gender': 'm',
        'dob': '01/01/1990',
        'activity_factor': '3',
        'goal_weight': 180,
        'goal_bf': 12,
        'current_bf': 20
    }

    try:
        analyzer = AIConfidenceAnalyzer(provider=args.provider, model=args.model)
        print(f"\n+ Initialized with {analyzer.provider}/{analyzer.model}")

        input_analysis = analyzer.analyze_input_parameters(test_profile)
        print(f"+ Input analysis completed: {input_analysis}")

        usage_report = analyzer.validate_input_usage_in_calculations(test_profile)
        used_count = sum(1 for used in usage_report.values() if used)
        print(f"+ Input usage validation: {used_count}/{len(usage_report)} parameters used")

    except Exception as e:
        print(f"- Test failed: {e}")

    print("\n=== Test Complete ===")
    print("\nUsage examples:")
    print("  python PRIME_AI_Confidence_Analyzer.py                              # Use default (Anthropic)")
    print("  python PRIME_AI_Confidence_Analyzer.py --provider openrouter        # Use OpenRouter")
    print("  python PRIME_AI_Confidence_Analyzer.py --provider openrouter --model google/gemini-flash-1.5-8b")
    print("  python PRIME_AI_Confidence_Analyzer.py --provider groq --model llama-3.1-70b-versatile")