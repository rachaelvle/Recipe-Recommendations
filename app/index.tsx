// This is the entry point of the application. It redirects to the UserProfileCreation screen where users can create their profiles.
import React from 'react';
import { Redirect } from 'expo-router';

export default function TrafficCop() {
  return <Redirect href="/UserProfileCreation/CreateUserProfile" />;
}