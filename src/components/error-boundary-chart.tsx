"use client"

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ChartErrorBoundaryProps {
  children: React.ReactNode
  title?: string
}

interface ChartErrorBoundaryState {
  hasError: boolean
  errorCount: number
}

export class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, errorCount: 0 }
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true, errorCount: 0 }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart error:', error, errorInfo)
    
    // Track error count to prevent infinite error loops
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }))
    
    // If we've had too many errors, don't try to recover
    if (this.state.errorCount > 3) {
      console.error('Too many chart errors, stopping recovery attempts')
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, errorCount: 0 })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{this.props.title || 'Chart'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-2">Unable to display this chart due to a rendering error.</p>
                {this.state.errorCount <= 3 && (
                  <Button 
                    onClick={this.handleReset} 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}