import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Cpu, 
  ChevronRight, 
  Smartphone, 
  User, 
  Fingerprint, 
  Mail,
  Loader2
} from 'lucide-react';
// import { auth } from '../config/firebase'; // Uncomment when Firebase is fully configured
// import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface JarvisLoginProps {
  onLoginSuccess?: (name: string) => void;
  onBack?: () => void;
}

const JarvisLogin: React.FC<JarvisLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [loginMethod, setLoginMethod] = useState<'otp' | 'google' | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1 = details, 2 = OTP
  const [isLoading, setIsLoading] = useState(false);

  // Form Field State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Setup Recaptcha (Placeholder for Firebase integration)
  useEffect(() => {
    // if (!window.recaptchaVerifier) {
    //   window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    //     'size': 'invisible',
    //   });
    // }
  }, []);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    
    setIsLoading(true);
    // Simulate API call / Firebase send OTP
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1500);

    /* Firebase Implementation Reference:
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
      window.confirmationResult = confirmationResult;
      setStep(2);
    } catch (error) {
      console.error(error);
    }
    */
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    // Simulate verification
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess?.(name || 'Agent');
    }, 1500);

    /* Firebase Implementation Reference:
    try {
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;
      console.log('Logged in:', user);
    } catch (error) {
      console.error('Bad verification code', error);
    }
    */
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    // Simulate Google Login
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess?.(name || 'Agent');
    }, 1500);

    /* Firebase Implementation Reference:
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('Logged in with Google:', result.user);
    } catch (error) {
      console.error(error);
    }
    */
  };

  return (
    <div className="relative min-h-screen bg-canvas text-ink font-sans overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>
      
      {/* Top Left System Indicator */}
      <div className="absolute top-6 left-6 flex items-center space-x-3 opacity-70">
        <div className="w-6 h-6 rounded-full border border-line-strong flex items-center justify-center animate-pulse">
          <Cpu className="w-3 h-3 text-ink-muted" />
        </div>
        <span className="text-ink-muted text-xs tracking-[0.2em]">SECURE COMMS LINK</span>
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Core Animation Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
            {/* Outer rotating ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-line-strong border-t-ink "
            />
            {/* Inner dashed ring */}
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border-[2px] border-dashed border-line-strong"
            />
            {/* Center Core */}
            <div className="absolute inset-6 rounded-full bg-elevated backdrop-blur-sm border border-line-strong flex items-center justify-center ">
               <Shield className="w-8 h-8 text-ink animate-pulse" />
            </div>
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-light tracking-[0.2em] text-transparent bg-clip-text bg-elevated text-center"
            style={{ textShadow: '0 0 30px rgba(0, 255, 255, 0.4)' }}
          >
            CODEVORA AI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-ink-subtle tracking-[0.4em] text-xs mt-2 uppercase"
          >
            Codevora AI Login
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="bg-surface backdrop-blur-xl border border-line p-8 rounded-2xl  relative overflow-hidden"
        >
          {/* Card subtle glow top edge */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-ink to-transparent"></div>

          <div id="recaptcha-container"></div> {/* Firebase Recaptcha */}

          <AnimatePresence mode="wait">
            {/* View 1: Select Method / Enter Details */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                
                {/* Method Selector */}
                <div className="flex bg-surface p-1 rounded-lg border border-line mb-6">
                  <button 
                    onClick={() => setLoginMethod('otp')}
                    className={`flex-1 py-2 text-xs tracking-wider transition-colors rounded ${loginMethod !== 'google' ? 'bg-elevated text-ink ' : 'text-ink-subtle hover:text-ink-muted'}`}
                  >
                    MOBILE OTP
                  </button>
                  <button 
                    onClick={() => setLoginMethod('google')}
                    className={`flex-1 py-2 text-xs tracking-wider transition-colors rounded ${loginMethod === 'google' ? 'bg-elevated text-ink ' : 'text-ink-subtle hover:text-ink-muted'}`}
                  >
                    GOOGLE
                  </button>
                </div>

                {loginMethod !== 'google' ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    {/* Name Input */}
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-ink-muted/50 group-focus-within:text-ink-muted transition-colors" />
                      </div>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-surface border border-line rounded-lg pl-10 pr-4 py-3 text-ink placeholder-ink-subtle text-sm focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-line-strong transition-all"
                        placeholder="Authorized Name"
                      />
                    </div>

                    {/* Email Input (Optional) */}
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-ink-muted/50 group-focus-within:text-ink-muted transition-colors" />
                      </div>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-surface border border-line rounded-lg pl-10 pr-4 py-3 text-ink placeholder-ink-subtle text-sm focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-line-strong transition-all"
                        placeholder="Communication Relay (Optional)"
                      />
                    </div>

                    {/* Phone Input */}
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Smartphone className="h-4 w-4 text-ink-muted/50 group-focus-within:text-ink-muted transition-colors" />
                      </div>
                      <input 
                        type="tel" 
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-surface border border-line rounded-lg pl-10 pr-4 py-3 text-ink placeholder-ink-subtle text-sm focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-line-strong transition-all"
                        placeholder="Mobile Comm Link (+1...)"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full relative group overflow-hidden bg-surface border border-line-strong text-ink py-3 rounded-lg text-sm tracking-widest uppercase font-semibold hover:bg-elevated transition-all flex justify-center items-center mt-6 disabled:opacity-50"
                    >
                      <div className="absolute inset-0 bg-accent/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request Access Code'}
                    </button>
                  </form>
                ) : (
                  <div className="py-6 space-y-6">
                     {/* Name Input for Google Login (Optional just to gather name if desired) */}
                     <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-ink-muted/50 group-focus-within:text-ink-muted transition-colors" />
                      </div>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-surface border border-line rounded-lg pl-10 pr-4 py-3 text-ink placeholder-ink-subtle text-sm focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-line-strong transition-all"
                        placeholder="Identify Yourself (Optional)"
                      />
                    </div>

                    <button 
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full relative group overflow-hidden bg-hover border border-line hover:border-line text-ink py-3 rounded-lg text-sm tracking-widest font-semibold transition-all flex justify-center items-center space-x-3 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span>CONTINUE WITH GOOGLE</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <button 
                  type="button"
                  onClick={onBack}
                  className="w-full py-1 text-[10px] text-ink-subtle hover:text-ink-muted tracking-widest transition-colors mt-4 text-center border-t border-line pt-3"
                >
                  ← BACK TO HOME
                </button>
              </motion.div>
            )}

            {/* View 2: OTP Verification */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 py-4"
              >
                <div className="text-center mb-6">
                  <Fingerprint className="w-12 h-12 text-ink-muted mx-auto mb-3 opacity-80" />
                  <p className="text-ink text-sm">Identity Verification Required</p>
                  <p className="text-ink-subtle outline-none text-xs mt-1">Code transmitted to {phone}</p>
                </div>
                
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="flex justify-center">
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numbers only
                      className="w-3/4 bg-surface border-b-2 border-line focus:border-line-strong outline-none text-center text-3xl tracking-[0.5em] text-ink py-2 transition-colors placeholder-ink-subtle"
                      placeholder="------"
                    />
                  </div>
                  
                  <div className="pt-6 space-y-3">
                    <button 
                      type="submit"
                      disabled={isLoading || otp.length < 6}
                      className="w-full relative group overflow-hidden bg-elevated border border-line-strong text-ink py-3 rounded-lg text-sm tracking-widest uppercase font-bold hover:bg-hover transition-all flex justify-center items-center disabled:opacity-50"
                    >
                      <div className="absolute inset-0 bg-accent/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <span className="flex items-center space-x-2 relative z-10">
                          <span>VERIFY IDENTITY</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </button>

                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full py-2 text-xs text-ink-subtle hover:text-ink-muted tracking-widest transition-colors"
                    >
                      ABORT & RETURN
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      
      {/* Corner Brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-line"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-line"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-line"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-line"></div>
    </div>
  );
};

export default JarvisLogin;
