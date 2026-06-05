'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CanvasGuidesToggleProps = {
  showGuides: boolean;
  onToggle: () => void;
};

export function CanvasGuidesToggle({ showGuides, onToggle }: CanvasGuidesToggleProps) {
  return (
    <div className="mx-auto mt-3 flex max-w-[390px] justify-center">
      <Button
        type="button"
        variant="secondary"
        onClick={onToggle}
        aria-pressed={showGuides}
        data-testid="safe-guides-toggle"
      >
        <Eye className="h-4 w-4" />
        {showGuides ? 'Hide guides' : 'Show guides'}
      </Button>
    </div>
  );
}
