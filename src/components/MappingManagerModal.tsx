import React, { useState } from 'react';
import {
  X,
  Search,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users2,
  Save,
  Trash2,
  RotateCcw,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { YardiVendorMapping, YardiEntityMapping } from '../types/yardiMapping';
import {
  generateAutoYardiVendorCode,
  generateAutoYardiEntityCode,
  saveStoredVendorMappings,
  saveStoredEntityMappings,
  resetToDefaultVendorMappings,
  resetToDefaultEntityMappings
} from '../utils/yardiMapping';

interface MappingManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorMappings: YardiVendorMapping[];
  entityMappings: YardiEntityMapping[];
  onUpdateVendorMappings: (mappings: YardiVendorMapping[]) => void;
  onUpdateEntityMappings: (mappings: YardiEntityMapping[]) => void;
  initialTab?: 'vendors' | 'entities';
  unmappedVendorFilter?: string[];
  unmappedEntityFilter?: string[];
}

export const MappingManagerModal: React.FC<MappingManagerModalProps> = ({
  isOpen,
  onClose,
  vendorMappings,
  entityMappings,
  onUpdateVendorMappings,
  onUpdateEntityMappings,
  initialTab = 'vendors',
  unmappedVendorFilter = [],
  unmappedEntityFilter = []
}) => {
  const [activeTab, setActiveTab] = useState<'vendors' | 'entities'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  
  // Local editable copies
  const [localVendors, setLocalVendors] = useState<YardiVendorMapping[]>(vendorMappings);
  const [localEntities, setLocalEntities] = useState<YardiEntityMapping[]>(entityMappings);
  
  // New entry forms
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorOurCode, setNewVendorOurCode] = useState('');
  const [newYardiVendorCode, setNewYardiVendorCode] = useState('');
  const [newVendorGl, setNewVendorGl] = useState('GL-6000 OPEX');

  const [showAddEntity, setShowAddEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityOurCode, setNewEntityOurCode] = useState('');
  const [newYardiEntityCode, setNewYardiEntityCode] = useState('');
  const [newFundCode, setNewFundCode] = useState('');

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVendorFieldChange = (id: string, field: keyof YardiVendorMapping, value: string) => {
    setLocalVendors(prev =>
      prev.map(v => {
        if (v.id === id) {
          const updated = { ...v, [field]: value };
          if (field === 'yardiVendorCode') {
            updated.status = value.trim() ? 'Mapped' : 'Unmapped';
          }
          return updated;
        }
        return v;
      })
    );
  };

  const handleEntityFieldChange = (id: string, field: keyof YardiEntityMapping, value: string) => {
    setLocalEntities(prev =>
      prev.map(e => {
        if (e.id === id) {
          const updated = { ...e, [field]: value };
          if (field === 'yardiEntityCode') {
            updated.status = value.trim() ? 'Mapped' : 'Unmapped';
          }
          return updated;
        }
        return e;
      })
    );
  };

  const handleAutoGenerateAllMissing = () => {
    let generatedCount = 0;
    const updatedVendors = localVendors.map(v => {
      if (!v.yardiVendorCode.trim() || v.status === 'Unmapped') {
        generatedCount++;
        const autoCode = generateAutoYardiVendorCode(v.ourVendorName);
        return {
          ...v,
          yardiVendorCode: autoCode,
          yardiVendorName: `${v.ourVendorName} (Auto-Mapped Yardi)`,
          status: 'Mapped' as const
        };
      }
      return v;
    });

    const updatedEntities = localEntities.map(e => {
      if (!e.yardiEntityCode.trim() || e.status === 'Unmapped') {
        generatedCount++;
        const autoCode = generateAutoYardiEntityCode(e.ourEntityName);
        return {
          ...e,
          yardiEntityCode: autoCode,
          yardiEntityName: `${e.ourEntityName} (Auto-Mapped Property)`,
          status: 'Mapped' as const
        };
      }
      return e;
    });

    setLocalVendors(updatedVendors);
    setLocalEntities(updatedEntities);
    onUpdateVendorMappings(updatedVendors);
    onUpdateEntityMappings(updatedEntities);
    saveStoredVendorMappings(updatedVendors);
    saveStoredEntityMappings(updatedEntities);

    setSaveSuccessMsg(`Auto-mapped ${generatedCount} missing codes successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetToDemoDefaults = () => {
    if (confirm('Reset mappings to default demo state? This will restore the demo unmapped properties (such as Novus Lux Stonegate 05 SCSp and Apollo Hybrid Value Lux) so you can test the mapping guard.')) {
      const defaultV = resetToDefaultVendorMappings();
      const defaultE = resetToDefaultEntityMappings();
      setLocalVendors(defaultV);
      setLocalEntities(defaultE);
      onUpdateVendorMappings(defaultV);
      onUpdateEntityMappings(defaultE);
      saveStoredVendorMappings(defaultV);
      saveStoredEntityMappings(defaultE);
      setSaveSuccessMsg('Restored demo mappings with unmapped properties for testing.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleSaveAll = () => {
    onUpdateVendorMappings(localVendors);
    onUpdateEntityMappings(localEntities);
    saveStoredVendorMappings(localVendors);
    saveStoredEntityMappings(localEntities);

    setSaveSuccessMsg('All mappings updated and saved to local storage!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleAddNewVendor = () => {
    if (!newVendorName.trim()) return;
    const ourCode = newVendorOurCode.trim() || `VND-${newVendorName.slice(0, 4).toUpperCase()}`;
    const ydCode = newYardiVendorCode.trim() || generateAutoYardiVendorCode(newVendorName);
    
    const newEntry: YardiVendorMapping = {
      id: `VMAP-USR-${Date.now()}`,
      ourVendorCode: ourCode,
      ourVendorName: newVendorName.trim(),
      yardiVendorCode: ydCode,
      yardiVendorName: `${newVendorName.trim()} Yardi AP`,
      defaultGlAccount: newVendorGl,
      status: ydCode ? 'Mapped' : 'Unmapped',
      isCustom: true
    };

    const updated = [newEntry, ...localVendors];
    setLocalVendors(updated);
    onUpdateVendorMappings(updated);
    saveStoredVendorMappings(updated);

    setNewVendorName('');
    setNewVendorOurCode('');
    setNewYardiVendorCode('');
    setShowAddVendor(false);
  };

  const handleAddNewEntity = () => {
    if (!newEntityName.trim()) return;
    const ourCode = newEntityOurCode.trim() || `ENT-${newEntityName.slice(0, 4).toUpperCase()}`;
    const ydCode = newYardiEntityCode.trim() || generateAutoYardiEntityCode(newEntityName);

    const newEntry: YardiEntityMapping = {
      id: `EMAP-USR-${Date.now()}`,
      ourEntityCode: ourCode,
      ourEntityName: newEntityName.trim(),
      yardiEntityCode: ydCode,
      yardiEntityName: `${newEntityName.trim()} Property SPV`,
      fundCode: newFundCode.trim() || 'FUND-CUSTOM',
      status: ydCode ? 'Mapped' : 'Unmapped',
      isCustom: true
    };

    const updated = [newEntry, ...localEntities];
    setLocalEntities(updated);
    onUpdateEntityMappings(updated);
    saveStoredEntityMappings(updated);

    setNewEntityName('');
    setNewEntityOurCode('');
    setNewYardiEntityCode('');
    setNewFundCode('');
    setShowAddEntity(false);
  };

  // Filter lists
  const filteredVendors = (localVendors || []).filter(v => {
    if (statusFilter === 'mapped' && v.status !== 'Mapped') return false;
    if (statusFilter === 'unmapped' && v.status !== 'Unmapped') return false;
    if ((unmappedVendorFilter || []).length > 0 && !(unmappedVendorFilter || []).includes(v.ourVendorName)) {
      // If user came to resolve specific missing items
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.ourVendorName || '').toLowerCase().includes(q) ||
      (v.ourVendorCode || '').toLowerCase().includes(q) ||
      (v.yardiVendorCode || '').toLowerCase().includes(q) ||
      (v.defaultGlAccount && v.defaultGlAccount.toLowerCase().includes(q))
    );
  });

  const filteredEntities = (localEntities || []).filter(e => {
    if (statusFilter === 'mapped' && e.status !== 'Mapped') return false;
    if (statusFilter === 'unmapped' && e.status !== 'Unmapped') return false;
    if ((unmappedEntityFilter || []).length > 0 && !(unmappedEntityFilter || []).includes(e.ourEntityName)) {
      // If user came to resolve specific missing items
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.ourEntityName || '').toLowerCase().includes(q) ||
      (e.ourEntityCode || '').toLowerCase().includes(q) ||
      (e.yardiEntityCode || '').toLowerCase().includes(q) ||
      (e.fundCode && e.fundCode.toLowerCase().includes(q))
    );
  });

  const unmappedVendorCount = (localVendors || []).filter(v => v.status === 'Unmapped' || !v.yardiVendorCode?.trim()).length;
  const unmappedEntityCount = (localEntities || []).filter(e => e.status === 'Unmapped' || !e.yardiEntityCode?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 p-5 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col w-full h-full overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-[#EA580C] rounded-xl border border-orange-200 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Yardi Voyager & Property Code Mapping System</h2>
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                  ETL Schema V2.4
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Map Internal Counterparties & Legal Entities to standard Yardi PayScan Vendor Codes and Property/SPV IDs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDemoDefaults}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Reset to default demo mappings with unmapped properties for testing"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset Demo Data</span>
            </button>
            <button
              onClick={handleAutoGenerateAllMissing}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Automatically generate standard Yardi codes for any unmapped counterparties"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Map All Missing</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-medium animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* STATUS ALERT IF UNMAPPED EXIST */}
        {(unmappedVendorCount > 0 || unmappedEntityCount > 0) && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Mapping Attention Required:</strong> {unmappedVendorCount} Vendor(s) and {unmappedEntityCount} Entity(ies) lack Yardi codes. Invoices referencing these cannot be loaded into Yardi Voyager without codes.
              </span>
            </div>
            <button
              onClick={handleAutoGenerateAllMissing}
              className="text-xs font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
            >
              Resolve All Automatically &rarr;
            </button>
          </div>
        )}

        {/* TAB CONTROLS & SEARCH BAR */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'vendors'
                  ? 'bg-white text-[#EA580C] shadow-xs border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>Vendor Mappings</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                unmappedVendorCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
              }`}>
                {localVendors.length} {unmappedVendorCount > 0 && `(${unmappedVendorCount} unmapped)`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('entities')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'entities'
                  ? 'bg-white text-[#EA580C] shadow-xs border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Entity / Property Mappings</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                unmappedEntityCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
              }`}>
                {localEntities.length} {unmappedEntityCount > 0 && `(${unmappedEntityCount} unmapped)`}
              </span>
            </button>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex items-center gap-2 grow max-w-md justify-end">
            <div className="relative grow">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab === 'vendors' ? 'vendors, Yardi codes...' : 'entities, property codes...'}`}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-[#EA580C] focus:border-[#EA580C] outline-hidden"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 focus:ring-1 focus:ring-[#EA580C] outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="mapped">Mapped Only</option>
              <option value="unmapped">Unmapped Only</option>
            </select>

            <button
              onClick={() => {
                if (activeTab === 'vendors') setShowAddVendor(true);
                else setShowAddEntity(true);
              }}
              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY (TABLES) */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: VENDOR MAPPINGS */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              
              {/* ADD VENDOR FORM INLINE */}
              {showAddVendor && (
                <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-lg animate-in fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#EA580C]" />
                      Add New Vendor Mapping
                    </h3>
                    <button
                      onClick={() => setShowAddVendor(false)}
                      className="text-gray-400 hover:text-gray-700 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Our Vendor Name</label>
                      <input
                        type="text"
                        value={newVendorName}
                        onChange={e => setNewVendorName(e.target.value)}
                        placeholder="e.g. Goldman Sachs Asset Mgt"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs outline-hidden focus:border-[#EA580C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Our Internal Code</label>
                      <input
                        type="text"
                        value={newVendorOurCode}
                        onChange={e => setNewVendorOurCode(e.target.value)}
                        placeholder="e.g. VND-GS-01"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs outline-hidden focus:border-[#EA580C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Yardi Vendor Code (PayScan)</label>
                      <input
                        type="text"
                        value={newYardiVendorCode}
                        onChange={e => setNewYardiVendorCode(e.target.value)}
                        placeholder="e.g. yd_goldman_01"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs outline-hidden focus:border-[#EA580C] font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddNewVendor}
                        disabled={!newVendorName.trim()}
                        className="w-full py-1.5 bg-[#EA580C] hover:bg-[#D94E07] disabled:bg-gray-300 text-white text-xs font-bold rounded transition-colors cursor-pointer"
                      >
                        Save Mapping
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VENDOR TABLE */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Our Vendor / Counterparty</th>
                      <th className="py-2.5 px-3">Internal Code</th>
                      <th className="py-2.5 px-3 w-64">Yardi Vendor Code (Voyager / PayScan)</th>
                      <th className="py-2.5 px-3">Default GL Account</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredVendors.map((v) => {
                      const isUnmapped = v.status === 'Unmapped' || !v.yardiVendorCode.trim();
                      return (
                        <tr
                          key={v.id}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            isUnmapped ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{v.ourVendorName}</span>
                              {v.taxId && (
                                <span className="text-[10px] text-gray-500 font-mono">({v.taxId})</span>
                              )}
                            </div>
                            {v.category && (
                              <div className="text-[10px] text-gray-500">{v.category}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-600 text-[11px]">
                            {v.ourVendorCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative">
                              <input
                                type="text"
                                value={v.yardiVendorCode}
                                onChange={e => handleVendorFieldChange(v.id, 'yardiVendorCode', e.target.value)}
                                placeholder="Enter Yardi code..."
                                className={`w-full px-2.5 py-1 text-xs font-mono rounded border outline-hidden transition-all ${
                                  isUnmapped
                                    ? 'border-amber-400 bg-amber-50 text-amber-900 placeholder:text-amber-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-500'
                                    : 'border-gray-300 bg-white text-gray-900 focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={v.defaultGlAccount || 'GL-6000 OPEX'}
                              onChange={e => handleVendorFieldChange(v.id, 'defaultGlAccount', e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono text-gray-700 bg-transparent hover:bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded outline-hidden"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isUnmapped ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Unmapped
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Mapped
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isUnmapped ? (
                              <button
                                onClick={() => {
                                  const auto = generateAutoYardiVendorCode(v.ourVendorName);
                                  handleVendorFieldChange(v.id, 'yardiVendorCode', auto);
                                }}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                Auto Code
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleVendorFieldChange(v.id, 'yardiVendorCode', '');
                                }}
                                className="px-2 py-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Clear Yardi code to mark this vendor as Unmapped for testing"
                              >
                                Unmap
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ENTITY / PROPERTY MAPPINGS */}
          {activeTab === 'entities' && (
            <div className="space-y-4">
              
              {/* ADD ENTITY FORM INLINE */}
              {showAddEntity && (
                <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-lg animate-in fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#EA580C]" />
                      Add New Entity / Property Mapping
                    </h3>
                    <button
                      onClick={() => setShowAddEntity(false)}
                      className="text-gray-400 hover:text-gray-700 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Our Entity Name / SPV</label>
                      <input
                        type="text"
                        value={newEntityName}
                        onChange={e => setNewEntityName(e.target.value)}
                        placeholder="e.g. Novus Lux Haven SPV"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs outline-hidden focus:border-[#EA580C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Our Entity Code</label>
                      <input
                        type="text"
                        value={newEntityOurCode}
                        onChange={e => setNewEntityOurCode(e.target.value)}
                        placeholder="e.g. ENT-HAVEN-01"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs outline-hidden focus:border-[#EA580C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Yardi Property Code</label>
                      <input
                        type="text"
                        value={newYardiEntityCode}
                        onChange={e => setNewYardiEntityCode(e.target.value)}
                        placeholder="e.g. prop_hvn01"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs outline-hidden focus:border-[#EA580C] font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddNewEntity}
                        disabled={!newEntityName.trim()}
                        className="w-full py-1.5 bg-[#EA580C] hover:bg-[#D94E07] disabled:bg-gray-300 text-white text-xs font-bold rounded transition-colors cursor-pointer"
                      >
                        Save Mapping
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ENTITY TABLE */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Our Legal Entity / SPV</th>
                      <th className="py-2.5 px-3">Internal Code</th>
                      <th className="py-2.5 px-3 w-64">Yardi Property / SPV Code</th>
                      <th className="py-2.5 px-3">Fund / Segment</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEntities.map((e) => {
                      const isUnmapped = e.status === 'Unmapped' || !e.yardiEntityCode.trim();
                      return (
                        <tr
                          key={e.id}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            isUnmapped ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-semibold text-gray-900">
                            <div>{e.ourEntityName}</div>
                            {e.legalJurisdiction && (
                              <div className="text-[10px] text-gray-500">{e.legalJurisdiction}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-600 text-[11px]">
                            {e.ourEntityCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative">
                              <input
                                type="text"
                                value={e.yardiEntityCode}
                                onChange={ev => handleEntityFieldChange(e.id, 'yardiEntityCode', ev.target.value)}
                                placeholder="Enter Yardi property code..."
                                className={`w-full px-2.5 py-1 text-xs font-mono rounded border outline-hidden transition-all ${
                                  isUnmapped
                                    ? 'border-amber-400 bg-amber-50 text-amber-900 placeholder:text-amber-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-500'
                                    : 'border-gray-300 bg-white text-gray-900 focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={e.fundCode || 'FUND-01'}
                              onChange={ev => handleEntityFieldChange(e.id, 'fundCode', ev.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono text-gray-700 bg-transparent hover:bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded outline-hidden"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isUnmapped ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Unmapped
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Mapped
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isUnmapped ? (
                              <button
                                onClick={() => {
                                  const auto = generateAutoYardiEntityCode(e.ourEntityName);
                                  handleEntityFieldChange(e.id, 'yardiEntityCode', auto);
                                }}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                Auto Code
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleEntityFieldChange(e.id, 'yardiEntityCode', '');
                                }}
                                className="px-2 py-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Clear Yardi code to mark this property as Unmapped for testing"
                              >
                                Unmap
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Changes are saved to persistent local storage and applied directly to ETL file streams and preview loaders.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 bg-[#EA580C] hover:bg-[#D94E07] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply All Mappings</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
