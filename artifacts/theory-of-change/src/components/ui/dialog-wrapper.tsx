import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  className?: string;
}

export function DialogWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className = "sm:max-w-[500px]",
}: DialogWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`${className} flex flex-col max-h-[92vh]`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="mt-4 overflow-y-auto flex-1 pr-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
