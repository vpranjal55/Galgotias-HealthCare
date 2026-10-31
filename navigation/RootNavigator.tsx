import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { colors, layout, radius } from '../lib/theme';
import { useLayout } from '../lib/useLayout';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import StudentHome from '../screens/student/StudentHome';
import WellnessChat from '../screens/student/WellnessChat';
import AnalyticsScreen from '../screens/student/AnalyticsScreen';
import StudentProfile from '../screens/student/StudentProfile';
import WardenHome from '../screens/warden/WardenHome';
import MessTracker from '../screens/warden/MessTracker';
import CurfewTracker from '../screens/warden/CurfewTracker';
import WardenProfile from '../screens/warden/WardenProfile';
import CouncilHome from '../screens/council/CouncilHome';
import DirectoryScreen from '../screens/council/DirectoryScreen';
import CouncilAppointments from '../screens/council/CouncilAppointments';
import CouncilProfile from '../screens/council/CouncilProfile';

const AuthStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.cream,
    primary: colors.maroon,
    card: colors.white,
    text: colors.navy,
    border: colors.line,
  },
};

const logo = require('../assets/images/galgotias-logo.jpg');

const ICONS: Record<string, string> = {
  Home: 'home',
  Wellness: 'chatbubbles',
  Analytics: 'stats-chart',
  Profile: 'person',
  Desk: 'grid',
  Mess: 'fast-food',
  Curfew: 'moon',
  Pulse: 'pulse',
  Directory: 'people',
  Queue: 'medkit',
};

function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/** Bottom bar on phones, branded side rail on wide screens. Same routes either way. */
function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { wide } = useLayout();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const keyboardOpen = useKeyboardOpen();

  if (!wide && keyboardOpen) return null;

  const items = state.routes.map((route, index) => {
    const focused = state.index === index;
    const { options } = descriptors[route.key];
    const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name;
    const base = ICONS[route.name] || 'ellipse';
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={label}
        style={wide ? styles.railItem : styles.barItem}
      >
        <View style={[wide ? styles.railIcon : styles.barIcon, focused && styles.iconOn]}>
          <Ionicons
            name={(focused ? base : `${base}-outline`) as any}
            size={wide ? 24 : 22}
            color={focused ? colors.white : colors.muted}
          />
        </View>
        <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  });

  if (wide) {
    return (
      <View style={[styles.rail, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
        <Image source={logo} style={styles.railLogo} />
        <View style={{ flex: 1, justifyContent: 'center', gap: 10 }}>{items}</View>
        <Pressable onPress={logout} style={styles.railItem} accessibilityLabel="Log out">
          <View style={styles.railIcon}>
            <Ionicons name="log-out-outline" size={24} color={colors.muted} />
          </View>
          <Text style={styles.label}>Log out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>{items}</View>
  );
}

function tabOptions(wide: boolean) {
  return {
    headerShown: false,
    tabBarPosition: (wide ? 'left' : 'bottom') as 'left' | 'bottom',
  };
}

function StudentTabs() {
  const { wide } = useLayout();
  return (
    <Tabs.Navigator screenOptions={tabOptions(wide)} tabBar={(p) => <AppTabBar {...p} />}>
      <Tabs.Screen name="Home" component={StudentHome} />
      <Tabs.Screen name="Wellness" component={WellnessChat} />
      <Tabs.Screen name="Analytics" component={AnalyticsScreen} />
      <Tabs.Screen name="Profile" component={StudentProfile} />
    </Tabs.Navigator>
  );
}

function WardenTabs() {
  const { wide } = useLayout();
  return (
    <Tabs.Navigator screenOptions={tabOptions(wide)} tabBar={(p) => <AppTabBar {...p} />}>
      <Tabs.Screen name="Desk" component={WardenHome} />
      <Tabs.Screen name="Mess" component={MessTracker} />
      <Tabs.Screen name="Curfew" component={CurfewTracker} />
      <Tabs.Screen name="Profile" component={WardenProfile} />
    </Tabs.Navigator>
  );
}

function CouncilTabs() {
  const { wide } = useLayout();
  return (
    <Tabs.Navigator screenOptions={tabOptions(wide)} tabBar={(p) => <AppTabBar {...p} />}>
      <Tabs.Screen name="Pulse" component={CouncilHome} />
      <Tabs.Screen name="Directory" component={DirectoryScreen} />
      <Tabs.Screen name="Queue" component={CouncilAppointments} />
      <Tabs.Screen name="Profile" component={CouncilProfile} />
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  barItem: { flex: 1, alignItems: 'center', gap: 3 },
  barIcon: { width: 52, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.maroon },
  label: { fontSize: 11, fontWeight: '700', color: colors.muted },
  labelOn: { color: colors.maroon },
  rail: {
    width: layout.railWidth,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  railLogo: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.goldSoft, marginBottom: 12 },
  railItem: { alignItems: 'center', gap: 5, paddingVertical: 4, width: '100%' },
  railIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.maroon} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!user ? <AuthFlow /> : user.role === 'warden' ? <WardenTabs /> : user.role === 'council' ? <CouncilTabs /> : <StudentTabs />}
    </NavigationContainer>
  );
}
