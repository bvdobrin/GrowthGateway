import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filtersToParams, paramsToFilters } from '@/lib/search';
import { hydrateFilters, selectFilters } from '@/store/filtersSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/** Keeps library filters and the URL in step, so filtered views can be shared and bookmarked. */
export function useFiltersUrlSync() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  const [params, setParams] = useSearchParams();
  const current = params.toString();
  const synced = useRef<string | null>(null);
  const hydrating = useRef(false);

  useEffect(() => {
    if (current === synced.current) return;
    synced.current = current;
    hydrating.current = true;
    dispatch(hydrateFilters(paramsToFilters(new URLSearchParams(current))));
  }, [current, dispatch]);

  useEffect(() => {
    if (hydrating.current) {
      hydrating.current = false;
      return;
    }
    const next = filtersToParams(filters).toString();
    if (next === synced.current) return;
    synced.current = next;
    setParams(next, { replace: true });
  }, [filters, setParams]);
}
