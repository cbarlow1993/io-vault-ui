import { useRouter, useRouterState } from '@tanstack/react-router';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useState,
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

  // Derive current module from URL
  const currentModuleFromPath = getModuleFromPath(pathname);
  const [currentModule, setCurrentModule] = useState<ModuleId>(() => {
    return (
      currentModuleFromPath ??
      getStoredModule() ??
      availableModules[0] ??
      'treasury'
    );
  });

  // Sync with URL changes
  useEffect(() => {
    if (currentModuleFromPath && currentModuleFromPath !== currentModule) {
      setCurrentModule(currentModuleFromPath);
      setStoredModule(currentModuleFromPath);
    }
  }, [currentModuleFromPath, currentModule]);

  const switchModule = useCallback(
    (moduleId: ModuleId) => {
      if (!availableModules.includes(moduleId)) return;

      setCurrentModule(moduleId);
      setStoredModule(moduleId);

      const config = moduleConfig[moduleId];
      router.navigate({ to: config.defaultPath });
    },
    [availableModules, router]
  );

  const value: ModuleContextValue = {
    currentModule,
    moduleConfig: moduleConfig[currentModule],
    availableModules,
    switchModule,
  };

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
