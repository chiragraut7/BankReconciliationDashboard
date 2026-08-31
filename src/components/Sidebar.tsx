import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Building2,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
  FolderOpen,
  Layers
} from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  reconciliationCount?: number;
  batchCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'reconciliations',
  onSelectTab,
  reconciliationCount = 5,
  batchCount = 5
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
      id: 'batches',
      label: 'Create Batch',
      icon: Layers,
      badge: batchCount > 0 ? `${batchCount}` : undefined,
      active: false
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
    </aside>
  );
};
