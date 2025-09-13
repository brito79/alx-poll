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
import { Input } from "@/components/ui/input";

/**
 * User Settings Page
 * 
 * This component provides a user interface for configuring application preferences.
 * It allows users to:
 * 1. Manage notification preferences
 * 2. Configure privacy settings
 * 3. Control application behavior
 * 4. Manage account security options
 * 
 * The settings page is an important part of the user experience as it:
 * - Gives users control over how the application behaves
 * - Allows customization of the user experience
 * - Provides options for privacy and security management
 * 
 * This page is accessible from the user dropdown menu in the dashboard layout
 * and is protected by the authentication boundary of the dashboard route group.
 * 
 * @returns JSX.Element - The rendered settings page
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    publicProfile: false,
    twoFactorAuth: false,
  });

  const handleToggle = (setting: string) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting as keyof typeof settings],
    });
  };

  const handleSaveSettings = () => {
    // In a real implementation, this would call an API to update user settings
    console.log("Saving settings:", settings);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Settings</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Control how and when you receive notifications
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-slate-500">
                Receive email notifications when someone votes on your polls
              </p>
            </div>
            <div className="flex items-center">
              <Input
                type="checkbox"
                id="email-notifications"
                className="w-5 h-5"
                checked={settings.emailNotifications}
                onChange={() => handleToggle("emailNotifications")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Manage your privacy preferences
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Public Profile</p>
              <p className="text-sm text-slate-500">
                Allow other users to see your profile and polls you've created
              </p>
            </div>
            <div className="flex items-center">
              <Input
                type="checkbox"
                id="public-profile"
                className="w-5 h-5"
                checked={settings.publicProfile}
                onChange={() => handleToggle("publicProfile")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your account security options
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-slate-500">
                Add an extra layer of security to your account
              </p>
            </div>
            <div className="flex items-center">
              <Input
                type="checkbox"
                id="two-factor"
                className="w-5 h-5"
                checked={settings.twoFactorAuth}
                onChange={() => handleToggle("twoFactorAuth")}
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </CardFooter>
      </Card>
    </div>
  );
}