import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { useAutoSync } from './src/hooks/useTrades';
import { CoachScreen } from './src/screens/CoachScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PlaybookScreen } from './src/screens/PlaybookScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TaxScreen } from './src/screens/TaxScreen';
import { TradeDetailScreen } from './src/screens/TradeDetailScreen';
import type { RootStackParamList, RootTabParamList } from './src/navigation/types';
import { colors } from './src/utils/theme';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const tabIcon =
  (name: keyof typeof Ionicons.glyphMap, focusedName?: keyof typeof Ionicons.glyphMap) =>
  ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons
      name={focused ? (focusedName ?? name) : name}
      size={size}
      color={color}
    />
  );

const Tabs = () => {
  // useAutoSync fires once on first render (throttled internally).
  useAutoSync();
  const { aiPro } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor:
            Platform.OS === 'android' ? 'rgba(10,14,30,0.92)' : 'transparent',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 86,
          paddingTop: 10,
          paddingBottom: 24,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 40}
            tint="dark"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(10,14,30,0.45)' },
            ]}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: tabIcon('home-outline', 'home'),
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{ tabBarIcon: tabIcon('journal-outline', 'journal') }}
      />
      {aiPro ? (
        <Tab.Screen
          name="Coach"
          component={CoachScreen}
          options={{ tabBarIcon: tabIcon('sparkles-outline', 'sparkles') }}
        />
      ) : null}
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarLabel: 'Weekly',
          tabBarIcon: tabIcon('analytics-outline', 'analytics'),
        }}
      />
    </Tab.Navigator>
  );
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={Tabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TradeDetail"
        component={TradeDetailScreen}
        options={{ title: 'Journal trade', headerLargeTitle: false }}
      />
      <Stack.Screen
        name="Playbook"
        component={PlaybookScreen}
        options={{ title: 'Playbook' }}
      />
      <Stack.Screen
        name="Tax"
        component={TaxScreen}
        options={{ title: 'Tax summary' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
