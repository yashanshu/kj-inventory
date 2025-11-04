import { type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: string;
}

/**
 * ResponsiveModal - A modal that uses bottom drawer on mobile and centered modal on desktop
 * Built with Vaul for smooth drawer interactions
 */
export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxHeight = '75vh',
}: ResponsiveModalProps) {
  return (
    <>
      {/* Mobile: Bottom Drawer */}
      <div className="sm:hidden">
        <Drawer.Root open={isOpen} onClose={onClose}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col outline-none" style={{ maxHeight }}>
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <Drawer.Handle className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="flex-1 pr-4">
                  <Drawer.Title className="text-lg font-semibold text-gray-900">
                    {title}
                  </Drawer.Title>
                  {description && (
                    <p className="mt-1 text-xs text-gray-600">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 -mr-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
                  {footer}
                </div>
              )}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {/* Desktop: Centered Modal */}
      {isOpen && (
        <div className="hidden sm:block">
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Modal Panel */}
            <div
              className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl transition-all"
              style={{ maxHeight }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                <div className="flex-1 pr-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-1 text-sm text-gray-600">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 -mr-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[70vh] flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    {footer}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
