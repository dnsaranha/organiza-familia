import React from 'react';
import Layout from './layout/Layout';

const AppShell = ({ children }: { children: React.ReactNode }) => {
  return <Layout>{children}</Layout>;
};

export default AppShell;