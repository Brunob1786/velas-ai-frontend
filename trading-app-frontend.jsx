import React, { useState, useEffect } from 'react';
import { Upload, BarChart3, LogOut, Menu, X, Download, AlertCircle, CheckCircle, Loader, TrendingUp } from 'lucide-react';

const API_URL = 'https://velas-ai-backend-production.up.railway.app';

const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY || '';

const PLANS = {
  free: { name: 'FREE', price: 0, uses: 1, history: 15 },
  starter: { name: 'STARTER', price: 9, uses: 17, history: 15 },
  pro: { name: 'PRO', price: 29, uses: 70, history: 15 },
  promax: { name: 'PRO MAX', price: 69, uses: 200, history: 200, daysHistory: 30 }
};

export default function TradingAnalysisApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [userPlan, setUserPlan] = useState('free');
  const [analyses, setAnalyses] = useState([]);
  const [usedToday, setUsedToday] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);

  // Crear cuenta de prueba automáticamente al cargar
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    if (!storedUsers['test@velas.ai']) {
      storedUsers['test@velas.ai'] = {
        email: 'test@velas.ai',
        password: 'test123',
        plan: 'free',
        createdAt: new Date().toISOString(),
        ip: 'test-ip-demo',
        analyses: [],
        usedToday: 0,
        subscriptionDate: null
      };
      localStorage.setItem('users', JSON.stringify(storedUsers));
      localStorage.setItem('userIP', 'test-ip-demo');
    }
  }, []);

  // Detector de escamers
  const detectScammer = (email, ip) => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    const freeAccounts = Object.values(storedUsers).filter(u => u.plan === 'free' && u.ip === ip);
    if (freeAccounts.length >= 3) return true;
    
    const existingEmails = Object.values(storedUsers).filter(u => u.email === email && u.plan === 'free');
    if (existingEmails.length >= 1) return true;
    
    return false;
  };

  // Obtener IP del usuario (simulado)
  const getUserIP = () => {
    return localStorage.getItem('userIP') || Math.random().toString(36).substr(2, 9);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Completa todos los campos');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    const userExists = storedUsers[formData.email];

    if (!userExists || userExists.password !== formData.password) {
      setError('Email o contraseña incorrectos');
      return;
    }

    setUser({
      email: formData.email,
      plan: userExists.plan,
      createdAt: userExists.createdAt,
      ip: userExists.ip
    });
    setUserPlan(userExists.plan);
    setAnalyses(userExists.analyses || []);
    setUsedToday(userExists.usedToday || 0);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    setFormData({ email: '', password: '', confirmPassword: '' });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Completa todos los campos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (storedUsers[formData.email]) {
      setError('El email ya está registrado');
      return;
    }

    const ip = getUserIP();
    
    if (detectScammer(formData.email, ip)) {
      setError('❌ Cuenta bloqueada por múltiples intentos de acceso gratuito');
      return;
    }

    storedUsers[formData.email] = {
      email: formData.email,
      password: formData.password,
      plan: 'free',
      createdAt: new Date().toISOString(),
      ip: ip,
      analyses: [],
      usedToday: 0,
      subscriptionDate: null
    };

    localStorage.setItem('users', JSON.stringify(storedUsers));
    localStorage.setItem('userIP', ip);

    setSuccess('✅ Cuenta creada. Por favor inicia sesión.');
    setFormData({ email: '', password: '', confirmPassword: '' });
    setTimeout(() => setCurrentView('login'), 2000);
  };

  const handleUploadAndAnalyze = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const planLimits = PLANS[userPlan];
    if (usedToday >= planLimits.uses) {
      setError(`❌ Límite de ${planLimits.uses} usos alcanzado este mes`);
      return;
    }

    setAnalyzing(true);
    setError('');
    setLastAnalysis(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result.split(',')[1];

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-opus-4-1',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/jpeg',
                      data: base64Image
                    }
                  },
                  {
                    type: 'text',
                    text: `Eres un analista técnico experto en velas de trading. Analiza esta captura de pantalla y proporciona:

1. PATRÓN DE VELA: Identifica el tipo (Doji, Martillo, Envolvente, etc.)
2. TENDENCIA: Alcista, Bajista o Lateral
3. SOPORTES Y RESISTENCIAS: Niveles clave
4. SEÑAL: COMPRA o VENDA (con confianza 0-100%)
5. ENTRADA: Precio recomendado
6. STOP LOSS: Nivel de protección
7. TAKE PROFIT: Objetivos de ganancia

IMPORTANTE: Esto es análisis técnico educativo, NO garantía de ganancias. El usuario asume todo riesgo.

Formatea la respuesta de manera clara y concisa.`
                  }
                ]
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error('Error al conectar con Claude API');
        }

        const data = await response.json();
        const analysisText = data.content[0]?.text || 'No se pudo generar análisis';

        const newAnalysis = {
          id: Date.now(),
          timestamp: new Date().toLocaleString('es-AR'),
          analysis: analysisText,
          createdAt: new Date().toISOString(),
          daysOld: 0
        };

        const updatedAnalyses = [newAnalysis, ...analyses];
        const planHistory = userPlan === 'promax' ? 200 : PLANS[userPlan].history;
        
        if (updatedAnalyses.length > planHistory) {
          updatedAnalyses.pop();
        }

        setAnalyses(updatedAnalyses);
        setUsedToday(usedToday + 1);
        setLastAnalysis(analysisText);
        setSuccess('✅ Análisis completado exitosamente');

        // Guardar en localStorage
        const updatedUsers = JSON.parse(localStorage.getItem('users') || '{}');
        updatedUsers[user.email] = {
          ...updatedUsers[user.email],
          analyses: updatedAnalyses,
          usedToday: usedToday + 1
        };
        localStorage.setItem('users', JSON.stringify(updatedUsers));

        setTimeout(() => setSuccess(''), 3000);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError('❌ ' + (err.message || 'Error al analizar la imagen'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpgradePlan = (plan) => {
    const newUsers = JSON.parse(localStorage.getItem('users') || '{}');
    newUsers[user.email].plan = plan;
    newUsers[user.email].subscriptionDate = new Date().toISOString();
    localStorage.setItem('users', JSON.stringify(newUsers));

    setUser({ ...user, plan });
    setUserPlan(plan);
    setSelectedPlan(null);
    setSuccess(`✅ Plan actualizado a ${PLANS[plan].name}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const downloadReceipt = () => {
    const planInfo = PLANS[userPlan];
    const receiptText = `
╔════════════════════════════════════════════════════════════╗
║            COMPROBANTE DE SUSCRIPCIÓN - VELAS AI           ║
╚════════════════════════════════════════════════════════════╝

FECHA: ${new Date().toLocaleDateString('es-AR')}
EMAIL: ${user.email}
PLAN: ${planInfo.name}
PRECIO: $${planInfo.price} USD
USOS MENSUALES: ${planInfo.uses}
HISTORIAL: ${planInfo.daysHistory ? planInfo.daysHistory + ' días' : planInfo.history + ' usos'}

─────────────────────────────────────────────────────────────

⚠️ ACLARACIÓN IMPORTANTE:

Este documento es un comprobante provisional de suscripción.
NO es una factura fiscal oficial.

Este servicio proporciona ANÁLISIS TÉCNICO EDUCATIVO basado 
en patrones de velas. NO es asesoramiento financiero. NO 
garantiza ganancias. Puedes PERDER TODO tu dinero.

─────────────────────────────────────────────────────────────

MÉTODO DE PAGO: MercadoPago
ESTADO: Pendiente de confirmación

Una vez regularizada la condición fiscal, se enviará factura 
legal a este email.

─────────────────────────────────────────────────────────────
Generado por: Velas AI Trading Analysis
https://velasai.com
╚════════════════════════════════════════════════════════════╝
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante-${user.email}-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView('login');
    setFormData({ email: '', password: '', confirmPassword: '' });
    setAnalyses([]);
    setUsedToday(0);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Fondo de gráfico difumado */}
        <div className="absolute inset-0 opacity-10 blur-3xl pointer-events-none">
          <svg viewBox="0 0 1000 600" className="w-full h-full">
            {/* Patrón de velas difuminadas */}
            <defs>
              <linearGradient id="candleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#00d084', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#ff0000', stopOpacity: 0.3 }} />
              </linearGradient>
              <filter id="blur">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              </filter>
            </defs>
            
            {/* Líneas de grid */}
            {[...Array(10)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 60} x2="1000" y2={i * 60} stroke="#00d084" strokeWidth="1" opacity="0.2" />
            ))}
            {[...Array(15)].map((_, i) => (
              <line key={`v${i}`} x1={i * 70} y1="0" x2={i * 70} y2="600" stroke="#00d084" strokeWidth="1" opacity="0.2" />
            ))}

            {/* Velas simuladas */}
            {[0, 70, 140, 210, 280, 350, 420, 490, 560, 630, 700, 770, 840, 910].map((x, idx) => (
              <g key={`candle${idx}`} filter="url(#blur)">
                {/* Línea alta-baja */}
                <line x1={x + 30} y1={100 + Math.random() * 150} x2={x + 30} y2={350 + Math.random() * 150} stroke="#00d084" strokeWidth="1" opacity="0.5" />
                {/* Cuerpo de vela */}
                <rect x={x + 15} y={200 + Math.random() * 100} width="30" height={80 + Math.random() * 100} fill={Math.random() > 0.5 ? '#00d084' : '#ff4444'} opacity="0.4" />
              </g>
            ))}
          </svg>
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700 backdrop-blur-sm bg-gray-900/80">
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-green-700 to-red-900 p-3 rounded-xl mb-4">
                <TrendingUp className="text-white" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Velas AI</h1>
              <p className="text-slate-400">Análisis de Trading con IA</p>
            </div>

            <div className="flex gap-2 mb-6 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('login')}
                className={`flex-1 py-2 rounded-md font-medium transition ${
                  currentView === 'login'
                    ? 'bg-green-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setCurrentView('register')}
                className={`flex-1 py-2 rounded-md font-medium transition ${
                  currentView === 'register'
                    ? 'bg-green-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Registrarse
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex gap-2 text-red-300 text-sm">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg flex gap-2 text-green-300 text-sm">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={currentView === 'login' ? handleLogin : handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-600 transition"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-600 transition"
                  placeholder="••••••"
                />
              </div>

              {currentView === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-600 transition"
                    placeholder="••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white font-medium py-2 rounded-lg transition mt-6"
              >
                {currentView === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">📌 Cuenta de prueba:</p>
              <p className="text-xs text-gray-300 font-mono">Email: test@velas.ai</p>
              <p className="text-xs text-gray-300 font-mono">Pass: test123</p>
            </div>

            <div className="mt-4 p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
              <p className="text-xs text-orange-300">
                ⚠️ ANÁLISIS EDUCATIVO: No garantiza ganancias. El trading implica riesgo de pérdida total.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900 relative">
      {/* Fondo de gráfico difuminado */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <svg viewBox="0 0 1200 800" className="w-full h-full">
          <defs>
            <filter id="bgBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>
          {[...Array(20)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2="1200" y2={i * 40} stroke="#00d084" strokeWidth="1" opacity="0.1" filter="url(#bgBlur)" />
          ))}
          {[...Array(30)].map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="800" stroke="#00d084" strokeWidth="1" opacity="0.1" filter="url(#bgBlur)" />
          ))}
        </svg>
      </div>

      {/* Header */}
      <header className="bg-gray-900/80 border-b border-gray-800 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-green-700 to-red-900 p-2 rounded-lg">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-white font-bold">Velas AI</h1>
              <p className="text-xs text-gray-400">Plan {PLANS[userPlan].name}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="text-sm text-gray-300">
              <span className="text-green-400 font-bold">{usedToday}</span>
              <span className="text-gray-400">/{PLANS[userPlan].uses} usos</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition"
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-800 p-4 space-y-3">
            <div className="text-sm text-gray-300">
              <span className="text-green-400 font-bold">{usedToday}</span>
              <span className="text-gray-400">/{PLANS[userPlan].uses} usos</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Analysis Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">📊 Subir Gráfico</h2>
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-green-600 transition cursor-pointer">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadAndAnalyze}
                    disabled={analyzing || usedToday >= PLANS[userPlan].uses}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="text-slate-400" size={32} />
                    <div>
                      <p className="text-white font-medium">Sube un screenshot</p>
                      <p className="text-gray-400 text-sm">PNG, JPG o JPEG (máx 5MB)</p>
                    </div>
                    {analyzing && (
                      <div className="flex items-center gap-2 text-green-400">
                        <Loader size={18} className="animate-spin" />
                        <span>Analizando con Claude...</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg flex gap-3 text-red-300">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 bg-green-900/30 border border-green-700 rounded-lg flex gap-3 text-green-300">
                  <CheckCircle size={20} className="flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {lastAnalysis && (
                <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-white font-bold mb-3">📈 Análisis Reciente:</h3>
                  <div className="text-gray-300 text-sm whitespace-pre-wrap">{lastAnalysis}</div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Usage Card */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl backdrop-blur-sm">
              <h3 className="text-white font-bold mb-4">📊 Mi Plan</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Usos:</span>
                  <span className="text-white font-bold">{usedToday}/{PLANS[userPlan].uses}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-600 to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(usedToday / PLANS[userPlan].uses) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                  <span>Historial: {PLANS[userPlan].daysHistory || PLANS[userPlan].history} {PLANS[userPlan].daysHistory ? 'días' : 'usos'}</span>
                </div>
              </div>
            </div>

            {/* Plans Card */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl backdrop-blur-sm">
              <h3 className="text-white font-bold mb-4">🚀 Upgradear</h3>
              <div className="space-y-2">
                {Object.entries(PLANS).map(([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    disabled={userPlan === key}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      userPlan === key
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{plan.name}</span>
                      <span>${plan.price}</span>
                    </div>
                    <span className="text-xs opacity-75">{plan.uses} usos</span>
                  </button>
                ))}
              </div>

              {selectedPlan && selectedPlan !== userPlan && (
                <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                  <p className="text-green-300 text-sm mb-3">
                    ¿Pasar a {PLANS[selectedPlan].name}?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpgradePlan(selectedPlan)}
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white font-medium py-2 rounded-lg transition"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setSelectedPlan(null)}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Card */}
            <button
              onClick={downloadReceipt}
              className="w-full bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={18} />
              Descargar Comprobante
            </button>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-6">📋 Historial de Análisis</h2>
          
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="text-gray-700 mx-auto mb-4" size={40} />
              <p className="text-gray-400">No hay análisis aún. ¡Sube tu primer gráfico!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((analysis, idx) => (
                <div key={analysis.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-green-600/50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-gray-400 text-sm">#{idx + 1}</p>
                      <p className="text-gray-300 text-xs">{analysis.timestamp}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      analysis.analysis.includes('COMPRA') 
                        ? 'bg-green-900/40 text-green-300'
                        : analysis.analysis.includes('VENDA')
                        ? 'bg-red-900/40 text-red-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {analysis.analysis.includes('COMPRA') ? '🟢 COMPRA' : analysis.analysis.includes('VENDA') ? '🔴 VENDA' : '⚪ NEUTRAL'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">{analysis.analysis}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer Warning */}
      <footer className="mt-12 border-t border-gray-800 bg-gray-900/50 py-6 text-center text-xs text-gray-400 relative z-10">
        <p className="max-w-2xl mx-auto">
          ⚠️ <strong>ANÁLISIS EDUCATIVO:</strong> Este servicio proporciona análisis técnico informativo. NO es asesoramiento financiero. NO garantiza ganancias. 
          El trading conlleva riesgo de pérdida total. Invierte solo lo que puedas perder.
        </p>
      </footer>
    </div>
  );
}
