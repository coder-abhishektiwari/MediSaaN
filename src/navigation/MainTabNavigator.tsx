import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, sizes, typography, borderRadius, spacing } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import MedicineListScreen from '../screens/MedicineListScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICON: Record<string, string> = {
  Home: 'view-dashboard-outline',
  Medicines: 'pill',
  Chat: 'robot-happy-outline',
  Profile: 'account-heart-outline',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Icon
        name={TAB_ICON[name]}
        size={focused ? 24 : 22}
        color={focused ? colors.primaryDark : colors.textMuted}
      />
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}         options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Medicines" component={MedicineListScreen} options={{ tabBarLabel: 'Medicines' }} />
      <Tab.Screen name="Chat"      component={ChatScreen}         options={{ tabBarLabel: 'AI Chat' ,tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Profile"   component={SettingsScreen}     options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    height: sizes.tabBarHeight + 4,
    paddingBottom: 9,
    paddingTop: 8,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xxl,
    elevation: 18,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  tabLabel: {
    ...typography.tiny,
    fontWeight: '800',
    marginTop: 2,
  },
  tabIcon: {
    width: 46,
    height: 34,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '24',
  },
});
