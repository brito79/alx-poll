"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Share2, Twitter, Facebook, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { 
  isValidPollId, 
  sanitizeText, 
  getSecureWindowFeatures,
  isValidShareUrl
} from "@/app/lib/utils/share-security";

interface VulnerableShareProps {
  pollId: string;
  pollTitle: string;
}

export default function SecureShare({
  pollId,
  pollTitle,
}: VulnerableShareProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validId, setValidId] = useState(false);

  useEffect(() => {
    // Validate the poll ID before using it
    if (!isValidPollId(pollId)) {
      setError("Invalid poll ID format");
      setValidId(false);
      return;
    }
    
    setValidId(true);
    
    try {
      // Securely generate the share URL using URL constructor
      const baseUrl = window.location.origin;
      const url = new URL(`/polls/${pollId}`, baseUrl);
      setShareUrl(url.toString());
      setError(null);
    } catch (err) {
      console.error("Error creating share URL:", err);
      setError("Unable to generate share link");
    }
  }, [pollId]);

  const copyToClipboard = async () => {
    if (!validId || error) {
      toast.error("Cannot copy an invalid link");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      console.error("Clipboard error:", err);
      toast.error("Failed to copy link");
    }
  };

  const shareOnTwitter = () => {
    if (!validId || error) {
      toast.error("Cannot share an invalid link");
      return;
    }
    
    // Sanitize poll title before sharing
    const sanitizedTitle = sanitizeText(pollTitle);
    const text = encodeURIComponent(`Check out this poll: ${sanitizedTitle}`);
    const url = encodeURIComponent(shareUrl);
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    
    // Verify URL is valid before opening
    if (isValidShareUrl(twitterUrl)) {
      window.open(
        twitterUrl,
        "_blank",
        getSecureWindowFeatures()
      );
    } else {
      toast.error("Invalid share URL");
    }
  };

  const shareOnFacebook = () => {
    if (!validId || error) {
      toast.error("Cannot share an invalid link");
      return;
    }
    
    const url = encodeURIComponent(shareUrl);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    
    if (isValidShareUrl(facebookUrl)) {
      window.open(
        facebookUrl,
        "_blank",
        getSecureWindowFeatures()
      );
    } else {
      toast.error("Invalid share URL");
    }
  };

  const shareViaEmail = () => {
    if (!validId || error) {
      toast.error("Cannot share an invalid link");
      return;
    }
    
    // Sanitize poll title before sharing
    const sanitizedTitle = sanitizeText(pollTitle);
    const subject = encodeURIComponent(`Poll: ${sanitizedTitle}`);
    const body = encodeURIComponent(
      `Hi! I'd like to share this poll with you: ${shareUrl}`
    );
    
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoUrl);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share This Poll
        </CardTitle>
        <CardDescription>
          Share your poll with others to gather votes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display error if any */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {/* URL Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Shareable Link
          </label>
          <div className="flex space-x-2">
            <Input
              value={shareUrl}
              readOnly
              className="font-mono text-sm"
              placeholder="Generating link..."
              aria-invalid={!!error}
              disabled={!validId}
            />
            <Button 
              onClick={copyToClipboard} 
              variant="outline" 
              size="sm"
              disabled={!validId || !!error}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Social Sharing Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Share on social media
          </label>
          <div className="flex space-x-2">
            <Button
              onClick={shareOnTwitter}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!validId || !!error}
            >
              <Twitter className="h-4 w-4" />
              Twitter
            </Button>
            <Button
              onClick={shareOnFacebook}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!validId || !!error}
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </Button>
            <Button
              onClick={shareViaEmail}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!validId || !!error}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        </div>
        
        {/* Security notice */}
        <div className="text-xs text-slate-500 mt-4 border-t pt-4">
          <p>This sharing functionality uses secure links and protects against common web vulnerabilities.</p>
        </div>
      </CardContent>
    </Card>
  );
}
