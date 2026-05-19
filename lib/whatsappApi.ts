/**
 * WhatsApp API Client — Frontend
 *
 * Reusable API helper for all WhatsApp dashboard API calls.
 * Used by React components to interact with the backend.
 */

import axios from 'axios';

const whatsappApi = axios.create({
  baseURL: '/api/whatsapp',
  headers: { 'Content-Type': 'application/json' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNEYS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchJourneys(status?: string) {
  const params = status && status !== 'all' ? { status } : {};
  const res = await whatsappApi.get('/journeys', { params });
  return res.data.journeys;
}

export async function updateJourneyStatus(journeyId: string, status: string) {
  const res = await whatsappApi.patch('/journeys', { journeyId, status });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchTemplates() {
  const res = await whatsappApi.get('/templates');
  return res.data.templates;
}

export async function createTemplate(data: {
  templateName: string;
  campaignName: string;
  templateId?: string;
  dayNumber: number;
  messageContent?: string;
  variables?: string[];
  active?: boolean;
}) {
  const res = await whatsappApi.post('/templates', data);
  return res.data;
}

export async function updateTemplate(templateId: string, updates: Record<string, any>) {
  const res = await whatsappApi.patch('/templates', { templateId, ...updates });
  return res.data;
}

export async function deleteTemplate(templateId: string) {
  const res = await whatsappApi.delete(`/templates?id=${templateId}`);
  return res.data;
}

export async function seedTemplates() {
  const res = await whatsappApi.post('/templates/seed');
  return res.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchLogs(filters?: {
  status?: string;
  customerId?: string;
  limit?: number;
}) {
  const res = await whatsappApi.get('/logs', { params: filters });
  return res.data.logs;
}

export async function retryMessage(logId: string) {
  const res = await whatsappApi.post('/logs', { logId });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchAnalytics() {
  const res = await whatsappApi.get('/analytics');
  return res.data.analytics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

export async function getSchedulerStatus() {
  const res = await whatsappApi.get('/scheduler');
  return res.data.scheduler;
}

export async function triggerScheduler() {
  const res = await whatsappApi.post('/scheduler');
  return res.data.result;
}
