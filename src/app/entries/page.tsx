"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Download, Edit, Trash2, Plus, TrendingDown, TrendingUp, AlertCircle } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"
import { useApp } from "@/contexts/app-context"
import { calculateProgressPercentage } from "@/lib/calculations"
import { BodyFatEntry } from "@/types"

interface EditingEntry {
  id: string
  date: string
  weight: string
  body_fat_percentage: string
  notes: string
}

export default function EntriesPage() {
  const { state, addEntry, updateEntry, deleteEntry } = useApp()
  const { current_user, entries, loading } = state
  
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterPeriod, setFilterPeriod] = useState<"all" | "week" | "month" | "quarter">("all")

  const filteredEntries = React.useMemo(() => {
    if (filterPeriod === "all") return entries
    
    const now = new Date()
    const cutoffDate = new Date(now)
    
    switch (filterPeriod) {
      case "week":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        cutoffDate.setMonth(now.getMonth() - 3)
        break
    }
    
    return entries.filter(entry => new Date(entry.date) >= cutoffDate)
  }, [entries, filterPeriod])

  const handleEditEntry = (entry: any) => {
    setEditingEntry({
      id: entry.id,
      date: entry.date,
      weight: entry.weight.toString(),
      body_fat_percentage: entry.body_fat_percentage?.toString() || "",
      notes: entry.notes || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateEntry = async () => {
    if (!editingEntry) return
    
    setError(null)
    
    try {
      const originalEntry = entries.find(e => e.id === editingEntry.id)
      if (!originalEntry) return
      
      const updatedEntry: BodyFatEntry = {
        ...originalEntry,
        date: new Date(editingEntry.date),
        weight: parseFloat(editingEntry.weight),
        body_fat_percentage: editingEntry.body_fat_percentage ? parseFloat(editingEntry.body_fat_percentage) : undefined,
        notes: editingEntry.notes || undefined,
        updated_at: new Date()
      }
      
      await updateEntry(updatedEntry)
      setIsEditDialogOpen(false)
      setEditingEntry(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry")
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    setError(null)
    
    try {
      await deleteEntry(entryId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry")
    }
  }

  const exportEntries = () => {
    const csvContent = [
      "Date,Weight (lbs),Body Fat (%),Notes",
      ...filteredEntries.map(entry => 
        `${entry.date},${entry.weight},${entry.body_fat_percentage || ''},"${entry.notes || ''}"`
      )
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `body-fat-entries-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const calculateProgress = () => {
    if (!current_user || entries.length === 0) return null
    
    const latestEntry = entries[0]
    const startWeight = current_user.current_weight
    const goalWeight = current_user.goal_weight
    const currentWeight = latestEntry.weight
    
    const weightProgress = calculateProgressPercentage(startWeight, currentWeight, goalWeight)
    
    const startBF = current_user.current_bf
    const goalBF = current_user.goal_bf
    const currentBF = latestEntry.body_fat_percentage || startBF
    
    const bfProgress = calculateProgressPercentage(startBF, currentBF, goalBF)
    
    return {
      weightProgress: Math.max(0, weightProgress),
      bfProgress: Math.max(0, bfProgress),
      weightChange: currentWeight - startWeight,
      bfChange: currentBF - startBF
    }
  }

  const progress = calculateProgress()

  if (!current_user) {
    return (
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Entry History</h1>
          <p className="text-muted-foreground">
            View and manage your body composition tracking entries
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete your profile setup to start tracking entries.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Entry History</h1>
          <p className="text-muted-foreground">
            Track and manage your body composition progress
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {filteredEntries.length > 0 && (
            <Button variant="secondary" onClick={exportEntries}>
              <ClientIcon icon={Download} className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
          <Link href="/entries/new">
            <Button variant="default">
              <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {progress && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weight Progress</CardTitle>
              <ClientIcon icon={progress.weightChange < 0 ? TrendingDown : TrendingUp} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress.weightProgress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {progress.weightChange >= 0 ? '+' : ''}{progress.weightChange.toFixed(1)} lbs from start
              </p>
              <Progress value={Math.min(100, progress.weightProgress)} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Body Fat Progress</CardTitle>
              <ClientIcon icon={progress.bfChange < 0 ? TrendingDown : TrendingUp} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress.bfProgress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {progress.bfChange >= 0 ? '+' : ''}{progress.bfChange.toFixed(1)}% from start
              </p>
              <Progress value={Math.min(100, progress.bfProgress)} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <ClientIcon icon={Calendar} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
              <p className="text-xs text-muted-foreground">
                {entries.length > 0 
                  ? `Latest: ${new Date(entries[0].date).toLocaleDateString()}`
                  : "No entries yet"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as any)} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="quarter">Last 3 Months</TabsTrigger>
            <TabsTrigger value="month">Last Month</TabsTrigger>
            <TabsTrigger value="week">Last Week</TabsTrigger>
          </TabsList>
          <Badge variant="secondary">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>

        <TabsContent value={filterPeriod}>
          {filteredEntries.length > 0 ? (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' })}
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-lg font-bold">{entry.weight.toFixed(1)} lbs</div>
                            <div className="text-xs text-muted-foreground">Weight</div>
                          </div>
                          
                          {entry.body_fat_percentage && (
                            <div className="text-center">
                              <div className="text-lg font-bold">{entry.body_fat_percentage.toFixed(1)}%</div>
                              <div className="text-xs text-muted-foreground">Body Fat</div>
                            </div>
                          )}
                          
                          {entry.notes && (
                            <div className="max-w-xs">
                              <div className="text-sm">{entry.notes}</div>
                              <div className="text-xs text-muted-foreground">Notes</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEditEntry(entry)}>
                          <ClientIcon icon={Edit} className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <ClientIcon icon={Trash2} className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this entry from {new Date(entry.date).toLocaleDateString()}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {filterPeriod === "all" 
                    ? "No entries found. Start tracking your progress!"
                    : `No entries found in the selected time period.`
                  }
                </p>
                <Link href="/entries/new">
                  <Button variant="default">
                    <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
                    Add Your First Entry
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>
              Update your body composition entry.
            </DialogDescription>
          </DialogHeader>
          
          {editingEntry && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, date: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-weight" className="text-right">Weight (lbs)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  step="0.1"
                  value={editingEntry.weight}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, weight: e.target.value } : null)}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-bf" className="text-right">Body Fat (%)</Label>
                <Input
                  id="edit-bf"
                  type="number"
                  step="0.1"
                  value={editingEntry.body_fat_percentage}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, body_fat_percentage: e.target.value } : null)}
                  className="col-span-3"
                  placeholder="Optional"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-notes" className="text-right">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editingEntry.notes}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="col-span-3"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleUpdateEntry} disabled={loading}>
              {loading ? "Updating..." : "Update Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}