
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { IntegrationConfig, DEFAULT_INTEGRATION_CONFIG } from '@/types/config';

/**
 * Hook to manage institutional integrations (n8n, Evolution API, etc.)
 */
export function useIntegrations() {
  const db = useFirestore();
  const { schoolId, role } = useAuth();
  const [config, setConfig] = useState<IntegrationConfig>(DEFAULT_INTEGRATION_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    const configRef = doc(db, 'schools', schoolId, 'config', 'integrations');
    
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as IntegrationConfig);
      } else {
        // Doc might not exist yet, keep default
        setConfig(DEFAULT_INTEGRATION_CONFIG);
      }
      setLoading(false);
    }, (err) => {
      console.error('[INTEGRATIONS] Fetch error:', err);
      setError('Failed to load integration settings. Ensure you have ADMIN rights.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, schoolId]);

  const updateConfig = async (updates: Partial<IntegrationConfig>) => {
    if (!schoolId) throw new Error('No school is signed in.');
    if (role !== 'ADMIN') {
      throw new Error('Unauthorized: ONLY the Hub Administrator can modify these settings.');
    }

    const configRef = doc(db, 'schools', schoolId, 'config', 'integrations');
    try {
      await updateDoc(configRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('[INTEGRATIONS] Update error:', err);
      throw new Error('Could not load the automation settings.');
    }
  };

  return { config, loading, error, updateConfig };
}
