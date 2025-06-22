import React, { Suspense, lazy, ComponentType } from 'react';
import { isFeatureEnabled } from '@/lib/config/features';
import type { FeatureFlags } from '@/lib/config/features';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface LazyFeatureProps {
  feature: keyof FeatureFlags;
  fallback?: React.ReactNode;
  disabledMessage?: string;
  children: React.ReactNode;
  enableButton?: boolean;
  onEnable?: () => void;
}

interface LazyComponentProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  feature: keyof FeatureFlags;
  fallback?: React.ReactNode;
  disabledMessage?: string;
  enableButton?: boolean;
  onEnable?: () => void;
  [key: string]: any;
}

// Default loading component
const DefaultLoading = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Loading...</span>
  </div>
);

// Default disabled component
const DefaultDisabled = ({ 
  message, 
  enableButton, 
  onEnable 
}: { 
  message: string; 
  enableButton?: boolean; 
  onEnable?: () => void; 
}) => (
  <Card className="p-6 text-center">
    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
    <h3 className="text-lg font-semibold mb-2">Feature Disabled</h3>
    <p className="text-muted-foreground mb-4">{message}</p>
    {enableButton && onEnable && (
      <Button onClick={onEnable} variant="outline">
        Enable Feature
      </Button>
    )}
  </Card>
);

// Wrapper component for feature-gated content
export function LazyFeature({
  feature,
  fallback = <DefaultLoading />,
  disabledMessage = "This feature is currently disabled to optimize performance.",
  children,
  enableButton = false,
  onEnable
}: LazyFeatureProps) {
  if (!isFeatureEnabled(feature)) {
    return (
      <DefaultDisabled 
        message={disabledMessage}
        enableButton={enableButton}
        onEnable={onEnable}
      />
    );
  }

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

// Higher-order component for lazy loading components with feature gates
export function withLazyFeature<P extends object>(
  component: () => Promise<{ default: ComponentType<P> }>,
  feature: keyof FeatureFlags,
  options: {
    fallback?: React.ReactNode;
    disabledMessage?: string;
    enableButton?: boolean;
    onEnable?: () => void;
  } = {}
) {
  const LazyComponent = lazy(component);

  return function LazyFeatureComponent(props: P) {
    return (
      <LazyFeature
        feature={feature}
        fallback={options.fallback}
        disabledMessage={options.disabledMessage}
        enableButton={options.enableButton}
        onEnable={options.onEnable}
      >
        <LazyComponent {...props} />
      </LazyFeature>
    );
  };
}

// Component for lazy loading with feature gates
export function LazyComponent({
  component,
  feature,
  fallback = <DefaultLoading />,
  disabledMessage = "This feature is currently disabled to optimize performance.",
  enableButton = false,
  onEnable,
  ...props
}: LazyComponentProps) {
  if (!isFeatureEnabled(feature)) {
    return (
      <DefaultDisabled 
        message={disabledMessage}
        enableButton={enableButton}
        onEnable={onEnable}
      />
    );
  }

  const LazyLoadedComponent = lazy(component);

  return (
    <Suspense fallback={fallback}>
      <LazyLoadedComponent {...props} />
    </Suspense>
  );
}

// Utility function to create lazy-loaded feature components
export function createLazyFeature<P extends object>(
  feature: keyof FeatureFlags,
  componentLoader: () => Promise<{ default: ComponentType<P> }>,
  options: {
    fallback?: React.ReactNode;
    disabledMessage?: string;
    enableButton?: boolean;
  } = {}
) {
  return function LazyFeatureWrapper(props: P & { onEnable?: () => void }) {
    const { onEnable, ...componentProps } = props;
    
    return (
      <LazyComponent
        component={componentLoader}
        feature={feature}
        fallback={options.fallback}
        disabledMessage={options.disabledMessage}
        enableButton={options.enableButton}
        onEnable={onEnable}
        {...componentProps}
      />
    );
  };
}

// Memory-aware lazy loading
export function MemoryAwareLazyFeature({
  feature,
  memoryThreshold = 100, // MB
  children,
  ...props
}: LazyFeatureProps & { memoryThreshold?: number }) {
  const checkMemory = () => {
    if (typeof performance !== 'undefined' && performance.memory) {
      const usedMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
      return usedMemory < memoryThreshold;
    }
    return true; // Allow if memory API not available
  };

  if (!checkMemory()) {
    return (
      <DefaultDisabled 
        message="This feature is disabled due to high memory usage. Please refresh the page or close other tabs."
        enableButton={false}
      />
    );
  }

  return (
    <LazyFeature feature={feature} {...props}>
      {children}
    </LazyFeature>
  );
}
