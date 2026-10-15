'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

export function AiChatbot() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  // Do not render on landing page
  if (!hydrated || pathname === '/') return null;

  const isB2B = currentUser?.rol === 'b2b';

  const defaultGreeting = isB2B
    ? `¡Hola${currentUser?.nombre ? ` ${currentUser.nombre.split(' ')[0]}` : ''}! Dime qué alimentos te quedaron hoy, su precio original y de remate, y yo redacto y publico tu paquete automáticamente.`
    : `¡Hola${currentUser?.nombre ? ` ${currentUser.nombre.split(' ')[0]}` : ''}! ¿De qué tienes ganas hoy? Cuéntame tus antojos, cuánto presupuesto tienes o a qué hora pasarías y te encuentro la mejor opción.`;

  const suggestions = isB2B
    ? [
        'Me sobraron 4 porciones de pasta, precio original $280, remate en $95 hoy a las 22:00',
        'Tengo 3 baguettes y 2 croissants artesanales para publicar',
      ]
    : [
        'Quiero cenar por menos de $90 MXN',
        'Algo de pizza o sushi para recoger después de las 9:00 PM',
        'Opciones vegetarianas para hoy',
      ];

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: Message = { id: `u-${Date.now()}`, sender: 'user', text };
    const aiReply: Message = {
      id: `ai-${Date.now() + 1}`,
      sender: 'ai',
      text: isB2B
        ? `Entendido: procesando "${text}". En la siguiente fase del asistente, esta orden generará tu paquete directamente en la tienda.`
        : `¡Buena elección! Buscando las mejores opciones con "${text}". En la siguiente fase te mostraré los paquetes recomendados con reserva directa en 1 clic.`,
    };

    setMessages((prev) => [...prev, userMsg, aiReply]);
    setInput('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fade-in mb-3 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-surface border border-line rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="px-4 py-3.5 bg-subtle border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-fg leading-none">Buen Bocado AI</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-muted mt-0.5 font-medium">
                  {isB2B ? 'Asistente de publicación B2B' : 'Recomendador personalizado'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg border border-line text-muted hover:text-fg hover:bg-surface flex items-center justify-center transition-colors cursor-pointer text-xs"
              title="Cerrar chat"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {/* System Greeting */}
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                AI
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-xs bg-subtle border border-line text-fg leading-relaxed">
                {defaultGreeting}
              </div>
            </div>

            {/* Quick Suggestions Chips (only if no conversation yet) */}
            {messages.length === 0 && (
              <div className="pt-1 pl-8 space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted tracking-wider">
                  Sugerencias rápidas:
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="text-left text-[11px] p-2 rounded-xl bg-surface border border-line hover:border-accent hover:text-accent transition-colors cursor-pointer"
                    >
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    AI
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-accent text-accent-fg rounded-tr-xs font-medium'
                      : 'bg-subtle border border-line text-fg rounded-tl-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-subtle border-t border-line">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isB2B ? 'Describe qué te sobró y precio...' : '¿De qué tienes ganas hoy?...'}
                className="input !py-2 !px-3 text-xs rounded-xl flex-1"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn btn-primary !p-2 rounded-xl shrink-0 disabled:opacity-40"
                title="Enviar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        id="ai-chatbot-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Asistente de IA"
        className="group relative h-13 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all duration-200 cursor-pointer hover:scale-103 active:scale-97 border border-white/20"
      >
        <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </span>
        <div className="text-left hidden sm:block">
          <span className="block text-xs font-black tracking-tight leading-tight">Asistente IA</span>
          <span className="block text-[10px] opacity-85 leading-tight">
            {isB2B ? 'Crear paquetes' : '¿Qué se te antoja?'}
          </span>
        </div>
      </button>
    </div>
  );
}
