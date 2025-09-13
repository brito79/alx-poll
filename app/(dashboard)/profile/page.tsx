"use client";

import { useState } from "react";
import { useAuth } from "@/app/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

/**
 * User Profile Page
 * 
 * This component provides a user interface for viewing and managing profile information.
 * It serves as a central location for users to:
 * 1. View their account information
 * 2. Update profile details
 * 3. Manage account preferences
 * 4. Review account activity
 * 
 * The profile page is an important part of the user experience as it:
 * - Gives users transparency into their stored information
 * - Provides control over personal data
 * - Reinforces user identity within the application
 * 
 * This page is accessible from the user dropdown menu in the dashboard layout
 * and is protected by the authentication boundary of the dashboard route group.
 * 
 * @returns JSX.Element - The rendered profile page
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.name || user?.email?.split('@')[0] || "");

  // This would be connected to a real update function in a complete implementation
  const handleSaveProfile = () => {
    // In a real implementation, this would call an API to update the user profile
    setIsEditing(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Profile</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            View and manage your account details
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={user?.user_metadata?.avatar_url || "/placeholder-user.jpg"} 
                alt={user?.email || "User"} 
              />
              <AvatarFallback className="text-2xl">
                {user?.email ? user.email[0].toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2 flex-1">
              {isEditing ? (
                <Input 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display Name"
                  className="max-w-md"
                />
              ) : (
                <h3 className="text-xl font-semibold">{displayName}</h3>
              )}
              
              <p className="text-slate-500">{user?.email}</p>
              <p className="text-slate-500 text-sm">
                Member since: {new Date(user?.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          {isEditing ? (
            <div className="space-x-2">
              <Button onClick={handleSaveProfile}>Save Changes</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Activity</CardTitle>
          <CardDescription>
            Recent activity on your account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="border-b pb-2">
              <p className="font-medium">Last sign in</p>
              <p className="text-slate-500">
                {new Date(user?.last_sign_in_at || Date.now()).toLocaleString()}
              </p>
            </div>
            
            <div>
              <p className="font-medium">Polls Created</p>
              <p className="text-slate-500">
                {/* This would be fetched from the database in a real implementation */}
                Loading your poll count...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}