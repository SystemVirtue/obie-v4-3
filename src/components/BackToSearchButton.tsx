import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackToSearchButtonProps {
  onClick: () => void;
}

export const BackToSearchButton: React.FC<BackToSearchButtonProps> = ({
  onClick,
}) => {
  return (
    <Button
      onClick={onClick}
      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 text-lg"
      style={{
        filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))",
      }}
    >
      <ArrowLeft className="w-5 h-5" />
      Back to Search
    </Button>
  );
};
