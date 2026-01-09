"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calculator, Target, AlertCircle, CheckCircle } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"

interface CalculationResult {
  bodyFat: number
  method: string
  accuracy: string
  category: string
}

export default function CalculatorPage() {
  const [navyMethod, setNavyMethod] = useState({
    gender: "",
    height: "",
    waist: "",
    neck: "",
    hip: "" // for females
  })
  
  const [bmiMethod, setBmiMethod] = useState({
    weight: "",
    height: "",
    age: "",
    gender: ""
  })
  
  const [results, setResults] = useState<CalculationResult[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const calculateNavyMethod = () => {
    const errors: string[] = []
    
    if (!navyMethod.gender) errors.push("Gender is required for Navy method")
    if (!navyMethod.height || parseFloat(navyMethod.height) <= 0) errors.push("Valid height is required")
    if (!navyMethod.waist || parseFloat(navyMethod.waist) <= 0) errors.push("Valid waist measurement is required")
    if (!navyMethod.neck || parseFloat(navyMethod.neck) <= 0) errors.push("Valid neck measurement is required")
    if (navyMethod.gender === "female" && (!navyMethod.hip || parseFloat(navyMethod.hip) <= 0)) {
      errors.push("Valid hip measurement is required for females")
    }
    
    if (errors.length > 0) {
      setErrors(errors)
      return
    }
    
    setErrors([])
    
    const height = parseFloat(navyMethod.height)
    const waist = parseFloat(navyMethod.waist)
    const neck = parseFloat(navyMethod.neck)
    const hip = navyMethod.gender === "female" ? parseFloat(navyMethod.hip) : 0
    
    let bodyFat: number
    
    if (navyMethod.gender === "male") {
      // Male Navy formula: 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76
      bodyFat = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76
    } else {
      // Female Navy formula: 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387
      bodyFat = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387
    }
    
    const category = getBodyFatCategory(bodyFat, navyMethod.gender)
    
    const result: CalculationResult = {
      bodyFat: Math.max(0, Math.min(50, bodyFat)), // Clamp between 0-50%
      method: "Navy Method",
      accuracy: "±3-4%",
      category
    }
    
    setResults(prev => [result, ...prev.filter(r => r.method !== "Navy Method")])
  }
  
  const calculateBMI = () => {
    const errors: string[] = []
    
    if (!bmiMethod.weight || parseFloat(bmiMethod.weight) <= 0) errors.push("Valid weight is required")
    if (!bmiMethod.height || parseFloat(bmiMethod.height) <= 0) errors.push("Valid height is required")
    if (!bmiMethod.age || parseFloat(bmiMethod.age) <= 0) errors.push("Valid age is required")
    if (!bmiMethod.gender) errors.push("Gender is required")
    
    if (errors.length > 0) {
      setErrors(errors)
      return
    }
    
    setErrors([])
    
    const weight = parseFloat(bmiMethod.weight) // lbs
    const height = parseFloat(bmiMethod.height) // inches
    const age = parseFloat(bmiMethod.age)
    
    // Calculate BMI
    const bmi = (weight / (height * height)) * 703
    
    // Deurenberg formula for body fat from BMI
    let bodyFat: number
    if (bmiMethod.gender === "male") {
      bodyFat = (1.20 * bmi) + (0.23 * age) - 16.2
    } else {
      bodyFat = (1.20 * bmi) + (0.23 * age) - 5.4
    }
    
    const category = getBodyFatCategory(bodyFat, bmiMethod.gender)
    
    const result: CalculationResult = {
      bodyFat: Math.max(0, Math.min(50, bodyFat)),
      method: "BMI Estimation",
      accuracy: "±5-6%",
      category
    }
    
    setResults(prev => [result, ...prev.filter(r => r.method !== "BMI Estimation")])
  }
  
  const getBodyFatCategory = (bodyFat: number, gender: string): string => {
    if (gender === "male") {
      if (bodyFat < 6) return "Essential Fat"
      if (bodyFat < 14) return "Athletic"
      if (bodyFat < 18) return "Fitness"
      if (bodyFat < 25) return "Average"
      return "Obese"
    } else {
      if (bodyFat < 16) return "Essential Fat"
      if (bodyFat < 21) return "Athletic"
      if (bodyFat < 25) return "Fitness"
      if (bodyFat < 32) return "Average"
      return "Obese"
    }
  }
  
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case "Essential Fat": return "destructive"
      case "Athletic": return "default"
      case "Fitness": return "default"
      case "Average": return "secondary"
      case "Obese": return "destructive"
      default: return "secondary"
    }
  }

  return (
    <div className="container max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Body Fat Calculator</h1>
        <p className="text-muted-foreground">
          Calculate your body fat percentage using scientifically validated methods
        </p>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="navy" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="navy">Navy Method</TabsTrigger>
              <TabsTrigger value="bmi">BMI Estimation</TabsTrigger>
            </TabsList>

            <TabsContent value="navy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClientIcon icon={Calculator} className="h-5 w-5" />
                    Navy Method Calculator
                  </CardTitle>
                  <CardDescription>
                    Uses body circumference measurements. Most accurate for athletic builds.
                    <br />
                    <strong>Accuracy: ±3-4%</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="navy-gender">Gender</Label>
                      <Select value={navyMethod.gender} onValueChange={(value) => setNavyMethod(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="navy-height">Height (inches)</Label>
                      <Input
                        id="navy-height"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 70.0"
                        value={navyMethod.height}
                        onChange={(e) => setNavyMethod(prev => ({ ...prev, height: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="navy-waist">Waist (inches)</Label>
                      <Input
                        id="navy-waist"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 32.0"
                        value={navyMethod.waist}
                        onChange={(e) => setNavyMethod(prev => ({ ...prev, waist: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Measure at narrowest point</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="navy-neck">Neck (inches)</Label>
                      <Input
                        id="navy-neck"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 15.0"
                        value={navyMethod.neck}
                        onChange={(e) => setNavyMethod(prev => ({ ...prev, neck: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Just below Adam's apple</p>
                    </div>
                    
                    {navyMethod.gender === "female" && (
                      <div className="space-y-2">
                        <Label htmlFor="navy-hip">Hip (inches)</Label>
                        <Input
                          id="navy-hip"
                          type="number"
                          step="0.1"
                          placeholder="e.g., 36.0"
                          value={navyMethod.hip}
                          onChange={(e) => setNavyMethod(prev => ({ ...prev, hip: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">At widest point</p>
                      </div>
                    )}
                  </div>
                  
                  <Button onClick={calculateNavyMethod} className="w-full" variant="default">
                    Calculate Body Fat
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bmi">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClientIcon icon={Target} className="h-5 w-5" />
                    BMI-Based Estimation
                  </CardTitle>
                  <CardDescription>
                    Estimates body fat from BMI, age, and gender. Quick but less accurate.
                    <br />
                    <strong>Accuracy: ±5-6%</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bmi-gender">Gender</Label>
                      <Select value={bmiMethod.gender} onValueChange={(value) => setBmiMethod(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bmi-age">Age (years)</Label>
                      <Input
                        id="bmi-age"
                        type="number"
                        placeholder="e.g., 30"
                        value={bmiMethod.age}
                        onChange={(e) => setBmiMethod(prev => ({ ...prev, age: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bmi-weight">Weight (lbs)</Label>
                      <Input
                        id="bmi-weight"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 180.0"
                        value={bmiMethod.weight}
                        onChange={(e) => setBmiMethod(prev => ({ ...prev, weight: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bmi-height">Height (inches)</Label>
                      <Input
                        id="bmi-height"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 70.0"
                        value={bmiMethod.height}
                        onChange={(e) => setBmiMethod(prev => ({ ...prev, height: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={calculateBMI} className="w-full" variant="default">
                    Calculate Body Fat
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClientIcon icon={CheckCircle} className="h-5 w-5" />
                Results
              </CardTitle>
              <CardDescription>Your calculated body fat percentages</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{result.method}</h4>
                        <Badge variant={getCategoryColor(result.category) as any}>
                          {result.category}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {result.bodyFat.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Accuracy: {result.accuracy}
                      </div>
                    </div>
                  ))}
                  
                  {results.length > 1 && (
                    <div className="border-t pt-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Average</div>
                        <div className="text-xl font-bold">
                          {(results.reduce((sum, r) => sum + r.bodyFat, 0) / results.length).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Complete a calculation to see results
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Body Fat Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div><strong>Men:</strong></div>
                <div>Essential Fat: 2-5%</div>
                <div>Athletic: 6-13%</div>
                <div>Fitness: 14-17%</div>
                <div>Average: 18-24%</div>
                <div>Obese: 25%+</div>
              </div>
              <div className="text-sm space-y-1 pt-2">
                <div><strong>Women:</strong></div>
                <div>Essential Fat: 10-13%</div>
                <div>Athletic: 14-20%</div>
                <div>Fitness: 21-24%</div>
                <div>Average: 25-31%</div>
                <div>Obese: 32%+</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}