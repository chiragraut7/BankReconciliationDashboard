import { YardiVendorMapping, YardiEntityMapping } from '../types/yardiMapping';

export const INITIAL_YARDI_VENDOR_MAPPINGS: YardiVendorMapping[] = [
  {
    id: 'VMAP-001',
    ourVendorCode: 'VND-ALPHATECH',
    ourVendorName: 'AlphaTech Solutions Pvt. Ltd.',
    yardiVendorCode: 'yd_alphatech_01',
    yardiVendorName: 'AlphaTech Solutions UK / Yardi AP',
    taxId: 'GB 882 1094 33',
    defaultGlAccount: 'GL-6100 ESG',
    category: 'IT & Advisory Services',
    status: 'Mapped'
  },
  {
    id: 'VMAP-002',
    ourVendorCode: 'VND-NEXUS-MGT',
    ourVendorName: 'Nexus Credit Partners Investment Management Limited',
    yardiVendorCode: 'yd_nexus_cred_01',
    yardiVendorName: 'Nexus Credit Partners Management Yardi',
    taxId: 'GB 982 4410 89',
    defaultGlAccount: 'GL-6100 ESG',
    category: 'Investment Advisory',
    status: 'Mapped'
  },
  {
    id: 'VMAP-003',
    ourVendorCode: 'VND-BX-REALTY',
    ourVendorName: 'Blackstone Real Estate Advisors UK',
    yardiVendorCode: 'yd_brep_adv_01',
    yardiVendorName: 'Blackstone RE Partners AP Yardi',
    taxId: 'GB 114 8830 42',
    defaultGlAccount: 'GL-7200 VAL',
    category: 'Real Estate Due Diligence',
    status: 'Mapped'
  },
  {
    id: 'VMAP-004',
    ourVendorCode: 'VND-KKR-CRED',
    ourVendorName: 'KKR Credit Advisors (US) LLC',
    yardiVendorCode: 'yd_kkr_us_01',
    yardiVendorName: 'KKR Credit Advisors US Entity',
    taxId: 'US 13-9284102',
    defaultGlAccount: 'GL-6900 ADM',
    category: 'Credit Agency Administration',
    status: 'Mapped'
  },
  {
    id: 'VMAP-005',
    ourVendorCode: 'VND-APOLLO-PE',
    ourVendorName: 'Apollo Global Management Europe LLP',
    yardiVendorCode: 'yd_apollo_eur_01',
    yardiVendorName: 'Apollo Global Mgt Europe Yardi',
    taxId: 'LU 298 440 19',
    defaultGlAccount: 'GL-7400 TAX',
    category: 'Private Equity Advisory',
    status: 'Mapped'
  },
  {
    id: 'VMAP-006',
    ourVendorCode: 'VND-BT-UK',
    ourVendorName: 'British Telecom UK Ltd',
    yardiVendorCode: 'yd_bt_telecom_01',
    yardiVendorName: 'British Telecom Corporate AP',
    taxId: 'GB 245 7193 00',
    defaultGlAccount: 'GL-6300 TEL',
    category: 'Telecom & Connectivity',
    status: 'Mapped'
  },
  {
    id: 'VMAP-007',
    ourVendorCode: 'VND-SIEMENS-DE',
    ourVendorName: 'Siemens AG Germany',
    yardiVendorCode: 'yd_siemens_de_01',
    yardiVendorName: 'Siemens AG Munich Yardi PayScan',
    taxId: 'DE 129 274 001',
    defaultGlAccount: 'GL-7500 IND',
    category: 'Industrial Automation',
    status: 'Mapped'
  },
  {
    id: 'VMAP-008',
    ourVendorCode: 'VND-VODAFONE',
    ourVendorName: 'Vodafone Global UK',
    yardiVendorCode: 'yd_vodafone_uk_01',
    yardiVendorName: 'Vodafone Global M2M Services',
    taxId: 'GB 569 9532 77',
    defaultGlAccount: 'GL-6400 IOT',
    category: 'Telecom Services',
    status: 'Mapped'
  },
  {
    id: 'VMAP-009',
    ourVendorCode: 'VND-ACME-SUP',
    ourVendorName: 'Acme Supplies',
    yardiVendorCode: 'yd_acme_supplies_01',
    yardiVendorName: 'Acme Enterprise Supplies Corp',
    taxId: 'US 44-9102834',
    defaultGlAccount: 'GL-5400 SUP',
    category: 'Hardware & Workspace',
    status: 'Mapped'
  },
  {
    id: 'VMAP-010',
    ourVendorCode: 'VND-ABC-SERV',
    ourVendorName: 'ABC Services',
    yardiVendorCode: 'yd_abc_services_01',
    yardiVendorName: 'ABC Engineering Services LLC',
    taxId: 'US 92-1140921',
    defaultGlAccount: 'GL-4200 ENG',
    category: 'Engineering Services',
    status: 'Mapped'
  },
  {
    id: 'VMAP-011',
    ourVendorCode: 'VND-MSFT-AZURE',
    ourVendorName: 'Microsoft Cloud',
    yardiVendorCode: 'yd_msft_azure_01',
    yardiVendorName: 'Microsoft Azure Cloud Services',
    taxId: 'US 91-1148120',
    defaultGlAccount: 'GL-6200 CLOUD',
    category: 'SaaS Software',
    status: 'Mapped'
  },
  {
    id: 'VMAP-012',
    ourVendorCode: 'VND-STRIPE-MERCH',
    ourVendorName: 'Stripe Merchant Settlement',
    yardiVendorCode: 'yd_stripe_pay_01',
    yardiVendorName: 'Stripe Payments International',
    taxId: 'US 88-1294819',
    defaultGlAccount: 'GL-4100 INC',
    category: 'Payment Processing',
    status: 'Mapped'
  },
  {
    id: 'VMAP-013',
    ourVendorCode: 'VND-GLOBAL-LOG',
    ourVendorName: 'Global Logistics',
    yardiVendorCode: 'yd_global_logistics_01',
    yardiVendorName: 'Global Logistics Freight Corp',
    taxId: 'US 33-8812903',
    defaultGlAccount: 'GL-5500 FRT',
    category: 'Freight & Logistics',
    status: 'Mapped'
  },
  {
    id: 'VMAP-014',
    ourVendorCode: 'VND-QUAD-INFRA',
    ourVendorName: 'Global Infrastructure & Data Centers Group',
    yardiVendorCode: 'yd_quad_infra_01',
    yardiVendorName: 'Global Infrastructure Corp Yardi',
    taxId: 'LU 993 112 04',
    defaultGlAccount: 'GL-5100 DATA',
    category: 'Data Centers & Infrastructure',
    status: 'Mapped'
  },
  {
    id: 'VMAP-015',
    ourVendorCode: 'VND-DELTA-CONS',
    ourVendorName: 'Delta Consulting',
    yardiVendorCode: 'yd_delta_consult_01',
    yardiVendorName: 'Delta Consulting Group Ltd',
    taxId: 'US 11-4091823',
    defaultGlAccount: 'GL-6600 AUD',
    category: 'Corporate Advisory',
    status: 'Mapped'
  },
  {
    id: 'VMAP-016',
    ourVendorCode: 'VND-DASSAULT',
    ourVendorName: 'Dassault Aviation Systems',
    yardiVendorCode: '', // Demo unmapped
    yardiVendorName: '',
    taxId: 'FR 38 400 829 110',
    defaultGlAccount: 'GL-7800 CAD',
    category: 'Engineering Modeling',
    status: 'Unmapped'
  }
];

