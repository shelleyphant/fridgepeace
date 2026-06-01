import { useReducer, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../constants';

export const INITIAL_STATE = {
  items: [],
  loading: true,
  error: null,
  isDrawerOpen: false,
  editingItem: null,
  sortBy: 'recent',
  filterBy: 'all',
};

export function fridgeReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, items: action.payload, loading: false, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_SORT':
      return { ...state, sortBy: action.payload };
    case 'SET_FILTER':
      return { ...state, filterBy: action.payload };
    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false };
    case 'EDIT_ITEM':
      return { ...state, editingItem: action.payload };
    case 'CLEAR_EDIT':
      return { ...state, editingItem: null };
    default:
      return state;
  }
}

async function fetchInventory() {
  const householdId = localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID);
  if (!householdId) return [];
  const { data } = await axios.get(`${API_URL}/households/${householdId}/inventory`);
  return data.map((item) => ({ ...item, name: item.food_name ?? 'Unknown' }));
}

export function useFridgeState() {
  const [state, dispatch] = useReducer(fridgeReducer, INITIAL_STATE);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const items = await fetchInventory();
      if (!cancelledRef.current) {
        dispatch({ type: 'FETCH_SUCCESS', payload: items });
      }
    } catch (e) {
      if (!cancelledRef.current) {
        dispatch({ type: 'FETCH_ERROR', payload: e });
      }
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    refresh();
    return () => { cancelledRef.current = true; };
  }, [refresh]);

  return { state, dispatch, refresh };
}
