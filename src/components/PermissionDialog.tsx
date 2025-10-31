import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Play, Maximize } from 'lucide-react';

export type PermissionType = 'autoplay' | 'fullscreen';

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  permissionType: PermissionType;
  onPermissionGranted: (permissionType: PermissionType) => void;
  onPermissionDenied: (permissionType: PermissionType) => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  isOpen,
  onClose,
  permissionType,
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  // Check if permission was already granted
  const checkExistingPermission = (type: PermissionType): boolean => {
    try {
      const permissions = JSON.parse(localStorage.getItem('jukeboxPermissions') || '{}');
      const permission = permissions[type];
      
      if (permission && permission.granted) {
        // Check if permission is still valid (within 30 days)
        const grantedTime = permission.timestamp || 0;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        if (now - grantedTime < thirtyDaysMs) {
          console.log(`[Permissions] ${type} permission already granted and valid`);
          return true;
        } else {
          console.log(`[Permissions] ${type} permission expired, requesting again`);
        }
      }
    } catch (error) {
      console.error('[Permissions] Error checking existing permission:', error);
    }
    return false;
  };

  // Auto-grant if permission already exists
  React.useEffect(() => {
    if (isOpen && checkExistingPermission(permissionType)) {
      onPermissionGranted(permissionType);
      onClose();
    }
  }, [isOpen, permissionType, onPermissionGranted, onClose]);

  const permissionConfig = {
    autoplay: {
      title: 'Autoplay Permission Required',
      description: 'Your browser is blocking automatic video playback. This permission allows the jukebox to automatically play songs without requiring manual interaction.',
      icon: Play,
      benefits: [
        'Songs will play automatically when selected',
        'Seamless music experience without interruptions',
        'No need to manually start each song'
      ]
    },
    fullscreen: {
      title: 'Fullscreen Permission Required',
      description: 'Your browser is blocking fullscreen mode for the video player. This permission allows the jukebox to display videos in fullscreen on secondary displays.',
      icon: Maximize,
      benefits: [
        'Videos can display in fullscreen on external displays',
        'Better viewing experience for audiences',
        'Professional presentation mode'
      ]
    }
  };

  const config = permissionConfig[permissionType];
  const IconComponent = config.icon;

  const handleRequestPermission = async () => {
    setIsRequesting(true);

    try {
      let permissionGranted = false;

      if (permissionType === 'autoplay') {
        // For autoplay, we can't directly request permission via Permissions API
        // Instead, we show instructions and try to play a muted video to trigger user interaction
        permissionGranted = await requestAutoplayPermission();
      } else if (permissionType === 'fullscreen') {
        permissionGranted = await requestFullscreenPermission();
      }

      if (permissionGranted) {
        // Store permission in localStorage
        const permissions = JSON.parse(localStorage.getItem('jukeboxPermissions') || '{}');
        permissions[permissionType] = {
          granted: true,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        };
        localStorage.setItem('jukeboxPermissions', JSON.stringify(permissions));

        onPermissionGranted(permissionType);
        onClose();
      } else {
        onPermissionDenied(permissionType);
      }
    } catch (error) {
      console.error(`Error requesting ${permissionType} permission:`, error);
      onPermissionDenied(permissionType);
    } finally {
      setIsRequesting(false);
    }
  };

  const requestAutoplayPermission = async (): Promise<boolean> => {
    // Create a temporary video element to test autoplay
    const testVideo = document.createElement('video');
    testVideo.muted = true;
    testVideo.preload = 'none';
    testVideo.style.display = 'none';

    // Try to play a data URL (empty video) to trigger permission prompt
    testVideo.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAGF21kYXQ=';

    document.body.appendChild(testVideo);

    try {
      await testVideo.play();
      document.body.removeChild(testVideo);
      return true;
    } catch (error) {
      document.body.removeChild(testVideo);
      // If autoplay fails, the user needs to interact with the page
      return false;
    }
  };

  const requestFullscreenPermission = async (): Promise<boolean> => {
    try {
      // Try to request fullscreen on a temporary element
      const testElement = document.createElement('div');
      testElement.style.width = '1px';
      testElement.style.height = '1px';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      document.body.appendChild(testElement);

      await testElement.requestFullscreen();
      await document.exitFullscreen();
      document.body.removeChild(testElement);
      return true;
    } catch (error) {
      // Check if it's a permission error
      if (error.name === 'NotAllowedError') {
        return false;
      }
      // If it's another error (like not supported), consider it granted
      return true;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-left">{config.title}</DialogTitle>
              <DialogDescription className="text-left mt-1">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <IconComponent className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Benefits:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {config.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <strong>How to grant permission:</strong>
            <br />
            {permissionType === 'autoplay'
              ? 'Click "Grant Permission" below, then click anywhere on the page when prompted by your browser.'
              : 'Click "Grant Permission" below, then allow fullscreen when prompted by your browser.'
            }
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onPermissionDenied(permissionType);
              onClose();
            }}
            disabled={isRequesting}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="min-w-[120px]"
          >
            {isRequesting ? 'Requesting...' : 'Grant Permission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};