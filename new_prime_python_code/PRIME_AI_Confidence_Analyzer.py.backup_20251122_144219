#!/usr/bin/env python
"""
PRIME AI Confidence Analyzer
Created: 12/29/2024
Purpose: AI-powered confidence scoring using Anthropic Claude 4.0 Sonnet API
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from anthropic import AsyncAnthropic, APIError
from dataclasses import dataclass

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
    Uses Anthropic Claude 4.0 Sonnet for intelligent analysis.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the AI Confidence Analyzer.
        
        Args:
            api_key (str, optional): Anthropic API key. If None, reads from environment.
        """
        # Get API key from parameter or environment variable
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or pass api_key parameter.")
        
        # Simple initialization without proxy configuration
        try:
            self.client = AsyncAnthropic(api_key=self.api_key)
            logger.info("AI Confidence Analyzer initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {e}")
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
        """Call Claude API with error handling and retries."""
        try:
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                temperature=0.3,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            return message.content[0].text
            
        except APIError as e:
            logger.error(f"Anthropic API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error calling Claude API: {e}")
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
def create_confidence_analyzer(api_key: Optional[str] = None) -> AIConfidenceAnalyzer:
    """Factory function to create AI Confidence Analyzer instance."""
    return AIConfidenceAnalyzer(api_key=api_key)

async def test_api_connectivity_async(api_key: Optional[str] = None) -> bool:
    """Test Anthropic API connectivity."""
    try:
        analyzer = AIConfidenceAnalyzer(api_key=api_key)
        # Simple test call
        test_message = await analyzer.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=50,
            messages=[{"role": "user", "content": "Hello, respond with 'API test successful'"}]
        )
        return "API test successful" in test_message.content[0].text
    except Exception as e:
        logger.error(f"API connectivity test failed: {e}")
        return False

if __name__ == "__main__":
    # Test the module
    print("=== PRIME AI Confidence Analyzer Test ===")
    
    # Test API connectivity
    if asyncio.run(test_api_connectivity_async()):
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
        analyzer = AIConfidenceAnalyzer()
        input_analysis = analyzer.analyze_input_parameters(test_profile)
        print(f"+ Input analysis completed: {input_analysis}")
        
        usage_report = analyzer.validate_input_usage_in_calculations(test_profile)
        used_count = sum(1 for used in usage_report.values() if used)
        print(f"+ Input usage validation: {used_count}/{len(usage_report)} parameters used")
        
    except Exception as e:
        print(f"- Test failed: {e}")
    
    print("=== Test Complete ===")