import * as React from 'react';

/**
 * useDebouncedValue
 * Returns a debounced version of the provided value after the specified delay.
 *
 * Usage:
 * const [value, setValue] = React.useState('');
 * const debounced = useDebouncedValue(value, 300);
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}
