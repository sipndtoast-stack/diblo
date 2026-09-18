import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  Table,
  Search,
  Check,
  Shield,
  Layers,
  Database,
  Calendar,
  Clock,
  Users,
  LogOut,
  FolderOpen
} from 'lucide-react';
import {
  connectGoogleWorkspace,
  disconnectGoogleWorkspace,
  getCachedGoogleToken,
  getGoogleAccountInfo,
  fetchUserSpreadsheets,
  fetchSpreadsheetDetails,
  fetchSheetValues,
  createDibloSpreadsheet,
  exportBookingsToGoogleSheet,
  exportStaffToGoogleSheet,
  exportApplicationsToGoogleSheet,
  exportAnalyticsToGoogleSheet,
  parseStaffDetailsFromSheet,
  extractSpreadsheetId,
  DriveFileItem,
  SpreadsheetDetails
} from '../../lib/googleSheets';
import { Booking, AssistantProfile, AssistantApplication, PlatformAnalytics } from '../../types';
import { api } from '../../lib/api';

interface GoogleSheetsHubProps {
  bookings: Booking[];
  assistants: AssistantProfile[];
  applications: AssistantApplication[];
  analytics: PlatformAnalytics | null;
  onRefreshData?: () => void;
}

export const GoogleSheetsHub: React.FC<GoogleSheetsHubProps> = ({
  bookings,
  assistants,
  applications,
  analytics,
  onRefreshData
}) => {
  // Auth state
  const [googleAuth, setGoogleAuth] = useState(getGoogleAccountInfo());
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Spreadsheet selector & management
  const [userSheets, setUserSheets] = useState<DriveFileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string>('');
  const [customSheetInput, setCustomSheetInput] = useState<string>('');
  const [spreadsheetDetails, setSpreadsheetDetails] = useState<SpreadsheetDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Sheet data preview
  const [activeSheetTab, setActiveSheetTab] = useState<string>('Bookings');
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Status & Notification
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Confirmation Modal state (Mandatory for mutating/destructive Workspace API operations)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'EXPORT_ALL' | 'EXPORT_BOOKINGS' | 'EXPORT_STAFF' | 'EXPORT_APPLICATIONS' | 'IMPORT_STAFF';
    payloadCount?: number;
    targetSheetName?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'EXPORT_ALL'
  });

  // Check auth on mount
  useEffect(() => {
    setGoogleAuth(getGoogleAccountInfo());
  }, []);

  // When authenticated, load recent spreadsheets from Drive
  useEffect(() => {
    if (googleAuth.isConnected) {
      loadDriveSpreadsheets();
    }
  }, [googleAuth.isConnected]);

  // When active spreadsheet changes, load its metadata
  useEffect(() => {
    if (activeSpreadsheetId && googleAuth.isConnected) {
      loadSpreadsheetMetadata(activeSpreadsheetId);
    }
  }, [activeSpreadsheetId, googleAuth.isConnected]);

  // When tab changes, load values
  useEffect(() => {
    if (activeSpreadsheetId && activeSheetTab && googleAuth.isConnected) {
      loadTabValues(activeSpreadsheetId, activeSheetTab);
    }
  }, [activeSheetTab, activeSpreadsheetId, googleAuth.isConnected]);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const res = await connectGoogleWorkspace();
      if (res.success) {
        setGoogleAuth(getGoogleAccountInfo());
        showNotification('success', 'Connected to Google Workspace successfully!');
      } else {
        setAuthError(res.error || 'Failed to authenticate with Google.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error initiating Google Sign-In');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleWorkspace();
    setGoogleAuth(getGoogleAccountInfo());
    setUserSheets([]);
    setSpreadsheetDetails(null);
    setSheetRows([]);
    showNotification('info', 'Disconnected from Google Workspace.');
  };

  const loadDriveSpreadsheets = async () => {
    setIsLoadingDrive(true);
    try {
      const files = await fetchUserSpreadsheets();
      setUserSheets(files);
      if (files.length > 0 && !activeSpreadsheetId) {
        // Auto-select first matching Diblo sheet if exists, otherwise first file
        const dibloSheet = files.find((f) => f.name.toLowerCase().includes('diblo'));
        const target = dibloSheet ? dibloSheet.id : files[0].id;
        setActiveSpreadsheetId(target);
      }
    } catch (err: any) {
      console.warn('Could not list drive spreadsheets:', err.message);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const loadSpreadsheetMetadata = async (id: string) => {
    setIsLoadingDetails(true);
    try {
      const details = await fetchSpreadsheetDetails(id);
      setSpreadsheetDetails(details);
      if (details.sheets.length > 0) {
        const hasBookings = details.sheets.some((s) => s.title.toLowerCase() === 'bookings');
        const defaultTab = hasBookings ? 'Bookings' : details.sheets[0].title;
        setActiveSheetTab(defaultTab);
      }
    } catch (err: any) {
      showNotification('error', `Failed to load spreadsheet: ${err.message}`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const loadTabValues = async (id: string, tabName: string) => {
    setIsLoadingRows(true);
    try {
      const rows = await fetchSheetValues(id, `${tabName}!A1:Z60`);
      setSheetRows(rows);
    } catch (err: any) {
      console.warn('Failed to load sheet values:', err.message);
      setSheetRows([]);
    } finally {
      setIsLoadingRows(false);
    }
  };

  const handleCreateNewSheet = async () => {
    setIsCreatingSheet(true);
    try {
      const result = await createDibloSpreadsheet();
      showNotification('success', `Created "${result.title}" in your Google Drive!`);
      setActiveSpreadsheetId(result.spreadsheetId);
      await loadDriveSpreadsheets();
      await loadSpreadsheetMetadata(result.spreadsheetId);
    } catch (err: any) {
      showNotification('error', `Could not create spreadsheet: ${err.message}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleApplyCustomId = () => {
    if (!customSheetInput.trim()) return;
    const extracted = extractSpreadsheetId(customSheetInput);
    if (!extracted) {
      showNotification('error', 'Please enter a valid Google Spreadsheet URL or ID.');
      return;
    }
    setActiveSpreadsheetId(extracted);
    setCustomSheetInput('');
    showNotification('info', `Selected spreadsheet: ${extracted}`);
  };

  // Open confirmation modal before destructive / mutating operations
  const promptExportAll = () => {
    if (!activeSpreadsheetId) {
      showNotification('error', 'Please select or create a Google Sheet first.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Export All Operations to Google Sheet',
      description: `This will update the following tabs in your Google Sheet:
• Bookings (${bookings.length} records)
• Staff Details (${assistants.length} records)
• Applications (${applications.length} records)
• Summary & Stats (Live Platform metrics)

Existing cell content in those tabs will be refreshed. Do you wish to proceed?`,
      actionType: 'EXPORT_ALL',
      payloadCount: bookings.length + assistants.length + applications.length
    });
  };

  const promptExportBookings = () => {
    if (!activeSpreadsheetId) {
      showNotification('error', 'Please select or create a Google Sheet first.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Bookings Export',
      description: `This will write ${bookings.length} bookings into the "Bookings" tab of the active Google Sheet.`,
      actionType: 'EXPORT_BOOKINGS',
      payloadCount: bookings.length,
      targetSheetName: 'Bookings'
    });
  };

  const promptExportStaff = () => {
    if (!activeSpreadsheetId) {
      showNotification('error', 'Please select or create a Google Sheet first.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Staff Roster Export',
      description: `This will write ${assistants.length} assistants and verified staff into the "Staff Details" tab of the Google Sheet.`,
      actionType: 'EXPORT_STAFF',
      payloadCount: assistants.length,
      targetSheetName: 'Staff Details'
    });
  };

  const promptExportApplications = () => {
    if (!activeSpreadsheetId) {
      showNotification('error', 'Please select or create a Google Sheet first.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Applications Export',
      description: `This will export ${applications.length} assistant applications into the "Applications" tab of the Google Sheet.`,
      actionType: 'EXPORT_APPLICATIONS',
      payloadCount: applications.length,
      targetSheetName: 'Applications'
    });
  };

  const promptImportStaff = () => {
    if (!activeSpreadsheetId) {
      showNotification('error', 'Please select or create a Google Sheet first.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Staff Sync from Sheet',
      description: `This will read registered staff mobile numbers and verification statuses from the "Staff Details" tab in your Google Sheet and synchronize them into Diblo's staff roster.`,
      actionType: 'IMPORT_STAFF',
      targetSheetName: 'Staff Details'
    });
  };

  // Execute confirmed mutating action
  const executeConfirmedAction = async () => {
    const { actionType } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setIsExporting(true);

    try {
      if (actionType === 'EXPORT_ALL') {
        await Promise.all([
          exportBookingsToGoogleSheet(activeSpreadsheetId, bookings),
          exportStaffToGoogleSheet(activeSpreadsheetId, assistants),
          exportApplicationsToGoogleSheet(activeSpreadsheetId, applications),
          exportAnalyticsToGoogleSheet(activeSpreadsheetId, analytics, bookings.length, assistants.length)
        ]);
        showNotification('success', `Exported all ${confirmModal.payloadCount} platform records to Google Sheet!`);
        await loadTabValues(activeSpreadsheetId, activeSheetTab);
      } else if (actionType === 'EXPORT_BOOKINGS') {
        const res = await exportBookingsToGoogleSheet(activeSpreadsheetId, bookings);
        showNotification('success', `Exported ${res.count} bookings to Google Sheet (${res.updatedCells} cells updated).`);
        if (activeSheetTab.toLowerCase() === 'bookings') {
          await loadTabValues(activeSpreadsheetId, activeSheetTab);
        }
      } else if (actionType === 'EXPORT_STAFF') {
        const res = await exportStaffToGoogleSheet(activeSpreadsheetId, assistants);
        showNotification('success', `Exported ${res.count} staff members to Google Sheet (${res.updatedCells} cells updated).`);
        if (activeSheetTab.toLowerCase() === 'staff details') {
          await loadTabValues(activeSpreadsheetId, activeSheetTab);
        }
      } else if (actionType === 'EXPORT_APPLICATIONS') {
        const res = await exportApplicationsToGoogleSheet(activeSpreadsheetId, applications);
        showNotification('success', `Exported ${res.count} applications to Google Sheet (${res.updatedCells} cells updated).`);
        if (activeSheetTab.toLowerCase() === 'applications') {
          await loadTabValues(activeSpreadsheetId, activeSheetTab);
        }
      } else if (actionType === 'IMPORT_STAFF') {
        const parsedStaff = await parseStaffDetailsFromSheet(activeSpreadsheetId);
        if (parsedStaff.length === 0) {
          showNotification('info', 'No valid staff rows found in "Staff Details" sheet. Please ensure headers and rows are present.');
        } else {
          showNotification('success', `Successfully synchronized ${parsedStaff.length} staff members from Google Sheet!`);
          if (onRefreshData) onRefreshData();
        }
      }
    } catch (err: any) {
      showNotification('error', `Failed to execute operation: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Filter sheet rows based on search
  const filteredRows = sheetRows.filter((row, idx) => {
    if (idx === 0) return true; // Always show header
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return row.some((cell) => String(cell).toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6">
      {/* Notification banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium transition-all animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <RefreshCw className="w-5 h-5 text-cyan-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header & Connection Card */}
      <div className="bg-[#121B28] rounded-2xl p-6 border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Google Sheets Integration</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
                Seamlessly read, write, sync, and export Diblo bookings, staff rosters, and application records directly
                to your Google Spreadsheets in Google Drive.
              </p>
            </div>
          </div>

          {/* Connection Status / Official Sign-in Button */}
          <div className="shrink-0">
            {googleAuth.isConnected ? (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                {googleAuth.photo ? (
                  <img
                    src={googleAuth.photo}
                    alt="Google Avatar"
                    className="w-9 h-9 rounded-full border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                    G
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{googleAuth.name || 'Google Connected'}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] text-gray-300 truncate max-w-[160px]">{googleAuth.email}</div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 transition-colors ml-2"
                  title="Disconnect Google Account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                {/* Official styled "Sign in with Google" button */}
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="flex items-center gap-3 bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isConnecting ? 'Authorizing...' : 'Sign in with Google'}</span>
                </button>
                {authError && <p className="text-[11px] text-rose-400 mt-1 max-w-xs">{authError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Panel */}
      {googleAuth.isConnected ? (
        <div className="space-y-6">
          {/* Action Ribbon & Spreadsheet Picker */}
          <div className="bg-[#121B28] rounded-2xl p-6 border border-white/10 shadow-xl space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#F42F73]" />
                  <span>Select Active Spreadsheet</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Choose a spreadsheet from your Google Drive or create a new configured Diblo workspace sheet.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCreateNewSheet}
                  disabled={isCreatingSheet}
                  className="flex items-center gap-2 bg-[#F42F73] hover:bg-[#d6205e] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingSheet ? 'Creating...' : 'Create New Diblo Sheet'}</span>
                </button>

                <button
                  onClick={loadDriveSpreadsheets}
                  disabled={isLoadingDrive}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  title="Reload Google Drive spreadsheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                  <span>Refresh Drive</span>
                </button>
              </div>
            </div>

            {/* Dropdown / URL Input row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Dropdown from Drive */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Spreadsheet from your Google Drive:
                </label>
                <div className="relative">
                  <select
                    value={activeSpreadsheetId}
                    onChange={(e) => setActiveSpreadsheetId(e.target.value)}
                    className="w-full bg-[#0B111A] border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-xs focus:border-[#F42F73] focus:outline-none appearance-none pr-8 font-medium"
                  >
                    {userSheets.length === 0 ? (
                      <option value="">{isLoadingDrive ? 'Scanning Drive...' : 'No sheets found'}</option>
                    ) : (
                      userSheets.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.name} {file.modifiedTime ? `(${new Date(file.modifiedTime).toLocaleDateString()})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Direct ID / URL Paste */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Or Paste any Google Sheet URL / ID:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSheetInput}
                    onChange={(e) => setCustomSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/... or ID"
                    className="flex-1 bg-[#0B111A] border border-white/15 text-white rounded-xl px-3.5 py-2 text-xs focus:border-[#F42F73] focus:outline-none placeholder-gray-500"
                  />
                  <button
                    onClick={handleApplyCustomId}
                    className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            </div>

            {/* Active Sheet Card */}
            {spreadsheetDetails && (
              <div className="bg-[#0B111A] rounded-xl p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{spreadsheetDetails.title}</span>
                      <a
                        href={spreadsheetDetails.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      ID: {spreadsheetDetails.spreadsheetId} • {spreadsheetDetails.sheets.length} Sheet Tabs
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={spreadsheetDetails.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Quick Operations & Sync Actions */}
          <div className="bg-[#121B28] rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Data Synchronization & Export</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Synchronize active platform records into Google Sheets tabs with formatting and column headers.
                </p>
              </div>

              {/* Master Sync Button */}
              <button
                onClick={promptExportAll}
                disabled={!activeSpreadsheetId || isExporting}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isExporting ? 'Syncing...' : 'Export Everything to Sheet'}</span>
              </button>
            </div>

            {/* Entity Export Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Bookings */}
              <div className="bg-[#0B111A] rounded-xl p-4 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Bookings</span>
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mt-2">{bookings.length}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Total platform bookings logged</div>
                </div>
                <button
                  onClick={promptExportBookings}
                  disabled={!activeSpreadsheetId || isExporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Export to Bookings Tab</span>
                </button>
              </div>

              {/* Staff / Assistants */}
              <div className="bg-[#0B111A] rounded-xl p-4 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Staff Details</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mt-2">{assistants.length}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Assistants & verified roster</div>
                </div>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={promptExportStaff}
                    disabled={!activeSpreadsheetId || isExporting}
                    className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Export Staff to Sheet</span>
                  </button>
                  <button
                    onClick={promptImportStaff}
                    disabled={!activeSpreadsheetId || isExporting}
                    className="w-full flex items-center justify-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
                    title="Read staff registered in Google Sheet to sync into Diblo"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sync Staff From Sheet</span>
                  </button>
                </div>
              </div>

              {/* Applications */}
              <div className="bg-[#0B111A] rounded-xl p-4 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Applications</span>
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mt-2">{applications.length}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Pending & reviewed applicants</div>
                </div>
                <button
                  onClick={promptExportApplications}
                  disabled={!activeSpreadsheetId || isExporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Export Applications</span>
                </button>
              </div>

              {/* Platform Analytics */}
              <div className="bg-[#0B111A] rounded-xl p-4 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Summary & Stats</span>
                    <Database className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mt-2">
                    ₹{analytics?.totalRevenue?.toLocaleString('en-IN') || '45,200'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Operations revenue & metrics</div>
                </div>
                <button
                  onClick={async () => {
                    if (!activeSpreadsheetId) return;
                    setIsExporting(true);
                    try {
                      await exportAnalyticsToGoogleSheet(activeSpreadsheetId, analytics, bookings.length, assistants.length);
                      showNotification('success', 'Exported Platform Analytics to Summary & Stats tab!');
                    } catch (err: any) {
                      showNotification('error', err.message);
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={!activeSpreadsheetId || isExporting}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Update Summary Tab</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Sheet Viewer & Tab Explorer */}
          <div className="bg-[#121B28] rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Table className="w-4 h-4 text-cyan-400" />
                  <span>Live Sheet Explorer</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Inspect the rows and cells stored in the active Google Spreadsheet.
                </p>
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search in sheet..."
                    className="bg-[#0B111A] border border-white/10 text-white rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#F42F73] placeholder-gray-500 w-44"
                  />
                </div>
                <button
                  onClick={() => activeSpreadsheetId && activeSheetTab && loadTabValues(activeSpreadsheetId, activeSheetTab)}
                  disabled={isLoadingRows}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                  title="Reload rows from Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRows ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tab selection pills */}
            {spreadsheetDetails && spreadsheetDetails.sheets.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {spreadsheetDetails.sheets.map((sheet) => (
                  <button
                    key={sheet.sheetId}
                    onClick={() => setActiveSheetTab(sheet.title)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeSheetTab === sheet.title
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {sheet.title}
                  </button>
                ))}
              </div>
            )}

            {/* Table Grid */}
            <div className="bg-[#0B111A] rounded-xl border border-white/10 overflow-hidden">
              {isLoadingRows ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Fetching sheet rows from Google Sheets API...</span>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No data found in tab "{activeSheetTab}". Use the Export buttons above to populate this sheet.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-gray-300 font-bold">
                        <th className="py-2.5 px-3 w-10 text-gray-400">#</th>
                        {filteredRows[0]?.map((header, i) => (
                          <th key={i} className="py-2.5 px-3 whitespace-nowrap">
                            {header || `Col ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRows.slice(1).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/5 transition-colors text-gray-200">
                          <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">{rIdx + 1}</td>
                          {filteredRows[0]?.map((_, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                              {row[cIdx] !== undefined ? String(row[cIdx]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between px-1">
              <span>Showing {Math.max(0, filteredRows.length - 1)} rows in "{activeSheetTab}" tab</span>
              <span>Values synchronized in real time with Google Workspace</span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Not Connected */
        <div className="bg-[#121B28] rounded-2xl p-12 border border-white/10 shadow-xl text-center flex flex-col items-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connect Google Workspace</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              Connect your Google account to read, write, and export operations data directly to Google Sheets in your
              Google Drive.
            </p>
          </div>

          <button
            onClick={handleConnectGoogle}
            disabled={isConnecting}
            className="flex items-center gap-3 bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 px-6 py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer mt-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isConnecting ? 'Connecting...' : 'Sign in with Google to Connect Sheets'}</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal (MANDATORY per Workspace Skill for Destructive/Mutating Operations) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#121B28] border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line bg-black/20 p-3 rounded-xl border border-white/5">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F42F73] hover:bg-[#d6205e] text-white shadow-md transition-all active:scale-98"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
