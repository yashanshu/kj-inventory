import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Plus, Download, FolderCog } from 'lucide-react';

interface ActionMenuProps {
  onAddItem?: () => void;
  onExport?: () => void;
  onManageCategories?: () => void;
  showExport?: boolean;
  showManageCategories?: boolean;
}

export function ActionMenu({
  onAddItem,
  onExport,
  onManageCategories,
  showExport = false,
  showManageCategories = false,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
        aria-label="Actions menu"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {onAddItem && (
              <button
                onClick={() => handleAction(onAddItem)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Add Item</span>
              </button>
            )}

            {showExport && onExport && (
              <button
                onClick={() => handleAction(onExport)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100"
              >
                <Download className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Export CSV</span>
              </button>
            )}

            {showManageCategories && onManageCategories && (
              <button
                onClick={() => handleAction(onManageCategories)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100"
              >
                <FolderCog className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Manage Categories</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
