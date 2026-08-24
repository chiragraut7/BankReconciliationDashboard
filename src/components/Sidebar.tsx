import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Building2,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  History,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  reconciliationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'reconciliations',
  onSelectTab,
  reconciliationCount = 5
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const menuItems = [
    {
      id: 'reconciliations',
      label: 'Reconciliations',
      icon: FileSpreadsheet,
      badge: reconciliationCount > 0 ? `${reconciliationCount}` : undefined,
      active: true
    },
    {
      id: 'statements',
      label: 'Bank Statements',
      icon: FolderOpen,
      badge: '12',
      active: false
    },
    {
      id: 'invoices',
      label: 'Invoices & Bills',
      icon: Receipt,
      badge: '48',
      active: false
    },
    {
      id: 'accounts',
      label: 'Bank Accounts',
      icon: Building2,
      badge: '4',
      active: false
    },
    {
      id: 'ledger',
      label: 'General Ledger',
      icon: BookOpen,
      active: false
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      active: false
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      active: false
    },
    {
      id: 'settings',
      label: 'Rules & Settings',
      icon: Settings,
      active: false
    }
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 shrink-0 flex flex-col justify-between transition-all duration-300 z-20 select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Menu List */}
      <div className="p-3 space-y-4">
        {/* Collapse Toggle Row */}
        <div className="flex items-center justify-between px-2 pt-1">
          {!isCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Navigation
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-auto cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = item.id === activeTab;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab?.(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50 text-[#EA580C] shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isSelected ? 'text-[#EA580C]' : 'text-gray-500'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isSelected
                        ? 'bg-[#EA580C] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status & System Health */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Auto-Sync Live
              </span>
              <span className="font-mono text-[10px] text-gray-400">v2.4.0</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 text-gray-900 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Audit Verified</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                All ledger entries encrypted & certified.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Auto-Sync Live: v2.4.0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
