'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, User } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';
import { RecoveryCalculator } from '@/components/RecoveryCalculator';
import { HeroSection } from '@/components/landing/HeroSection';
import { RoleSelector } from '@/components/landing/RoleSelector';
import { AiFlowSteps } from '@/components/landing/AiFlowSteps';
import { ComparisonTable } from '@/components/landing/ComparisonTable';
import { WasteStatsSection } from '@/components/landing/WasteStatsSection';
import { ActiveSessionBanner } from '@/components/landing/ActiveSessionBanner';
import { QuickDemoBar } from '@/components/landing/QuickDemoBar';
import { B2cRegisterForm } from '@/components/landing/B2cRegisterForm';
import { B2bRegisterForm } from '@/components/landing/B2bRegisterForm';
import { LoginForm } from '@/components/landing/LoginForm';

type Step = 'role' | 'b2c' | 'b2b' | 'login';

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { currentUser, users, login, logout, registerUser, registerRestaurant } = useStore();

  const [step, setStep] = useState<Step>('role');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('login') === 'true') {
        setStep('login');
      }
    }
  }, []);

  const go = (s: Step) => {
    setStep(s);
    setLoginError('');
  };

  const handleBackToHome = () => {
    go('role');
    if (typeof window !== 'undefined' && window.location.search) {
      router.replace('/');
    }
  };

  const isEmailTaken = (email: string) =>
    users.some((u) => u.email.toLowerCase() === email.toLowerCase());

  const handleB2CSubmit = (data: { nombre: string; email: string }) => {
    registerUser({ nombre: data.nombre, email: data.email, rol: 'b2c' });
    router.push('/b2c');
  };

  const handleB2BSubmit = (data: {
    nombre: string;
    email: string;
    restaurantName: string;
    categoria: string;
    descripcion: string;
    horario: string;
    direccion: string;
  }) => {
    registerRestaurant(data);
    router.push('/b2b');
  };

  const handleLoginSubmit = (email: string) => {
    let u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) {
      if (email.toLowerCase() === 'marco@trattoria.com') {
        u = {
          id: 'user-b2b-1',
          nombre: 'Chef Marco',
          email: 'marco@trattoria.com',
          rol: 'b2b',
          restaurantes_favoritos: [],
          createdAt: '2024-01-01T00:00:00Z',
        };
      } else if (email.toLowerCase() === 'sofia@demo.com') {
        u = {
          id: 'demo-client',
          nombre: 'Sofía Martínez',
          email: 'sofia@demo.com',
          rol: 'b2c',
          restaurantes_favoritos: ['rest-1', 'rest-3'],
          createdAt: '2024-01-01T00:00:00Z',
        };
      }
    }

    if (!u) {
      setLoginError('No encontramos esa cuenta.');
      return;
    }

    login(u);
    router.push(u.rol === 'b2b' ? '/b2b' : '/b2c');
  };

  const quickDemoB2C = () => {
    const demo: User = {
      id: 'demo-client',
      nombre: 'Sofía Martínez',
      email: 'sofia@demo.com',
      rol: 'b2c',
      restaurantes_favoritos: ['rest-1', 'rest-3'],
      createdAt: '2024-01-01T00:00:00Z',
    };
    login(demo);
    router.push('/b2c');
  };

  const quickDemoB2B = () => {
    const demo: User = {
      id: 'user-b2b-1',
      nombre: 'Chef Marco',
      email: 'marco@trattoria.com',
      rol: 'b2b',
      restaurantes_favoritos: [],
      createdAt: '2024-01-01T00:00:00Z',
    };
    login(demo);
    router.push('/b2b');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {step === 'role' && (
        <div className="fade-in space-y-12">
          {/* Active Session Banner */}
          {hydrated && currentUser && (
            <ActiveSessionBanner currentUser={currentUser} onLogout={logout} />
          )}

          {/* Hero Section */}
          <HeroSection />

          {/* Role selector cards */}
          <RoleSelector onSelectRole={(role) => go(role)} />

          {/* Interactive Merchant Loss Recovery Calculator */}
          <div className="max-w-3xl mx-auto my-10">
            <RecoveryCalculator onRegister={() => go('b2b')} />
          </div>

          {/* AI-Native Flow in 5 Steps */}
          <AiFlowSteps />

          {/* Comparison Table: Buen Bocado vs Bolsas Sorpresa */}
          <ComparisonTable />

          {/* Food waste magnitude stats in Mexico & NL */}
          <WasteStatsSection />

          {/* Quick Demo Access Bar & Login link */}
          <QuickDemoBar
            onQuickDemoB2C={quickDemoB2C}
            onQuickDemoB2B={quickDemoB2B}
            onGoLogin={() => go('login')}
          />
        </div>
      )}

      {step === 'b2c' && (
        <B2cRegisterForm
          onBack={handleBackToHome}
          onSubmit={handleB2CSubmit}
          isEmailTaken={isEmailTaken}
        />
      )}

      {step === 'b2b' && (
        <B2bRegisterForm
          onBack={handleBackToHome}
          onSubmit={handleB2BSubmit}
          isEmailTaken={isEmailTaken}
        />
      )}

      {step === 'login' && (
        <LoginForm
          onBack={handleBackToHome}
          onSubmit={handleLoginSubmit}
          error={loginError}
        />
      )}
    </div>
  );
}
