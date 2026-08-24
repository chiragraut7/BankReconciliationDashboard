import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Compass, 
  Layers, 
  FolderOpen, 
  Settings, 
  BarChart3, 
  CreditCard, 
  Building2, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onBackHome?: () => void;
  onOpenWorkspace: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onBackHome,
  onOpenWorkspace
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleExpand = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-4 select-none">
      {/* Top BACK HOME Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBackHome}
          className="w-full bg-[#EA580C] hover:bg-[#D94E07] text-white py-2.5 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer tracking-wider uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK HOME</span>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 text-xs">
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-left ${
            activeTab === 'dashboard'
              ? 'text-[#EA580C] font-semibold bg-orange-50/70'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Compass className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-[#EA580C]' : 'text-gray-500'}`} />
          <span>Dashboard</span>
        </button>

        {/* Matching Workspace */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('workspace');
            onOpenWorkspace();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-left ${
            activeTab === 'workspace'
              ? 'text-[#EA580C] font-semibold bg-orange-50/70'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Layers className={`w-4 h-4 ${activeTab === 'workspace' ? 'text-[#EA580C]' : 'text-gray-500'}`} />
            <span>Matching Workspace</span>
          </div>
          <span className="bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Live
          </span>
        </button>

        {/* View Uploaded Files */}
        <button
          type="button"
          onClick={() => onSelectTab('files')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-left ${
            activeTab === 'files'
              ? 'text-[#EA580C] font-semibold bg-orange-50/70'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FolderOpen className={`w-4 h-4 ${activeTab === 'files' ? 'text-[#EA580C]' : 'text-gray-500'}`} />
          <span>View Uploaded Files</span>
        </button>

        {/* Setup Accordion */}
        <div>
          <button
            type="button"
            onClick={() => toggleExpand('setup')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-gray-500" />
              <span>Setup</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSection === 'setup' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'setup' && (
            <div className="ml-7 pl-2 py-1 border-l border-gray-200 space-y-1">
              <button 
                type="button" 
                onClick={onOpenWorkspace}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                Rules & Tolerances
              </button>
              <button 
                type="button" 
                onClick={onOpenWorkspace}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                Bank Accounts
              </button>
            </div>
          )}
        </div>

        {/* Reports Accordion */}
        <div>
          <button
            type="button"
            onClick={() => toggleExpand('reports')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span>Reports</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSection === 'reports' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'reports' && (
            <div className="ml-7 pl-2 py-1 border-l border-gray-200 space-y-1">
              <button 
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                Audit Settlement Summary
              </button>
              <button 
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                Variance Analysis
              </button>
            </div>
          )}
        </div>

        {/* Payables Accordion */}
        <div>
          <button
            type="button"
            onClick={() => toggleExpand('payables')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span>Payables</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSection === 'payables' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'payables' && (
            <div className="ml-7 pl-2 py-1 border-l border-gray-200 space-y-1">
              <button 
                type="button"
                onClick={onOpenWorkspace}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                Open Vendor Invoices
              </button>
              <button 
                type="button"
                onClick={onOpenWorkspace}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                Payment Batches
              </button>
            </div>
          )}
        </div>

        {/* Administration Accordion */}
        <div>
          <button
            type="button"
            onClick={() => toggleExpand('admin')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>Administration</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSection === 'admin' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'admin' && (
            <div className="ml-7 pl-2 py-1 border-l border-gray-200 space-y-1">
              <button 
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                User Roles & RBAC
              </button>
              <button 
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className="w-full text-left py-1 text-gray-500 hover:text-[#EA580C] text-[11px] cursor-pointer"
              >
                SOX 404 Audit Log
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar Footer info */}
      <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 font-sans">
        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Engine Online</span>
        </div>
        <div>Recon Engine v4.2.0</div>
      </div>
    </aside>
  );
};