export const INITIAL_YARDI_ENTITY_MAPPINGS: YardiEntityMapping[] = [
  {
    id: 'EMAP-001',
    ourEntityCode: 'ENT-EVERMONT-02',
    ourEntityName: 'Novus Lux Evermont 02 SCSp',
    yardiEntityCode: 'prop_evr02',
    yardiEntityName: 'Novus Evermont 02 Lux Property / SPV',
    fundCode: 'FUND-NOVUS-02',
    legalJurisdiction: 'Luxembourg (CSSF Regulated)',
    status: 'Mapped'
  },
  {
    id: 'EMAP-002',
    ourEntityCode: 'ENT-STONEGATE-05',
    ourEntityName: 'Novus Lux Stonegate 05 SCSp',
    yardiEntityCode: 'prop_stn05',
    yardiEntityName: 'Novus Stonegate 05 Lux Property / SPV',
    fundCode: 'FUND-NOVUS-05',
    legalJurisdiction: 'Luxembourg (CSSF Regulated)',
    status: 'Mapped'
  },
  {
    id: 'EMAP-003',
    ourEntityCode: 'ENT-FAIRHAVEN-06',
    ourEntityName: 'Novus Lux Fairhaven Intermediate 06 SCSp',
    yardiEntityCode: 'prop_fair06',
    yardiEntityName: 'Novus Fairhaven Inter 06 SPV',
    fundCode: 'FUND-NOVUS-06',
    legalJurisdiction: 'Luxembourg (CSSF Regulated)',
    status: 'Mapped'
  },
  {
    id: 'EMAP-004',
    ourEntityCode: 'ENT-NEXUS-FUND4',
    ourEntityName: 'Nexus Credit Partners Fund IV',
    yardiEntityCode: 'prop_nex_f4',
    yardiEntityName: 'Nexus Credit Opps Fund IV LP',
    fundCode: 'FUND-NEX-IV',
    legalJurisdiction: 'United Kingdom / Guernsey',
    status: 'Mapped'
  },
  {
    id: 'EMAP-005',
    ourEntityCode: 'ENT-NEXUS-DIRLEND',
    ourEntityName: 'Nexus Direct Lending Lux',
    yardiEntityCode: 'prop_nex_dl01',
    yardiEntityName: 'Nexus Direct Lending S.a.r.l',
    fundCode: 'FUND-NEX-DL',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-006',
    ourEntityCode: 'ENT-NEXUS-OPPS',
    ourEntityName: 'Nexus European Credit Opps',
    yardiEntityCode: 'prop_nex_eco',
    yardiEntityName: 'Nexus European Credit Opps S.a.r.l',
    fundCode: 'FUND-NEX-ECO',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-007',
    ourEntityCode: 'ENT-NEXUS-MAIN',
    ourEntityName: 'Nexus European Credit Opportunities S.a.r.l',
    yardiEntityCode: 'prop_nex_main',
    yardiEntityName: 'Nexus European Credit S.a.r.l Master',
    fundCode: 'FUND-NEX-MST',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-008',
    ourEntityCode: 'ENT-BX-LOGIS',
    ourEntityName: 'Blackstone Pan-European Logistics',
    yardiEntityCode: 'prop_bx_log01',
    yardiEntityName: 'Blackstone European Logistics Portfolio SPV',
    fundCode: 'FUND-BREP-VI',
    legalJurisdiction: 'United Kingdom / Jersey',
    status: 'Mapped'
  },
  {
    id: 'EMAP-009',
    ourEntityCode: 'ENT-BX-HOSP',
    ourEntityName: 'Blackstone Hospitality Lux',
    yardiEntityCode: 'prop_bx_hosp02',
    yardiEntityName: 'Blackstone Hospitality Lux Holdco',
    fundCode: 'FUND-BREP-VI',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-010',
    ourEntityCode: 'ENT-BX-MAIN',
    ourEntityName: 'BREP Europe VI Investment S.a.r.l',
    yardiEntityCode: 'prop_bx_main',
    yardiEntityName: 'BREP Europe VI Investment Master S.a.r.l',
    fundCode: 'FUND-BREP-MST',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-011',
    ourEntityCode: 'ENT-KKR-FUND1',
    ourEntityName: 'KKR Private Credit Fund I',
    yardiEntityCode: 'prop_kkr_pcf1',
    yardiEntityName: 'KKR Private Credit Fund I LP',
    fundCode: 'FUND-KKR-PC1',
    legalJurisdiction: 'Delaware, USA',
    status: 'Mapped'
  },
  {
    id: 'EMAP-012',
    ourEntityCode: 'ENT-KKR-MEZZ',
    ourEntityName: 'KKR Mezzanine Partners',
    yardiEntityCode: 'prop_kkr_mezz',
    yardiEntityName: 'KKR Mezzanine Co-Invest Partners',
    fundCode: 'FUND-KKR-MEZ',
    legalJurisdiction: 'Delaware, USA',
    status: 'Mapped'
  },
  {
    id: 'EMAP-013',
    ourEntityCode: 'ENT-KKR-MAIN',
    ourEntityName: 'KKR Global Private Credit Opportunity Fund',
    yardiEntityCode: 'prop_kkr_main',
    yardiEntityName: 'KKR Global Private Credit Master Fund',
    fundCode: 'FUND-KKR-MST',
    legalJurisdiction: 'Cayman Islands / Delaware',
    status: 'Mapped'
  },
  {
    id: 'EMAP-014',
    ourEntityCode: 'ENT-APOLLO-BUYOUT',
    ourEntityName: 'Apollo European Buyout Fund',
    yardiEntityCode: 'prop_apo_buy01',
    yardiEntityName: 'Apollo European Buyout IX SPV',
    fundCode: 'FUND-APO-IX',
    legalJurisdiction: 'United Kingdom',
    status: 'Mapped'
  },
  {
    id: 'EMAP-015',
    ourEntityCode: 'ENT-APOLLO-HYBRID',
    ourEntityName: 'Apollo Hybrid Value Lux',
    yardiEntityCode: 'prop_apo_hyb02',
    yardiEntityName: 'Apollo Hybrid Value Lux Holdco S.a.r.l',
    fundCode: 'FUND-APO-HV',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-016',
    ourEntityCode: 'ENT-APOLLO-MAIN',
    ourEntityName: 'Apollo Investment Fund IX S.a.r.l',
    yardiEntityCode: 'prop_apo_main',
    yardiEntityName: 'Apollo Investment Fund IX Master S.a.r.l',
    fundCode: 'FUND-APO-MST',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-017',
    ourEntityCode: 'ENT-BT-LON',
    ourEntityName: 'London HQ Trading Operations',
    yardiEntityCode: 'prop_bt_lon_hq',
    yardiEntityName: 'London HQ Trading Property / Cost Center',
    fundCode: 'OP-UK-LON',
    legalJurisdiction: 'United Kingdom',
    status: 'Mapped'
  },
  {
    id: 'EMAP-018',
    ourEntityCode: 'ENT-BT-EDI',
    ourEntityName: 'Edinburgh Back-office Hub',
    yardiEntityCode: 'prop_bt_edi_hub',
    yardiEntityName: 'Edinburgh Operations Hub Cost Center',
    fundCode: 'OP-UK-EDI',
    legalJurisdiction: 'United Kingdom (Scotland)',
    status: 'Mapped'
  },
  {
    id: 'EMAP-019',
    ourEntityCode: 'ENT-BT-MAIN',
    ourEntityName: 'BT Global Communications UK',
    yardiEntityCode: 'prop_bt_main',
    yardiEntityName: 'BT Global Communications Master Corp',
    fundCode: 'OP-BT-UK',
    legalJurisdiction: 'United Kingdom',
    status: 'Mapped'
  },
  {
    id: 'EMAP-020',
    ourEntityCode: 'ENT-SIEM-MUNICH',
    ourEntityName: 'Munich Smart Plant 1',
    yardiEntityCode: 'prop_siem_mun01',
    yardiEntityName: 'Siemens Munich Industrial Facility SPV',
    fundCode: 'OP-DE-MUN',
    legalJurisdiction: 'Germany',
    status: 'Mapped'
  },
  {
    id: 'EMAP-021',
    ourEntityCode: 'ENT-SIEM-STUTT',
    ourEntityName: 'Stuttgart Logistics Depot',
    yardiEntityCode: 'prop_siem_stt02',
    yardiEntityName: 'Siemens Stuttgart Logistics Hub',
    fundCode: 'OP-DE-STT',
    legalJurisdiction: 'Germany',
    status: 'Mapped'
  },
  {
    id: 'EMAP-022',
    ourEntityCode: 'ENT-SIEM-MAIN',
    ourEntityName: 'Siemens Industrial Automation S.A.',
    yardiEntityCode: 'prop_siem_main',
    yardiEntityName: 'Siemens Industrial Automation Master SA',
    fundCode: 'OP-DE-MST',
    legalJurisdiction: 'France / Germany',
    status: 'Mapped'
  },
  {
    id: 'EMAP-023',
    ourEntityCode: 'ENT-VOD-FLEET',
    ourEntityName: 'Global Fleet Telematics',
    yardiEntityCode: 'prop_vod_flt01',
    yardiEntityName: 'Vodafone Global Fleet M2M Cost Center',
    fundCode: 'OP-VOD-M2M',
    legalJurisdiction: 'United Kingdom',
    status: 'Mapped'
  },
  {
    id: 'EMAP-024',
    ourEntityCode: 'ENT-VOD-MAIN',
    ourEntityName: 'Vodafone Roaming Services UK',
    yardiEntityCode: 'prop_vod_main',
    yardiEntityName: 'Vodafone Roaming Services Master Corp',
    fundCode: 'OP-VOD-MST',
    legalJurisdiction: 'United Kingdom',
    status: 'Mapped'
  },
  {
    id: 'EMAP-025',
    ourEntityCode: 'ENT-NOVUS-INFRA1',
    ourEntityName: 'Novus European Infrastructure Fund I',
    yardiEntityCode: 'prop_nov_inf01',
    yardiEntityName: 'Novus European Infrastructure Fund I SCSp',
    fundCode: 'FUND-NOV-INF1',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-026',
    ourEntityCode: 'ENT-NEX-DIGITAL',
    ourEntityName: 'Nexus Digital Real Estate Holdco',
    yardiEntityCode: 'prop_nex_dig02',
    yardiEntityName: 'Nexus Digital Real Estate Holdco S.a.r.l',
    fundCode: 'FUND-NEX-DIG',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-027',
    ourEntityCode: 'ENT-CORP-TREAS-LUX',
    ourEntityName: 'Corporate Treasury Lux',
    yardiEntityCode: 'prop_corp_trs01',
    yardiEntityName: 'Corporate Treasury Lux Master Holdco',
    fundCode: 'TREAS-LUX',
    legalJurisdiction: 'Luxembourg',
    status: 'Mapped'
  },
  {
    id: 'EMAP-028',
    ourEntityCode: 'ENT-DASSAULT-MAIN',
    ourEntityName: 'Dassault Aviation Group S.A.',
    yardiEntityCode: '', // Demo unmapped
    yardiEntityName: '',
    fundCode: 'UNMAPPED-DAS',
    legalJurisdiction: 'France',
    status: 'Unmapped'
  }
];
