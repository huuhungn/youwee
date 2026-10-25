import { createContext, type ReactNode, useContext, useEffect, useRef } from 'react';
import {
  type UpdateErrorKind,
  type UpdateInfo,
  type UpdateProgress,
  type UpdateStatus,
  type UpdateStep,
  useAppUpdater,
} from '@/hooks/useAppUpdater';
import { useRunningJobs } from '@/hooks/useRunningJobs';

interface UpdaterContextType {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  errorKind: UpdateErrorKind;
  failedStep: UpdateStep;
  dialogVisible: boolean;
  installAfterRestart: boolean;
  runningJobs: number;
  restartQueued: boolean;
  checkForUpdate: () => Promise<boolean>;
  downloadAndInstall: () => Promise<void>;
  cancelDownload: () => void;
  restartDownload: () => Promise<void>;
  retryUpdate: () => Promise<unknown>;
  restartApp: () => Promise<void>;
  dismissUpdate: () => void;
  showUpdateDialog: () => void;
  queueRestart: () => void;
}

const UpdaterContext = createContext<UpdaterContextType | null>(null);

interface UpdaterProviderProps {
  children: ReactNode;
  autoCheck: boolean;
}

export function UpdaterProvider({ children, autoCheck }: UpdaterProviderProps) {
  const updater = useAppUpdater(useRunningJobs());
  const autoChecked = useRef(false);

  // Auto check once per launch, so closing the update dialog does not bring it straight back.
  useEffect(() => {
    if (!autoCheck || autoChecked.current || updater.status !== 'idle') return;

    const timer = setTimeout(() => {
      autoChecked.current = true;
      updater.checkForUpdate();
    }, 2000); // Wait 2s after app start

    return () => clearTimeout(timer);
  }, [autoCheck, updater.checkForUpdate, updater.status]);

  return <UpdaterContext.Provider value={updater}>{children}</UpdaterContext.Provider>;
}

export function useUpdater() {
  const context = useContext(UpdaterContext);
  if (!context) {
    throw new Error('useUpdater must be used within UpdaterProvider');
  }
  return context;
}
