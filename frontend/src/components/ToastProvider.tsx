import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { Snackbar, Alert, Slide, type SlideProps } from '@mui/material';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  open: boolean;
  message: string;
  severity: Severity;
}

interface ToastContextValue {
  notify: (message: string, severity?: Severity) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

function SlideUp(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

/** App-wide toast notifications with a smooth slide-in animation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const notify = useCallback(
    (message: string, severity: Severity = 'info') => {
      setToast({ open: true, message, severity });
    },
    [],
  );

  const handleClose = useCallback(() => {
    setToast((t) => ({ ...t, open: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={SlideUp}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{
            borderRadius: 2,
            fontWeight: 500,
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            alignItems: 'center',
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
