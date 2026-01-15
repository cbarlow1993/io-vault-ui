import { useRouter, useRouterState } from '@tanstack/react-router';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { getModuleFromPath, moduleConfig, moduleIds } from './config';
import type { ModuleConfig, ModuleId } from './types';

type ModuleContextValue = {
  currentModule: ModuleId;
  moduleConfig: ModuleConfig;
  availableModules: ModuleId[];
  switchModule: (moduleId: ModuleId) => void;
};

const ModuleContext = createContext<ModuleContextValue | null>(null);

const STORAGE_KEY = 'lastModule';

function getStoredModule(): ModuleId | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && moduleIds.includes(stored as ModuleId)) {
    return stored as ModuleId;
  }
  return null;
}

function setStoredModule(moduleId: ModuleId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, moduleId);
}

type ModuleProviderProps = {
  children: ReactNode;
  availableModules?: ModuleId[];
};

export function ModuleProvider({
  children,
  availableModules = moduleIds,
}: ModuleProviderProps) {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  // Derive current module from URL path
  const currentModuleFromPath = getModuleFromPath(pathname);

  // Derive current module - URL takes priority, then localStorage, then first available
  const currentModule =
    currentModuleFromPath ??
    getStoredModule() ??
    availableModules[0] ??
    'treasury';

  // Only persist to localStorage when URL changes, don't update state
  useEffect(() => {
    if (currentModuleFromPath) {
      setStoredModule(currentModuleFromPath);
    }
  }, [currentModuleFromPath]);

  const switchModule = useCallback(
    (moduleId: ModuleId) => {
      if (!availableModules.includes(moduleId)) return;

      setStoredModule(moduleId);

      const config = moduleConfig[moduleId];
      router.navigate({ to: config.defaultPath });
    },
    [availableModules, router]
  );

  const value: ModuleContextValue = useMemo(
    () => ({
      currentModule,
      moduleConfig: moduleConfig[currentModule],
      availableModules,
      switchModule,
    }),
    [currentModule, availableModules, switchModule]
  );

  return <ModuleContext value={value}>{children}</ModuleContext>;
}

export function useModule(): ModuleContextValue {
  const context = use(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
}

export function useModuleConfig(moduleId?: ModuleId): ModuleConfig {
  const { currentModule } = useModule();
  return moduleConfig[moduleId ?? currentModule];
}
