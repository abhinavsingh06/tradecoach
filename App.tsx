import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthProvider';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navTheme } from './src/navigation/theme';

// React Query defaults tuned for a mobile app on metered connections:
//   • 30s `staleTime` avoids refetch storms when components re-mount
//   • single retry keeps transient blips invisible without amplifying outages
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationContainer theme={navTheme}>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
