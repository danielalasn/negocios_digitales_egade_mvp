'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';
import { RecoveryCalculator } from '@/components/RecoveryCalculator';
import { HeroSection } from '@/components/landing/HeroSection';
import { RoleSelector } from '@/components/landing/RoleSelector';
import { AiFlowSteps } from '@/components/landing/AiFlowSteps';
import { ComparisonTable } from '@/components/landing/ComparisonTable';
import { WasteStatsSection } from '@/components/landing/WasteStatsSection';
import { ActiveSessionBanner } from '@/components/landing/ActiveSessionBanner';
import { LoginPrompt } from '@/components/landing/LoginPrompt';
import { B2cRegisterForm } from '@/components/landing/B2cRegisterForm';
import { B2bRegisterForm } from '@/components/landing/B2bRegisterForm';
import { LoginForm } from '@/components/landing/LoginForm';

type Step = 'role' | 'b2c' | 'b2b' | 'login';

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { currentUser, logout, signUp, signIn } = useStore();

  const [step, setStep] = useState<Step>('role');

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
  };

  const handleBackToHome = () => {
    go('role');
    if (typeof window !== 'undefined' && window.location.search) {
      router.replace('/');
    }
  };

  const handleB2CSubmit = async (data: { nombre: string; email: string; password: string }) => {
    await signUp({ ...data, rol: 'b2c' });
    router.push('/b2c');
  };

  const handleB2BSubmit = async (data: {
    nombre: string;
    email: string;
    password: string;
    restaurantName: string;
    categoria: string;
    descripcion: string;
    horario: string;
    direccion: string;
  }) => {
    const { restaurantName, categoria, descripcion, horario, direccion, ...account } = data;
    await signUp({
      ...account,
      rol: 'b2b',
      business: { restaurantName, categoria, descripcion, horario, direccion },
    });
    router.push('/b2b');
  };

  const handleLoginSubmit = async (email: string, password: string) => {
    const user = await signIn(email, password);
    router.push(user.rol === 'b2b' ? '/b2b' : '/b2c');
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

          {/* Login link */}
          <LoginPrompt onGoLogin={() => go('login')} />
        </div>
      )}

      {step === 'b2c' && (
        <B2cRegisterForm
          onBack={handleBackToHome}
          onSubmit={handleB2CSubmit}
        />
      )}

      {step === 'b2b' && (
        <B2bRegisterForm
          onBack={handleBackToHome}
          onSubmit={handleB2BSubmit}
        />
      )}

      {step === 'login' && (
        <LoginForm
          onBack={handleBackToHome}
          onSubmit={handleLoginSubmit}
        />
      )}
    </div>
  );
}
