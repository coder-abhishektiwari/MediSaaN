import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
console.log('App: Initializing...');
import { QueryClient as QC, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import RootNavigator from './src/navigation/RootNavigator';
import './src/utils/i18n';
console.log('QueryClient:', QC);

const queryClient = new QC({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
    mutations: { retry: 0 },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider>
          <RootNavigator />
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
