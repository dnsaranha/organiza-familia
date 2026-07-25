import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Play, RotateCcw, GraduationCap } from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";
import { isTutorialCompleted } from "@/lib/tutorials/storage";

interface TutorialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TutorialsDialog = ({ open, onOpenChange }: TutorialsDialogProps) => {
  const { tutorials, startTutorial, restartTutorial } = useTutorial();
  // re-render when dialog opens so completion flags are fresh
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    if (open) force();
  }, [open]);

  const handleStart = (id: string, completed: boolean) => {
    if (completed) {
      restartTutorial(id);
    } else {
      startTutorial(id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] w-[calc(100%-2rem)] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Tutoriais
          </DialogTitle>
          <DialogDescription>
            Aprenda a usar o app com tours guiados passo a passo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1 -mr-1 flex-1 min-h-0">
          {tutorials.map((t) => {
            const completed = isTutorialCompleted(t.id);
            return (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{t.title}</h4>
                    {completed && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Concluído
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={completed ? "outline" : "default"}
                  onClick={() => handleStart(t.id, completed)}
                  className="flex-shrink-0"
                >
                  {completed ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Refazer
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Iniciar
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};