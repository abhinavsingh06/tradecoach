import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useAutoSync } from '../hooks/useTrades';
import { CoachScreen } from '../screens/CoachScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { colors } from '../utils/theme';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcon =
  (name: IconName, focusedName?: IconName) =>
  ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons
      name={focused ? (focusedName ?? name) : name}
      size={size}
      color={color}
    />
  );

export const Tabs = () => {
  // Throttled internally — first render triggers a single Kite sync.
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

export default Tabs;
