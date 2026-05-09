import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="dark"
      richColors={false}
      closeButton
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group rounded-lg border px-4 py-3 shadow-float-sm backdrop-blur-sm flex items-start gap-3 min-w-[280px] max-w-[380px] !bg-surface/90 !border-border-base !text-foreground',
          title: 'text-sm font-medium text-foreground',
          description: 'text-xs text-foreground-muted',
          actionButton:
            '!bg-accent !text-accent-fg rounded-md px-2 py-1 text-xs font-medium',
          cancelButton:
            '!bg-surface-raised !text-foreground rounded-md px-2 py-1 text-xs',
          closeButton:
            '!bg-surface-raised !border-border-base !text-foreground-muted hover:!text-foreground',
          success: '!border-green-500/30 !text-green-400',
          error: '!border-red-500/30 !text-red-400',
          warning: '!border-yellow-500/30 !text-yellow-400',
          info: '!border-indigo-500/30 !text-indigo-400',
        },
      }}
    />
  );
}
