import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', description: 'Open + New Reconciliation modal' },
    { key: 'M', description: 'Trigger Manual Match on selected items' },
    { key: 'A', description: 'Bulk approve all suggested matches' },
    { key: 'Space', description: 'Toggle checkbox on focused transaction/invoice' },
    { key: 'Escape', description: 'Clear selection or close active modal' },
    { key: '?', description: 'Show keyboard shortcuts helper' },
    { key: '1 - 4', description: 'Jump directly to workflow step (01 to 04)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-[#141414] max-w-md w-full p-5 shadow-2xl space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-[#141414] pb-3">
          <div className="flex items-center gap-2 text-[#141414] font-bold uppercase tracking-wider">
            <Keyboard className="w-4 h-4 text-blue-700" />
            <span>Enterprise Keyboard Shortcuts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-[#141414]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 font-mono">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200">
              <span className="text-[#141414] font-sans text-xs">{sc.description}</span>
              <kbd className="px-2 py-0.5 bg-white border border-gray-300 text-[#141414] font-bold text-[11px]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141414] hover:bg-gray-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
