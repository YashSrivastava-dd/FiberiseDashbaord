'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Terminal, 
  Eye, 
  X, 
  Clock, 
  User, 
  Globe, 
  Smartphone,
  Copy,
  Check
} from 'lucide-react'

interface AuditLog {
  id: string
  userId: string
  userEmail: string
  actionType: string
  details: any
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedActionType, setSelectedActionType] = useState('ALL')
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/audit-logs?limit=250')
      const data = await res.json()
      if (data.success && data.logs) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLogs()
  }

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopiedId('payload')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Filter logs based on search and selected action category
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.includes(searchTerm))

    const matchesAction = 
      selectedActionType === 'ALL' ||
      (selectedActionType === 'AUTH' && (log.actionType === 'USER_LOGIN' || log.actionType === 'USER_LOGOUT')) ||
      (selectedActionType === 'TEMPLATES' && log.actionType.includes('TEMPLATE')) ||
      (selectedActionType === 'JOURNEYS' && log.actionType.includes('JOURNEY')) ||
      (selectedActionType === 'EMAIL' && log.actionType.includes('EMAIL'))

    return matchesSearch && matchesAction
  })

  // Helper for color-coding action badges
  const getActionBadgeStyle = (actionType: string) => {
    switch (actionType) {
      case 'USER_LOGIN':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'USER_LOGOUT':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      case 'CREATE_TEMPLATE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      case 'UPDATE_TEMPLATE':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
      case 'DELETE_TEMPLATE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      case 'UPDATE_JOURNEY_STATUS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'TRIGGER_TEST_RTO_EMAIL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    }
  }

  // Helper to format date cleanly
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 min-w-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Security Audit Logs
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Non-deletable trace logs mapping active employee and admin actions across Fiberise Fit.
                </p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/5 disabled:opacity-50 text-white rounded-xl border border-white/10 transition-all font-medium text-sm w-full sm:w-auto shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Trace
            </button>
          </div>

          {/* Filters Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by user email, action type, or IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0e121a]/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all shadow-inner"
              />
            </div>

            {/* Action Type Dropdown */}
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="bg-[#0e121a]/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all shadow-inner cursor-pointer"
            >
              <option value="ALL">All Event Categories</option>
              <option value="AUTH">Authentication (Login/Logout)</option>
              <option value="TEMPLATES">WhatsApp Templates Mappings</option>
              <option value="JOURNEYS">WhatsApp Campaigns & Journeys</option>
              <option value="EMAIL">System Email Triggers</option>
            </select>
          </div>

          {/* Logs Table Card */}
          <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            
            {loading && logs.length === 0 ? (
              // Loading Skeleton State
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                <p className="text-slate-400 text-sm">Fetching verified audit data from secure collection...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              // Empty State
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-white/5 rounded-full text-slate-500">
                  <Terminal className="w-8 h-8" />
                </div>
                <p className="text-white font-semibold text-lg">No audit matches found</p>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Try adjusting your search criteria, selecting a different category dropdown, or triggering a new action.
                </p>
              </div>
            ) : (
              // Responsive Table Container
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-semibold text-slate-400 uppercase bg-white/2 select-none">
                      <th className="px-6 py-4"><span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timestamp</span></th>
                      <th className="px-6 py-4"><span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> User Identity</span></th>
                      <th className="px-6 py-4">Action Event</th>
                      <th className="px-6 py-4"><span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> IP & Agent</span></th>
                      <th className="px-6 py-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-white/2 transition-colors duration-150 group"
                      >
                        {/* Timestamp */}
                        <td className="px-6 py-4 text-slate-300 font-mono text-xs whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </td>

                        {/* User Identity */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{log.userEmail}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {log.userId.slice(0, 8)}...</span>
                          </div>
                        </td>

                        {/* Action Event Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono border ${getActionBadgeStyle(log.actionType)}`}>
                            {log.actionType}
                          </span>
                        </td>

                        {/* Network Metadata (IP / Agent) */}
                        <td className="px-6 py-4 max-w-xs truncate">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-400">
                            <span className="font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              {log.ipAddress || 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate flex items-center gap-1" title={log.userAgent}>
                              <Smartphone className="w-3 h-3 flex-shrink-0" />
                              {log.userAgent || 'System'}
                            </span>
                          </div>
                        </td>

                        {/* Payload Inspection Trigger */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setInspectLog(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 active:bg-white/5 border border-white/10 hover:border-purple-500/30 text-slate-300 hover:text-purple-300 font-medium text-xs transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Table Footer Stats */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500 bg-[#0c0f17]">
              <span>Showing {filteredLogs.length} matching audit trace documents</span>
              <span className="font-mono">Secure Non-Deletable DB Node</span>
            </div>
          </div>
        </div>
      </main>

      {/* INSPECT LOG MODAL DRAWER */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Glassmorphic Blur */}
          <div 
            onClick={() => setInspectLog(null)} 
            className="absolute inset-0 bg-[#05060a]/80 backdrop-blur-sm transition-opacity duration-300"
          ></div>

          {/* Modal Container Card */}
          <div className="bg-[#0e121a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative z-10 overflow-hidden transform scale-100 transition-transform duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#121722]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Inspect Action Payload</h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-mono">{inspectLog.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectLog(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Event Metadata Cards Grid */}
              <div className="grid grid-cols-2 gap-4 bg-[#121722]/50 border border-white/5 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">Timestamp</span>
                  <span className="text-slate-300 text-xs font-mono">{formatDate(inspectLog.timestamp)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">User Identity</span>
                  <span className="text-slate-300 text-xs truncate block font-mono">{inspectLog.userEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">Action Event</span>
                  <span className="text-purple-400 font-mono text-xs">{inspectLog.actionType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">Host IP</span>
                  <span className="text-slate-300 text-xs font-mono">{inspectLog.ipAddress || 'N/A'}</span>
                </div>
              </div>

              {/* JSON Payload Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold select-none px-1">
                  <span>Structured Document Payload</span>
                  <button 
                    onClick={() => handleCopyPayload(inspectLog.details)}
                    className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                  >
                    {copiedId === 'payload' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#080a0f] border border-white/10 rounded-xl p-4 overflow-x-auto max-h-[300px]">
                  <pre className="text-xs font-mono text-purple-300 leading-relaxed tab-size-2">
                    {JSON.stringify(inspectLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Security Trace Warning */}
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <strong className="text-amber-400 text-xs block uppercase tracking-wider mb-0.5">Immutable Record Notice</strong>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    This document log was written directly to the secure Firestore ledger `action_logs` and cannot be modified or deleted by dashboard employees, supervisors, or administrators.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/5 bg-[#121722]/50 flex items-center justify-end">
              <button 
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
