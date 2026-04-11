import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Zap, User, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { registerSchema, type RegisterFormValues } from '@/utils/validators';
import { useAuthStore } from '@/features/auth/authStore';

export default function SignupPage() {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');
  const passwordChecks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  };

  const onSubmit = async (data: RegisterFormValues) => {
    const result = await registerUser({
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
    });
    if (result.success) {
      toast.success('Account created! Welcome aboard 🚀');
      navigate('/dashboard', { replace: true });
    } else {
      setError('root', { message: result.message });
      toast.error(result.message ?? 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-primary-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-brand shadow-glow-primary mb-4">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Start trading smarter today</p>
        </div>

        <div className="card">
          {errors.root && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-bear/10 border border-bear/30 text-bear text-sm px-4 py-3 rounded-xl mb-5"
            >
              <AlertCircle size={15} className="flex-shrink-0" />
              {errors.root.message}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('name')}
                  type="text"
                  id="signup-name"
                  autoComplete="name"
                  placeholder="John Doe"
                  className={`form-input pl-10 ${errors.name ? 'border-bear' : ''}`}
                />
              </div>
              {errors.name && <p className="text-bear text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('email')}
                  type="email"
                  id="signup-email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`form-input pl-10 ${errors.email ? 'border-bear' : ''}`}
                />
              </div>
              {errors.email && <p className="text-bear text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('password')}
                  type="password"
                  id="signup-password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`form-input pl-10 ${errors.password ? 'border-bear' : ''}`}
                />
              </div>
              {/* Password strength indicators */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[
                    { ok: passwordChecks.length,    label: 'At least 8 characters' },
                    { ok: passwordChecks.uppercase, label: 'One uppercase letter' },
                    { ok: passwordChecks.number,    label: 'One number' },
                  ].map(({ ok, label }) => (
                    <span key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-bull' : 'text-slate-600'}`}>
                      <CheckCircle size={11} /> {label}
                    </span>
                  ))}
                </div>
              )}
              {errors.password && <p className="text-bear text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('confirmPassword')}
                  type="password"
                  id="signup-confirm-password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`form-input pl-10 ${errors.confirmPassword ? 'border-bear' : ''}`}
                />
              </div>
              {errors.confirmPassword && <p className="text-bear text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              id="signup-submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
