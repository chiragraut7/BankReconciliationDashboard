import React from 'react';
import { 
  Building2, 
  HelpCircle, 
  Globe, 
  Bell, 
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenShortcuts }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0 select-none">
      <div className="flex items-center justify-between">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center font-bold font-mono text-base shadow-xs tracking-tighter">
            4s
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 tracking-tight text-lg">
              4see
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#EA580C] border border-orange-200">
              PRO
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200 text-xs text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-gray-600">Enterprise Bank Reconciliation</span>
          </div>
        </div>

        {/* Right Tools Zone */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-gray-400" />
            <span className="hidden sm:inline">Shortcuts</span>
            <kbd className="hidden sm:inline ml-1 px-1 py-0.2 bg-gray-100 border border-gray-300 rounded text-[10px] text-gray-500 font-mono">?</kbd>
          </button>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          {/* Language selector */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-700 bg-gray-50 border border-gray-200">
            <Globe className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">English</span>
          </div>

          {/* Notification bell */}
          <button 
            type="button"
            className="relative p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#EA580C] rounded-full ring-2 ring-white" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-bold font-mono">
              DJ
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-gray-900 leading-none">Dharmendra</div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">Lead Controller</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
