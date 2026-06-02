import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { LoginScreen } from '../screens/LoginScreen';
import { PlaybookScreen } from '../screens/PlaybookScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TaxScreen } from '../screens/TaxScreen';
import { TradeDetailScreen } from '../screens/TradeDetailScreen';
import { colors } from '../utils/theme';
import { Tabs } from './Tabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Top-level navigator. Shows a boot spinner while the auth provider rehydrates,
 * the login screen when signed out, and the stacked tab UI once authenticated.
 */
export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

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

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RootNavigator;
