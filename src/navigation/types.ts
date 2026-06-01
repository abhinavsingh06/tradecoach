import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
  Dashboard: undefined;
  Journal: undefined;
  Coach: undefined;
  Insights: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  TradeDetail: { id: string };
  Playbook: undefined;
  Tax: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
