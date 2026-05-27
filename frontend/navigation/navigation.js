import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSelector } from 'react-redux';
import CreateAccount from '../screens/Createaccount';
import Home from '../screens/Home';
import LoginScreen from '../screens/Loginscreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccount} />
        </>
      ) : (
        <Stack.Screen name="Home" component={Home} />
      )}
    </Stack.Navigator>
  );
}