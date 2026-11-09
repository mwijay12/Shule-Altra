
'use client';

/**
 * @fileOverview n8n webhook dispatch.
 * Replaced localStorage usage with secure Firestore-backed configuration.
 */

import { doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore: db } = initializeFirebase();

interface N8nConfig {
  webhookUrl: string;
  enabled: boolean;
}

/**
 * Fetches the secure webhook configuration from Firestore.
 */
export async function getSecureWebhookConfig(
  schoolId: string = 'school-001'
): Promise<N8nConfig | null> {
  try {
    const configRef = doc(db, 'schools', schoolId, 'config', 'integrations');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return null;
    }

    const data = configSnap.data();
    return {
      webhookUrl: data.n8nWebhookUrl ?? '',
      enabled: data.n8nEnabled ?? false,
    };
  } catch (error) {
    console.error('[N8N] Secure config fetch failed:', error);
    return null;
  }
}

/**
 * Dispatches an event to the configured n8n webhook node.
 */
export async function triggerN8nWebhook(
  eventType: string,
  payload: Record<string, any>,
  schoolId: string = 'school-001'
): Promise<boolean> {
  // Fetch real-time config from Firestore instead of localStorage
  const config = await getSecureWebhookConfig(schoolId);

  if (!config || !config.webhookUrl || !config.enabled) {
    console.warn('[N8N] Skipped — automation is disabled or not configured');
    return false;
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shule-Event': eventType,
      },
      body: JSON.stringify({
        schoolId,
        eventType,
        timestamp: new Date().toISOString(),
        node: "Shule Altra Pro 2026",
        data: payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook rejected the request: ${response.status}`);
    }

    console.log(`[N8N] Dispatched: ${eventType}`);
    return true;
  } catch (error) {
    console.error('[N8N] Dispatch error:', error);
    return false;
  }
}
