import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Tv, ExternalLink, Maximize2 } from 'lucide-react';
import { displayManager, DisplayInfo } from '@/services/displayManager';
import { useToast } from '@/hooks/use-toast';

export const DisplaySelector = () => {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSupport();
    loadDisplays();
    
    // Check if player window is already open
    const checkPlayerStatus = setInterval(() => {
      setIsPlayerOpen(displayManager.isPlayerWindowOpen());
    }, 1000);

    return () => clearInterval(checkPlayerStatus);
  }, []);

  const checkSupport = () => {
    setIsSupported(displayManager.isMultiScreenSupported());
  };

  const loadDisplays = async () => {
    const detected = await displayManager.detectDisplays();
    setDisplays(detected);
  };

  const openPlayerOnDisplay = async (display: DisplayInfo, fullscreen: boolean = true) => {
    try {
      const newWindow = await displayManager.openPlayerOnDisplay(display, fullscreen);
      
      if (newWindow) {
        setIsPlayerOpen(true);
        toast({
          title: "Player Opened",
          description: `Player opened on ${display.name}${fullscreen ? ' in fullscreen' : ''}`,
        });
      } else {
        toast({
          title: "Failed to Open Player",
          description: "Please allow popups for this site",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error opening player:', error);
      toast({
        title: "Error",
        description: "Failed to open player window",
        variant: "destructive",
      });
    }
  };

  const closePlayer = () => {
    displayManager.closePlayerWindow();
    setIsPlayerOpen(false);
    toast({
      title: "Player Closed",
      description: "Player window has been closed",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tv className="h-5 w-5" />
          Display Selection
        </CardTitle>
        <CardDescription>
          {isSupported 
            ? 'Choose which display to show the player on' 
            : 'Multi-screen API not supported in this browser'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isPlayerOpen && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Player is open</span>
              </div>
              <Button size="sm" variant="destructive" onClick={closePlayer}>
                Close Player
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {displays.map((display) => (
              <div key={display.id} className="space-y-1">
                <Button
                  variant={display.isPrimary ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => openPlayerOnDisplay(display, true)}
                  disabled={isPlayerOpen}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  {display.name} 
                  <span className="ml-2 text-xs opacity-70">
                    ({display.width}×{display.height})
                    {display.isPrimary && ' - Primary'}
                    {display.isInternal && ' - Internal'}
                  </span>
                  <Maximize2 className="h-3 w-3 ml-auto" />
                </Button>
                {isSupported && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => openPlayerOnDisplay(display, false)}
                    disabled={isPlayerOpen}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Windowed
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {!isSupported && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Multi-screen API not available. Using fallback window.open()
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
