import React from 'react';
import { StatusBar, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import LandingScreen from './screens/LandingScreen';
import DashboardScreen from './screens/DashboardScreen';
import PlaygroundScreen from './screens/PlaygroundScreen';
import VoicePlaygroundScreen from './screens/VoicePlaygroundScreen';
import SessionViewScreen from './screens/SessionViewScreen';
import LiveTakeoverScreen from './screens/LiveTakeoverScreen';
import LiveCallScreen from './screens/LiveCallScreen';
import LiveCallWebRTCScreen from './screens/LiveCallWebRTCScreen';
import CallStarterScreen from './screens/CallStarterScreen';
import VoiceCloneSetupScreen from './screens/VoiceCloneSetupScreen';

// Components
import OfflineIndicator from './components/OfflineIndicator';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom tab bar icons (using emoji since we avoid native icon libs for simplicity)
const TAB_CONFIG = {
  Dashboard: { icon: '📊', label: 'Dashboard' },
  Playground: { icon: '🎮', label: 'Playground' },
  Voice: { icon: '🎙', label: 'Voice' },
  Live: { icon: '📡', label: 'Live' },
  More: { icon: '⚙️', label: 'More' },
};

// More screen (hub for additional features)
const MoreScreen = ({ navigation }) => (
  <View style={moreStyles.container}>
    <StatusBar barStyle="light-content" />
    <Text style={moreStyles.title}>More</Text>

    {[
      { label: '📞 Start Live Call', screen: 'CallStarter', desc: 'Start a live call with AI assistant' },
      { label: '🎭 Voice Clone Lab', screen: 'VoiceCloneSetup', desc: 'Clone & manage voices' },
      { label: '🔴 Live Takeover', screen: 'LiveTakeover', desc: 'Take over an active call' },
      { label: '📱 Live Call (Text)', screen: 'LiveCall', desc: 'Text-based live session' },
    ].map(item => (
      <TouchableOpacity
        key={item.screen}
        style={moreStyles.menuItem}
        onPress={() => navigation.navigate(item.screen)}
      >
        <View>
          <Text style={moreStyles.menuLabel}>{item.label}</Text>
          <Text style={moreStyles.menuDesc}>{item.desc}</Text>
        </View>
        <Text style={moreStyles.menuArrow}>→</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const moreStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020202', paddingHorizontal: 16, paddingTop: 60 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 24 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  menuLabel: { color: '#e5e7eb', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  menuDesc: { color: '#6b7280', fontSize: 11 },
  menuArrow: { color: '#10b981', fontSize: 18 },
});

// Bottom Tab Navigator
const BottomTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0a0a0a',
        borderTopColor: 'rgba(255,255,255,0.05)',
        borderTopWidth: 1,
        height: 80,
        paddingBottom: 20,
        paddingTop: 8,
      },
      tabBarActiveTintColor: '#10b981',
      tabBarInactiveTintColor: '#6b7280',
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
      tabBarIcon: ({ focused }) => {
        const cfg = TAB_CONFIG[route.name];
        return (
          <View style={{
            alignItems: 'center',
            opacity: focused ? 1 : 0.6,
          }}>
            <Text style={{ fontSize: 20 }}>{cfg?.icon || '📋'}</Text>
          </View>
        );
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Playground" component={PlaygroundScreen} />
    <Tab.Screen name="Voice" component={VoicePlaygroundScreen} />
    <Tab.Screen name="Live" component={CallStarterScreen} />
    <Tab.Screen name="More" component={MoreScreen} />
  </Tab.Navigator>
);

// Root Stack Navigator
const App = () => {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#10b981',
          background: '#020202',
          card: '#0a0a0a',
          text: '#e5e7eb',
          border: 'rgba(255,255,255,0.05)',
          notification: '#ef4444',
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '800',
          },
        },
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#020202" />
      <OfflineIndicator />

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#020202' },
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Main" component={BottomTabs} />

        {/* Full-screen push screens */}
        <Stack.Screen name="SessionView" component={SessionViewScreen} />
        <Stack.Screen name="LiveTakeover" component={LiveTakeoverScreen} />
        <Stack.Screen name="LiveCall" component={LiveCallScreen} />
        <Stack.Screen name="LiveCallWebRTC" component={LiveCallWebRTCScreen} />
        <Stack.Screen name="CallStarter" component={CallStarterScreen} />
        <Stack.Screen name="VoiceCloneSetup" component={VoiceCloneSetupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
