import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  TextField,
  InputAdornment,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { fetchSuggestions, type Suggestion } from '../api/client';

interface Props {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Leading icon shown inside the field. */
  startIcon?: React.ReactNode;
}

const DEBOUNCE_MS = 250;

/**
 * Google-Maps-style address input with live autocomplete suggestions.
 *
 * Wraps MUI's free-solo Autocomplete so the user can either pick a suggestion
 * or type a full address. Queries are debounced and each new keystroke aborts
 * the previous in-flight request, so only the latest result set is applied.
 */
export default function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  error,
  startIcon,
}: Props) {
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced fetch driven by the current input text.
  const runFetch = useMemo(
    () => (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (query.trim().length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const results = await fetchSuggestions(query, controller.signal);
        // Ignore if a newer request superseded this one.
        if (!controller.signal.aborted) {
          setOptions(results);
          setLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Autocomplete
      freeSolo
      autoComplete
      includeInputInList
      filterOptions={(x) => x} // server already filtered; don't re-filter locally
      options={options}
      loading={loading}
      // Keep the visible input in sync with the parent's controlled value.
      inputValue={value}
      onInputChange={(_, newInput, reason) => {
        // 'reset' fires when an option is selected; keep parent authoritative.
        if (reason === 'input') {
          onChange(newInput);
          runFetch(newInput);
        }
      }}
      onChange={(_, selected) => {
        if (selected && typeof selected !== 'string') {
          onChange(selected.label);
          setOptions([]);
        } else if (typeof selected === 'string') {
          onChange(selected);
        }
      }}
      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
      isOptionEqualToValue={(opt, val) =>
        typeof opt !== 'string' &&
        typeof val !== 'string' &&
        opt.label === val.label
      }
      renderOption={(props, option) => {
        if (typeof option === 'string') return null;
        const { key, ...rest } = props as { key: string } & Record<string, unknown>;
        return (
          <Box component="li" key={key} {...rest} sx={{ gap: 1.25 }}>
            <PlaceOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <Typography variant="body2" noWrap>
              {option.label}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          placeholder={placeholder}
          error={!!error}
          helperText={error}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
          InputProps={{
            ...params.InputProps,
            startAdornment: startIcon ? (
              <InputAdornment position="start" sx={{ ml: 0.5 }}>
                {startIcon}
              </InputAdornment>
            ) : (
              params.InputProps.startAdornment
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
