import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch } from 'react-redux';
import ThemeToggle from '../components/Theme/ThemeToggle';
import { useTheme } from '../components/Theme/useTheme';
import { logout } from '../redux/slice/authSlice';
import Members from './bottomtab/Members';
import Memories from './bottomtab/Memories';
import Timeline from './bottomtab/Timeline';
import Tree from './bottomtab/Tree';

const Tab = createBottomTabNavigator();

export default function Home() {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const getIconName = (routeName, focused) => {
    const icons = {
      Tree: focused ? 'account-tree' : 'account-tree',
      Timeline: focused ? 'timeline' : 'timeline',
      Memories: focused ? 'photo-library' : 'photo-library',
      Members: focused ? 'people' : 'people',
    };
    return icons[routeName];
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getIconName(route.name, focused);
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        
        // --- FLOATING TAB BAR STYLING ---
        tabBarStyle: {
         
          bottom: Platform.OS === 'ios' ? 24 : 16,
          width: '85%',
          alignSelf: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: 35,
          height: 64,
          paddingBottom: Platform.OS === 'ios' ? 0 : 8,
          paddingTop: 8,
          borderTopWidth: 0,
          // Premium drop-shadow properties
          shadowColor: '#000000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: theme.isDark ? 0.3 : 0.12,
          shadowRadius: 5.46,
          elevation: 8,
        },
        
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.textPrimary,
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 16 }}>
            <ThemeToggle />
            <TouchableOpacity
              onPress={() => dispatch(logout())}
              style={{ marginLeft: 16 }}
            >
              <Icon name="logout" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Tree" component={Tree} />
      <Tab.Screen name="Timeline" component={Timeline} />
      <Tab.Screen name="Memories" component={Memories} />
      <Tab.Screen name="Members" component={Members} />
    </Tab.Navigator>
  );
}