import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 md:pb-0">
        <Toaster position="top-right" richColors theme="light" closeButton />
        <Navbar />
        <div className="flex-1">
          <AppRoutes />
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
    </BrowserRouter>
  );
}

