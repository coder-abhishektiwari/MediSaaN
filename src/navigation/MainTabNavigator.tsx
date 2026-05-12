import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { colors, sizes, typography, borderRadius } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import MedicineListScreen from '../screens/MedicineListScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICON: Record<string, string> = {
  Home: '🏠',
  Medicines: '💊',
  Profile: '👤',
};

const TAB_LABEL: Record<string, string> = {
  Home: 'Home',
  Medicines: 'Medicines',
  Profile: 'Profile',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={styles.tabEmoji}>{TAB_ICON[name]}</Text>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}         options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Medicines" component={MedicineListScreen} options={{ tabBarLabel: 'Medicines' }} />
      <Tab.Screen name="Profile"   component={SettingsScreen}     options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: sizes.tabBarHeight + 8,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabLabel: {
    ...typography.tiny,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIcon: {
    width: 40,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: colors.primaryLight,
  },
  tabEmoji: {
    fontSize: 20,
  },
});
