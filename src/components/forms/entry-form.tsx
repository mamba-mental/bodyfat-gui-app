"use client"

import * as React from "react"
import { CalendarIcon, Save, Camera, X } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB limit for base64 storage

const entryFormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  weight: z.number().min(1, {
    message: "Weight must be a positive number.",
  }),
  body_fat_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
})

type EntryFormValues = z.infer<typeof entryFormSchema>

interface EntryFormProps {
  onSubmit: (data: EntryFormValues) => void
  defaultValues?: Partial<EntryFormValues>
  isLoading?: boolean
}

export function EntryForm({ onSubmit, defaultValues, isLoading }: EntryFormProps) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    defaultValues?.photo ?? null
  )
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      date: new Date(),
      weight: 0,
      body_fat_percentage: undefined,
      notes: "",
      photo: undefined,
      ...defaultValues,
    },
    mode: "onChange", // Validate on change for better accessibility
  })

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      const announcer = document.createElement('div')
      announcer.setAttribute('aria-live', 'assertive')
      announcer.className = 'sr-announcer'
      announcer.textContent = 'Photo must be smaller than 2 MB'
      document.body.appendChild(announcer)
      setTimeout(() => {
        if (document.body.contains(announcer)) document.body.removeChild(announcer)
      }, 3000)
      return
    }

    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setPhotoPreview(base64)
      form.setValue('photo', base64)
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPhotoPreview(null)
    form.setValue('photo', undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (data: EntryFormValues) => {
    // Announce successful form submission
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.className = 'sr-announcer'
    announcer.textContent = 'Form submitted successfully'
    document.body.appendChild(announcer)

    setTimeout(() => {
      if (document.body.contains(announcer)) {
        document.body.removeChild(announcer)
      }
    }, 1000)

    onSubmit(data)
  }

  // Announce form errors to screen readers
  React.useEffect(() => {
    const errors = form.formState.errors
    const errorKeys = Object.keys(errors)

    if (errorKeys.length > 0) {
      const errorMessages = errorKeys.map(key => {
        const error = errors[key as keyof typeof errors]
        return error?.message || `${key} field has an error`
      }).join(', ')

      const announcer = document.createElement('div')
      announcer.setAttribute('aria-live', 'assertive')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-announcer'
      announcer.textContent = `Form has errors: ${errorMessages}`
      document.body.appendChild(announcer)

      const timeoutId = setTimeout(() => {
        if (document.body.contains(announcer)) {
          document.body.removeChild(announcer)
        }
      }, 3000)

      return () => {
        clearTimeout(timeoutId)
        if (document.body.contains(announcer)) {
          document.body.removeChild(announcer)
        }
      }
    }
  }, [form.formState.errors])

  return (
    <Card className="w-full max-w-2xl mx-auto" role="form" aria-labelledby="entry-form-title">
      <CardHeader>
        <CardTitle id="entry-form-title">Add New Entry</CardTitle>
        <CardDescription>
          Record your weight and body fat percentage for tracking progress
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal min-h-[44px]",
                            !field.value && "text-muted-foreground"
                          )}
                          aria-haspopup="dialog"
                          aria-expanded="false"
                          aria-label={field.value ? `Selected date: ${format(field.value, "PPP")}` : "Choose a date"}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the date for this measurement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="1000"
                        placeholder="Enter weight"
                        className="min-h-[44px]"
                        aria-describedby="weight-description weight-error"
                        aria-invalid={!!form.formState.errors.weight}
                        aria-required="true"
                        autoComplete="off"
                        value={
                          field.value === undefined || Number.isNaN(field.value)
                            ? ""
                            : field.value
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "") {
                            field.onChange(undefined)
                          } else {
                            const parsed = parseFloat(value)
                            field.onChange(Number.isNaN(parsed) ? undefined : parsed)
                          }
                        }}
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription id="weight-description">
                      Your current weight in pounds
                    </FormDescription>
                    <FormMessage id="weight-error" role="alert" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body_fat_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Fat % (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="Enter body fat %"
                        className="min-h-[44px]"
                        aria-describedby="bodyfat-description bodyfat-error"
                        aria-invalid={!!form.formState.errors.body_fat_percentage}
                        autoComplete="off"
                        value={
                          field.value === undefined || Number.isNaN(field.value)
                            ? ""
                            : field.value
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "") {
                            field.onChange(undefined)
                          } else {
                            const parsed = parseFloat(value)
                            field.onChange(Number.isNaN(parsed) ? undefined : parsed)
                          }
                        }}
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription id="bodyfat-description">
                      Body fat percentage if measured (0-100%)
                    </FormDescription>
                    <FormMessage id="bodyfat-error" role="alert" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about your measurement, diet, training, etc."
                      className="resize-none min-h-[100px]"
                      rows={4}
                      maxLength={500}
                      aria-describedby="notes-description notes-error"
                      aria-invalid={!!form.formState.errors.notes}
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription id="notes-description">
                    Optional notes about your progress, diet, or training (max 500 characters)
                  </FormDescription>
                  <FormMessage id="notes-error" role="alert" />
                </FormItem>
              )}
            />

            {/* Progress Photo Upload (FR-012d) */}
            <FormItem>
              <FormLabel>Progress Photo (Optional)</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {photoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={photoPreview}
                        alt="Progress photo preview"
                        className="w-32 h-40 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px]"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload a progress photo"
                    >
                      <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
                      Add Progress Photo
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                    aria-hidden="true"
                  />
                </div>
              </FormControl>
              <FormDescription id="photo-description">
                Optional progress photo for visual tracking (max 2 MB, JPEG/PNG)
              </FormDescription>
            </FormItem>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                form.reset()
                removePhoto()
              }}
              aria-label="Reset form to default values"
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              aria-describedby={isLoading ? "saving-status" : undefined}
              aria-label={isLoading ? "Saving entry, please wait" : "Save entry to your progress history"}
            >
              {isLoading ? (
                <>
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"
                    aria-hidden="true"
                  />
                  <span>Saving...</span>
                  <span id="saving-status" className="sr-only">
                    Your entry is being saved, please wait
                  </span>
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  Save Entry
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
