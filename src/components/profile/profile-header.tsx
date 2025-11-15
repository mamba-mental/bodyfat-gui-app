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
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

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
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Upload failed')
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

  return (
    <div className={cn("relative", className)}>
      {/* Banner */}
      <div className={cn(
        "relative bg-gradient-to-r from-primary/20 to-primary/10 overflow-hidden",
        compact ? "h-20 md:h-24" : "h-32 md:h-48 rounded-t-lg"
      )}>
        {user.profile_banner ? (
          <img
            src={user.profile_banner}
            alt="Profile banner"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ objectPosition: 'center' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
        )}
        
        {showEditButtons && (
          <div className="absolute top-4 right-4 flex gap-2">
            <label htmlFor="banner-upload" className="cursor-pointer">
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                disabled={isUploadingBanner}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4" />
                  {isUploadingBanner ? 'Uploading...' : user.profile_banner ? 'Change Banner' : 'Upload Banner'}
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
            compact ? "left-4 top-3" : "left-6 md:left-10 top-6 md:top-10"
          )}
        >
          <div className="relative">
            <Avatar
              className={cn(
                "border-4 border-background shadow-lg",
                compact ? "h-16 w-16" : "h-24 w-24"
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
                  title={user.profile_picture ? "Change Profile Picture" : "Upload Profile Picture"}
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
        compact ? "pt-8" : "pt-12"
      )}>
        <h2 className={cn(
          "font-bold",
          compact ? "text-lg" : "text-2xl"
        )}>{user.name}</h2>
        <p className={cn(
          "text-muted-foreground",
          compact && "text-sm"
        )}>
          {formatAge(user.dob, user.age)} • {user.gender === 'm' ? 'Male' : 'Female'} • {user.current_weight} lbs
        </p>
      </div>
    </div>
  )
}
