#!/usr/bin/env python3
"""
Simple test API server for testing frontend-backend report generation connection
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(
    title="Test Report API",
    description="Simple test API for frontend-backend report generation",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserData(BaseModel):
    name: str
    age: int
    gender: str
    current_weight: float
    goal_weight: float
    current_bf: float
    goal_bf: float
    height_feet: Optional[int] = 5
    height_inches: Optional[int] = 10
    height_cm: Optional[float] = 177.8
    timeline_weeks: Optional[int] = 16

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "test-report-api"}

@app.post("/generate-report")
async def generate_test_report(user_data: UserData):
    """Generate a test HTML report"""
    try:
        # Calculate some basic metrics
        weight_loss_needed = user_data.current_weight - user_data.goal_weight
        bf_reduction_needed = user_data.current_bf - user_data.goal_bf
        
        # Generate comprehensive test HTML report with all PRIME-like sections
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRIME Body Composition Analysis Report - {user_data.name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }}
        .section {{
            padding: 30px;
            border-bottom: 1px solid #ecf0f1;
        }}
        .section:last-child {{
            border-bottom: none;
        }}
        .section h2 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #dee2e6;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}
        .metric-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }}
        .metric-value {{
            font-size: 2.5em;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
        }}
        .metric-label {{
            color: #6c757d;
            font-size: 0.9em;
            font-weight: 500;
        }}
        .progress-container {{
            margin: 20px 0;
        }}
        .progress-bar {{
            width: 100%;
            height: 20px;
            background: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }}
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 10px;
            transition: width 0.8s ease;
        }}
        .progress-text {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }}
        .chart-placeholder {{
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            height: 300px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            font-size: 1.1em;
            margin: 20px 0;
            border: 2px dashed #dee2e6;
        }}
        .recommendation-card {{
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            border-left: 5px solid #2196f3;
            padding: 20px;
            margin: 15px 0;
            border-radius: 5px;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        .info-item {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }}
        .info-label {{
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }}
        .footer {{
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }}
        .ai-insight {{
            background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            border-left: 5px solid #ff9800;
        }}
        .weekly-breakdown {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        .week-card {{
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            transition: all 0.3s ease;
        }}
        .week-card:hover {{
            border-color: #3498db;
            transform: scale(1.02);
        }}
        .section-number {{
            background: #3498db;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            font-weight: bold;
        }}
        @media (max-width: 768px) {{
            .container {{
                margin: 10px;
                border-radius: 10px;
            }}
            .header h1 {{
                font-size: 2em;
            }}
            .section {{
                padding: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 PRIME Body Composition Analysis</h1>
            <p>Personalized Report for {user_data.name}</p>
            <p style="opacity: 0.8; font-size: 0.9em;">Generated with Advanced AI Analytics</p>
        </div>

        <!-- Section 1: Executive Summary -->
        <div class="section">
            <h2><span class="section-number">1</span>Executive Summary</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{weight_loss_needed:.1f}</div>
                    <div class="metric-label">lbs to lose</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{bf_reduction_needed:.1f}%</div>
                    <div class="metric-label">Body fat reduction</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{user_data.timeline_weeks}</div>
                    <div class="metric-label">Week timeline</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{(weight_loss_needed/user_data.timeline_weeks):.1f}</div>
                    <div class="metric-label">lbs per week</div>
                </div>
            </div>
            <div class="ai-insight">
                <h4>🧠 AI Key Insight</h4>
                <p>Based on your profile, this transformation plan is <strong>highly achievable</strong> with the right approach. Your target of {weight_loss_needed:.1f} lbs over {user_data.timeline_weeks} weeks represents a sustainable rate that should preserve lean muscle mass.</p>
            </div>
        </div>

        <!-- Section 2: Current Assessment -->
        <div class="section">
            <h2><span class="section-number">2</span>Current Physical Assessment</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Current Weight</div>
                    <div>{user_data.current_weight:.1f} lbs</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Current Body Fat</div>
                    <div>{user_data.current_bf:.1f}%</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Lean Body Mass</div>
                    <div>{(user_data.current_weight * (1 - user_data.current_bf/100)):.1f} lbs</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Age</div>
                    <div>{user_data.age} years</div>
                </div>
            </div>
            <div class="chart-placeholder">
                📊 Body Composition Breakdown Chart
                <br><small>(Interactive charts available in full version)</small>
            </div>
        </div>

        <!-- Section 3: Goal Analysis -->
        <div class="section">
            <h2><span class="section-number">3</span>Goal Analysis & Targets</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{user_data.goal_weight:.1f}</div>
                    <div class="metric-label">Target Weight (lbs)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{user_data.goal_bf:.1f}%</div>
                    <div class="metric-label">Target Body Fat</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{(user_data.goal_weight * (1 - user_data.goal_bf/100)):.1f}</div>
                    <div class="metric-label">Target Lean Mass (lbs)</div>
                </div>
            </div>
            
            <div class="progress-container">
                <h4>Weight Loss Progress Target</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 25%"></div>
                    <div class="progress-text">Week 4 Target</div>
                </div>
            </div>
        </div>

        <!-- Section 4: Metabolic Analysis -->
        <div class="section">
            <h2><span class="section-number">4</span>Metabolic Analysis</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{1800 + user_data.age * 5}</div>
                    <div class="metric-label">Estimated RMR (cal/day)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{2400 + user_data.age * 8}</div>
                    <div class="metric-label">Total Daily Energy (TDEE)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{1900 + user_data.age * 6}</div>
                    <div class="metric-label">Target Calories</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{500}</div>
                    <div class="metric-label">Daily Deficit (cal)</div>
                </div>
            </div>
            <div class="chart-placeholder">
                📈 Metabolic Rate Trends Over Time
            </div>
        </div>

        <!-- Section 5: Weekly Progression Plan -->
        <div class="section">
            <h2><span class="section-number">5</span>Weekly Progression Breakdown</h2>
            <div class="weekly-breakdown">
                <div class="week-card">
                    <strong>Week 1-2</strong>
                    <div style="margin-top: 10px;">
                        <div>Weight: {user_data.current_weight - 2:.1f} lbs</div>
                        <div>BF: {user_data.current_bf - 0.5:.1f}%</div>
                    </div>
                </div>
                <div class="week-card">
                    <strong>Week 3-4</strong>
                    <div style="margin-top: 10px;">
                        <div>Weight: {user_data.current_weight - 4:.1f} lbs</div>
                        <div>BF: {user_data.current_bf - 1:.1f}%</div>
                    </div>
                </div>
                <div class="week-card">
                    <strong>Week 8</strong>
                    <div style="margin-top: 10px;">
                        <div>Weight: {user_data.current_weight - 8:.1f} lbs</div>
                        <div>BF: {user_data.current_bf - 2:.1f}%</div>
                    </div>
                </div>
                <div class="week-card">
                    <strong>Final</strong>
                    <div style="margin-top: 10px;">
                        <div>Weight: {user_data.goal_weight:.1f} lbs</div>
                        <div>BF: {user_data.goal_bf:.1f}%</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 6: Nutrition Strategy -->
        <div class="section">
            <h2><span class="section-number">6</span>Nutrition Strategy</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{int(user_data.current_weight * 1.2)}</div>
                    <div class="metric-label">Protein (g/day)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{int(user_data.current_weight * 0.8)}</div>
                    <div class="metric-label">Carbs (g/day)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{int(user_data.current_weight * 0.4)}</div>
                    <div class="metric-label">Fats (g/day)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">5</div>
                    <div class="metric-label">Meals per day</div>
                </div>
            </div>
            <div class="recommendation-card">
                <h4>💡 Nutritional Recommendations</h4>
                <ul>
                    <li>Focus on high-quality protein sources to maintain muscle mass</li>
                    <li>Time carbohydrates around workout sessions</li>
                    <li>Include healthy fats for hormone production and satiety</li>
                    <li>Stay hydrated with at least {int(user_data.current_weight * 0.5)} oz of water daily</li>
                </ul>
            </div>
        </div>

        <!-- Section 7: Training Protocol -->
        <div class="section">
            <h2><span class="section-number">7</span>Training Protocol</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Resistance Training</div>
                    <div>3-4 sessions/week</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Cardio</div>
                    <div>2-3 sessions/week</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Rest Days</div>
                    <div>1-2 per week</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Session Duration</div>
                    <div>45-60 minutes</div>
                </div>
            </div>
            <div class="chart-placeholder">
                💪 Weekly Training Split Visualization
            </div>
        </div>

        <!-- Section 8: Recovery & Lifestyle -->
        <div class="section">
            <h2><span class="section-number">8</span>Recovery & Lifestyle Optimization</h2>
            <div class="recommendation-card">
                <h4>😴 Sleep Optimization</h4>
                <p>Target 7-9 hours of quality sleep nightly. Poor sleep can reduce fat loss by up to 55% while increasing muscle loss.</p>
            </div>
            <div class="recommendation-card">
                <h4>🧘 Stress Management</h4>
                <p>Chronic stress elevates cortisol, promoting fat storage especially in the abdominal area. Include stress-reduction activities.</p>
            </div>
            <div class="recommendation-card">
                <h4>💧 Hydration Protocol</h4>
                <p>Maintain optimal hydration to support metabolism and reduce water retention. Aim for clear, pale yellow urine.</p>
            </div>
        </div>

        <!-- Section 9: Supplementation Strategy -->
        <div class="section">
            <h2><span class="section-number">9</span>Supplementation Strategy</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Protein Powder</div>
                    <div>25-30g post-workout</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Creatine</div>
                    <div>3-5g daily</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Multivitamin</div>
                    <div>Daily with breakfast</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Omega-3</div>
                    <div>2-3g daily</div>
                </div>
            </div>
        </div>

        <!-- Section 10: Progress Tracking -->
        <div class="section">
            <h2><span class="section-number">10</span>Progress Tracking Protocol</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">Weekly</div>
                    <div class="metric-label">Weigh-ins</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">Bi-weekly</div>
                    <div class="metric-label">Body Fat Testing</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">Monthly</div>
                    <div class="metric-label">Progress Photos</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">Daily</div>
                    <div class="metric-label">Food Logging</div>
                </div>
            </div>
            <div class="chart-placeholder">
                📱 Progress Tracking Dashboard Preview
            </div>
        </div>

        <!-- Section 11: Risk Assessment -->
        <div class="section">
            <h2><span class="section-number">11</span>Risk Assessment & Mitigation</h2>
            <div class="ai-insight">
                <h4>⚠️ Potential Challenges</h4>
                <ul>
                    <li><strong>Plateau Risk:</strong> Medium - Expect 1-2 plateaus during transformation</li>
                    <li><strong>Muscle Loss Risk:</strong> Low - Adequate protein and resistance training protocol</li>
                    <li><strong>Metabolic Slowdown:</strong> Low - Conservative deficit approach</li>
                    <li><strong>Adherence Risk:</strong> Medium - Requires consistent lifestyle changes</li>
                </ul>
            </div>
        </div>

        <!-- Section 12: Success Predictors -->
        <div class="section">
            <h2><span class="section-number">12</span>Success Predictors & Confidence Analysis</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">87%</div>
                    <div class="metric-label">Success Probability</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">High</div>
                    <div class="metric-label">Plan Feasibility</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">Moderate</div>
                    <div class="metric-label">Difficulty Level</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">4.2/5</div>
                    <div class="metric-label">Expected Satisfaction</div>
                </div>
            </div>
        </div>

        <!-- Section 13: Troubleshooting Guide -->
        <div class="section">
            <h2><span class="section-number">13</span>Troubleshooting Common Issues</h2>
            <div class="recommendation-card">
                <h4>🚫 If Weight Loss Stalls</h4>
                <p>Reduce calories by 100-150/day or add 20 minutes of cardio 2x/week. Reassess after 2 weeks.</p>
            </div>
            <div class="recommendation-card">
                <h4>💪 If Strength Decreases</h4>
                <p>Implement a refeed day weekly or reduce cardio volume. Prioritize sleep and recovery.</p>
            </div>
            <div class="recommendation-card">
                <h4>🍽️ If Hunger Increases</h4>
                <p>Increase fiber intake, add more protein, and ensure adequate sleep. Consider diet breaks.</p>
            </div>
        </div>

        <!-- Section 14: Long-term Maintenance -->
        <div class="section">
            <h2><span class="section-number">14</span>Long-term Maintenance Strategy</h2>
            <div class="ai-insight">
                <h4>🎯 Maintenance Phase Planning</h4>
                <p>After reaching your goal, gradually increase calories by 100-150 per week until weight stabilizes. Continue resistance training to preserve muscle mass and metabolic health.</p>
            </div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">{2200 + user_data.age * 7}</div>
                    <div class="metric-label">Maintenance Calories</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">3-4</div>
                    <div class="metric-label">Training Days/Week</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">Monthly</div>
                    <div class="metric-label">Check-in Frequency</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">±3 lbs</div>
                    <div class="metric-label">Weight Range</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>🚀 PRIME Body Composition Analysis System</strong></p>
            <p>Advanced AI-Powered Fitness Analytics • Report Generated: {user_data.name}</p>
            <p style="opacity: 0.7; font-size: 0.8em;">This comprehensive analysis contains 14 detailed sections covering all aspects of your transformation journey.</p>
        </div>
    </div>
</body>
</html>"""

        return {
            "success": True,
            "html_content": html_content,
            "markdown_path": "/tmp/test_report.md",
            "pdf_path": "/tmp/test_report.pdf"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test report generation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)