"use client"

import React, { useState } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useApp } from '@/contexts/app-context'
import { saveUserData } from '@/lib/storage-api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatAge } from '@/lib/date-utils'

interface ProfileHeaderProps {
  className?: string
  showEditButtons?: boolean
  compact?: boolean
}

export function ProfileHeader({ className, showEditButtons = false, compact = false }: ProfileHeaderProps) {
  const { state, dispatch } = useApp()
  const user = state.current_user
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)

  const handleImageUpload = async (file: File, type: 'profile_picture' | 'profile_banner') => {
    if (!user) return

    const setUploading = type === 'profile_picture' ? setIsUploadingPicture : setIsUploadingBanner
    setUploading(true)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type === 'profile_picture' ? 'profile' : 'banner')

      // Upload file to server
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        let errorMessage = 'Upload failed'
        try {
          const errorData = await uploadResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Response wasn't JSON (e.g., 413 HTML error page)
          if (uploadResponse.status === 413) {
            errorMessage = 'File is too large. Please use a smaller image.'
          } else {
            errorMessage = `Upload failed (status ${uploadResponse.status})`
          }
        }
        throw new Error(errorMessage)
      }

      const { url: imageUrl } = await uploadResponse.json()

      // Delete old image if exists
      const oldImageUrl = user[type]
      if (oldImageUrl && oldImageUrl.startsWith('/uploads/')) {
        // Fire and forget - we don't need to wait for deletion
        fetch(`/api/upload?url=${encodeURIComponent(oldImageUrl)}`, {
          method: 'DELETE'
        }).catch(console.error)
      }

      // Update user data with new image URL
      const updatedUser = {
        ...user,
        [type]: imageUrl
      }

      // Save to backend
      const savedUser = await saveUserData(updatedUser)
      dispatch({ type: 'SET_USER_DATA', payload: savedUser })
      toast.success(`${type === 'profile_picture' ? 'Profile picture' : 'Banner'} updated successfully`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile_picture' | 'profile_banner') => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file, type)
    } else {
      toast.error('Please select a valid image file')
    }
  }

  const handleClearImage = async (type: 'profile_picture' | 'profile_banner') => {
    if (!user) return

    try {
      // Delete image file if it's a local upload
      const imageUrl = user[type]
      if (imageUrl && imageUrl.startsWith('/uploads/')) {
        // Fire and forget - we don't need to wait for deletion
        fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
          method: 'DELETE'
        }).catch(console.error)
      }

      const updatedUser = {
        ...user,
        [type]: undefined
      }

      // Save to backend
      const savedUser = await saveUserData(updatedUser)
      dispatch({ type: 'SET_USER_DATA', payload: savedUser })
      toast.success(`${type === 'profile_picture' ? 'Profile picture' : 'Banner'} removed successfully`)
    } catch (error) {
      console.error('Clear image error:', error)
      toast.error('Failed to remove image')
    }
  }

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (compact) {
    return (
      <div className={cn("relative h-36 overflow-hidden border-b border-[#d9ded6] bg-[#173c2a] md:h-40", className)}>
        {user.profile_banner ? (
          <img
            src={user.profile_banner}
            alt="Profile banner"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_25%,rgba(190,208,195,0.28),transparent_35%),linear-gradient(120deg,#173c2a,#315c42)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute inset-0 flex items-end gap-3 px-5 py-4 md:px-8">
          <Avatar className="h-14 w-14 shrink-0 border-2 border-white/80 shadow-lg">
            <AvatarImage src={user.profile_picture} alt={user.name} />
            <AvatarFallback className="bg-[#edf3ea] text-lg font-semibold text-[#173c2a]">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 pb-0.5 text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            <h2 className="truncate font-serif text-2xl font-semibold tracking-wide">{user.name}</h2>
            <p className="text-sm text-white/90">{formatAge(user.dob, user.age)} · {user.gender === 'm' ? 'Male' : 'Female'} · {user.current_weight} lbs</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Banner */}
      {/* Container uses aspect-[15/4] when a banner image is present so the full
          1500×400 image is always visible without cropping. When no banner is set
          we fall back to the original fixed-height decorative gradient. */}
      {/* Banner container.
          When a banner image is set we honour the 15:4 ratio via aspect-[15/4] but
          clamp the display height so it never blows up to billboard size on wide
          screens. max-h-[160px] md:max-h-[200px] keeps it as a crisp banner strip
          (≈ the 1500×400 reference image) while object-cover fills the area cleanly.
          The gradient-only fallback keeps its fixed heights unchanged. */}
      <div className={cn(
        "relative bg-gradient-to-r from-primary/20 to-primary/10 overflow-hidden",
        user.profile_banner
          ? "w-full aspect-[15/4] max-h-[160px] md:max-h-[200px]"
          : "h-32 md:h-48 rounded-t-lg",
        "rounded-t-lg"
      )}>
        {user.profile_banner ? (
          <img
            src={user.profile_banner}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
        )}
        
        {showEditButtons && (
          <div className="absolute top-4 right-4 flex gap-2">
            <label htmlFor="banner-upload" className="cursor-pointer" title="Recommended size: 1500x400px. JPG, PNG, or WebP format.">
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                disabled={isUploadingBanner}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4" />
                  {isUploadingBanner ? 'Uploading...' : user.profile_banner ? 'Change Banner' : 'Upload Banner (1500x400px)'}
                </span>
              </Button>
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'profile_banner')}
                disabled={isUploadingBanner}
              />
            </label>
            {user.profile_banner && (
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={() => handleClearImage('profile_banner')}
              >
                <X className="h-4 w-4" />
                Remove Banner
              </Button>
            )}
          </div>
        )}

        <div
          className={cn(
            "absolute",
            "left-6 md:left-10 top-6 md:top-10"
          )}
        >
          <div className="relative">
            <Avatar
              className={cn(
                "border-4 border-background shadow-lg",
                "h-24 w-24"
              )}
            >
              <AvatarImage src={user.profile_picture} alt={user.name} />
              <AvatarFallback className="text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {showEditButtons && (
              <>
                <label
                  htmlFor="picture-upload"
                  className="cursor-pointer"
                  title={user.profile_picture ? "Change Profile Picture (recommended: 400x400px)" : "Upload Profile Picture (recommended: 400x400px)"}
                >
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors shadow-md">
                    <Camera className="h-4 w-4" />
                  </div>
                  <input
                    id="picture-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, 'profile_picture')}
                    disabled={isUploadingPicture}
                  />
                </label>
                {user.profile_picture && (
                  <button
                    onClick={() => handleClearImage('profile_picture')}
                    className="absolute -top-2 -left-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-md"
                    title="Remove Profile Picture"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className={cn(
        "px-4 md:px-8 pb-4",
        "pt-12"
      )}>
        <h2 className={cn(
          "font-bold",
          "text-2xl"
        )}>{user.name}</h2>
        <p className={cn(
          "text-muted-foreground"
        )}>
          {formatAge(user.dob, user.age)} • {user.gender === 'm' ? 'Male' : 'Female'} • {user.current_weight} lbs
        </p>
      </div>
    </div>
  )
}
