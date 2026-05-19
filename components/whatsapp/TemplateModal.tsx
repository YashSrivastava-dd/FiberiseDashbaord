'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save, Tag, Hash, FileText, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateFormData {
  templateName: string
  campaignName: string
  templateId: string
  dayNumber: number
  messageContent: string
  variables: string[]
  active: boolean
}

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TemplateFormData) => Promise<void>
  initialData?: Partial<TemplateFormData> & { id?: string }
  mode: 'create' | 'edit'
}

const defaultData: TemplateFormData = {
  templateName: '',
  campaignName: '',
  templateId: '',
  dayNumber: 0,
  messageContent: '',
  variables: [],
  active: true,
}

/**
 * Modal for creating/editing template mappings.
 * Supports dynamic variable tags (add/remove).
 */
export function TemplateModal({ isOpen, onClose, onSave, initialData, mode }: TemplateModalProps) {
  const [formData, setFormData] = useState<TemplateFormData>(defaultData)
  const [newVariable, setNewVariable] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...defaultData,
        ...initialData,
        variables: initialData?.variables || [],
      })
      setNewVariable('')
      setError(null)
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.templateName.trim()) {
      setError('Template name is required')
      return
    }

    if (!formData.campaignName.trim()) {
      setError('Campaign name is required')
      return
    }

    setSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const addVariable = () => {
    const v = newVariable.trim()
    if (v && !formData.variables.includes(v)) {
      setFormData((prev) => ({
        ...prev,
        variables: [...prev.variables, v],
      }))
      setNewVariable('')
    }
  }

  const removeVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== variable),
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#0e121a]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            {mode === 'create' ? 'Map New Template' : 'Edit Template'}
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Template Name */}
          <div>
            <label className="block text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">
              Template Name *
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={formData.templateName}
                onChange={(e) => setFormData((p) => ({ ...p, templateName: e.target.value }))}
                placeholder="e.g., order_confirmation_v1"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Campaign Name */}
          <div>
            <label className="block text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">
              AiSensy Campaign Name *
            </label>
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={formData.campaignName}
                onChange={(e) => setFormData((p) => ({ ...p, campaignName: e.target.value }))}
                placeholder="e.g., fiberise_order_confirm"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Day Number */}
          <div>
            <label className="block text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">
              Day Number *
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="number"
                min={0}
                value={formData.dayNumber}
                onChange={(e) => setFormData((p) => ({ ...p, dayNumber: parseInt(e.target.value) || 0 }))}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <p className="text-white/30 text-[11px] mt-1">0 = Order confirmation, 1 = Day 1, etc.</p>
          </div>

          {/* Message Content (preview) */}
          <div>
            <label className="block text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">
              Message Preview
            </label>
            <textarea
              value={formData.messageContent}
              onChange={(e) => setFormData((p) => ({ ...p, messageContent: e.target.value }))}
              placeholder="Brief description of the template content..."
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
            />
          </div>

          {/* Variables */}
          <div>
            <label className="block text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">
              Template Variables
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addVariable()
                  }
                }}
                placeholder="e.g., customer_name"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={addVariable}
                className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Variable Tags */}
            <div className="flex flex-wrap gap-2">
              {formData.variables.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 font-mono"
                >
                  {'{{' + v + '}}'}
                  <button
                    type="button"
                    onClick={() => removeVariable(v)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {formData.variables.length === 0 && (
                <span className="text-white/20 text-xs">No variables added</span>
              )}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
            <span className="text-white/70 text-sm font-semibold">Active</span>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, active: !p.active }))}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                formData.active ? 'bg-emerald-500' : 'bg-white/20'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-lg',
                  formData.active ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-white/10 hover:bg-white/5 text-white/60 hover:text-white font-semibold text-sm rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
