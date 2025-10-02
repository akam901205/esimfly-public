// Custom hook for ESim data management

import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Alert } from 'react-native';
import { AuthContext } from '../api/AuthContext';
import { newApi } from '../api/api';
import { ESim } from '../types/esim.types';
import { transformEsimData } from '../utils/esim.utils';

export const useESimData = () => {
  const { userToken } = useContext(AuthContext);
  const [esimData, setEsimData] = useState<ESim[]>([]);
  const [visibleEsims, setVisibleEsims] = useState<ESim[]>([]);
  const [selectedEsim, setSelectedEsim] = useState<ESim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const selectedEsimRef = useRef<ESim | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    selectedEsimRef.current = selectedEsim;
  }, [selectedEsim]);

  const fetchEsimData = useCallback(async (showLoading = true, preserveSelection = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      if (!userToken) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      console.log('Fetching eSIM data with token:', userToken ? 'Token exists' : 'No token');
      const response = await newApi.get('/myesims?limit=100&status=all');

      console.log('eSIM data response:', response.data);

      if (response.data && response.data.esims && isMounted.current) {
        // Transform the API response to match the expected ESim interface
        const transformedEsims = response.data.esims.map(transformEsimData);

        // Sort eSIMs to show active/in-use first, then new, then others
        const sortedEsims = transformedEsims.sort((a, b) => {
          const statusA = (a.status || '').toLowerCase();
          const statusB = (b.status || '').toLowerCase();

          // Priority order: active/in_use > new > expiring > expired/depleted
          const getPriority = (status: string) => {
            switch (status) {
              case 'active':
              case 'in_use':
              case 'in use':
                return 0;
              case 'new':
                return 1;
              case 'expiring':
                return 2;
              case 'expired':
              case 'depleted':
                return 3;
              default:
                return 4;
            }
          };

          const priorityA = getPriority(statusA);
          const priorityB = getPriority(statusB);

          // Sort by priority first
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // Within same priority, sort by creation date (newest first)
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });

        setEsimData(sortedEsims);
        if (sortedEsims.length > 0) {
          const initialVisibleEsims = sortedEsims.slice(0, 5);
          setVisibleEsims(initialVisibleEsims);

          // If preserveSelection is true and we have a selected eSIM, try to keep it selected
          if (preserveSelection && selectedEsimRef.current) {
            // Find the same eSIM in the new data by ID
            const updatedSelectedEsim = sortedEsims.find(esim => esim.id === selectedEsimRef.current!.id);
            if (updatedSelectedEsim) {
              setSelectedEsim(updatedSelectedEsim);
            } else {
              // If the previously selected eSIM is not found, select the first one
              setSelectedEsim(initialVisibleEsims[0]);
            }
          } else {
            // Default behavior: select the first eSIM
            setSelectedEsim(initialVisibleEsims[0]);
          }
        } else {
          setVisibleEsims([]);
          setSelectedEsim(null);
        }
        setError(null);
      } else if (response.data && response.data.error) {
        setError(response.data.error || 'Failed to fetch eSIM data');
      } else {
        setError('Failed to fetch eSIM data');
      }
    } catch (err: any) {
      console.error('Error fetching eSIM data:', err);
      if (isMounted.current) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else {
          setError(err.message || 'Failed to fetch eSIM data');
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userToken]);

  const loadMoreEsims = useCallback(() => {
    const currentLength = visibleEsims.length;
    const nextBatch = esimData.slice(currentLength, currentLength + 5);
    if (nextBatch.length > 0) {
      setVisibleEsims([...visibleEsims, ...nextBatch]);
    }
  }, [esimData, visibleEsims]);

  const selectEsim = useCallback((esim: ESim) => {
    setSelectedEsim(esim);
  }, []);

  const updateVisibleEsims = useCallback((newVisibleEsims: ESim[]) => {
    setVisibleEsims(newVisibleEsims);
  }, []);

  const refreshData = useCallback(() => {
    return fetchEsimData(true, true); // Pass true to preserve selection
  }, [fetchEsimData]);

  return {
    esimData,
    visibleEsims,
    selectedEsim,
    loading,
    error,
    fetchEsimData,
    loadMoreEsims,
    selectEsim,
    updateVisibleEsims,
    refreshData,
    hasMoreEsims: visibleEsims.length < esimData.length
  };
};