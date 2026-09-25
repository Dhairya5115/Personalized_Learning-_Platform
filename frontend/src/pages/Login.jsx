import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowLeft, Mail, Lock, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function Login() {
    const { login, register } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    // Password visibility toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('STUDENT');

    // Forgot password states
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');

    // Reset password states
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            setResetToken(token);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                await register(email, password, firstName, lastName, role);
                if (window.showToast) window.showToast('Account created successfully!', 'success');
            } else {
                await login(email, password);
                if (window.showToast) window.showToast('Logged in successfully!', 'success');
            }
        } catch (err) {
            const msg = err.message || 'Authentication failed. Please verify credentials.';
            setError(msg);
            if (window.showToast) window.showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setForgotSuccess('');
        setLoading(true);

        try {
            const data = await api.forgotPassword(forgotEmail);
            const msg = data.message || 'Password reset email sent!';
            setForgotSuccess(msg);
            if (window.showToast) window.showToast('Recovery link sent to your inbox!', 'success');
        } catch (err) {
            const msg = err.message || 'Failed to send forgot password email.';
            setError(msg);
            if (window.showToast) window.showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setResetSuccess('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            if (window.showToast) window.showToast('Passwords do not match', 'error');
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const data = await api.resetPassword(resetToken, newPassword);
            const msg = data.message || 'Password reset successfully!';
            setResetSuccess(msg);
            if (window.showToast) window.showToast('Password reset successfully!', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => {
                setResetToken('');
                setIsForgotPassword(false);
                setIsRegistering(false);
                setResetSuccess('');
            }, 3000);
        } catch (err) {
            const msg = err.message || 'Failed to reset password.';
            setError(msg);
            if (window.showToast) window.showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#ffffff] px-4 py-12 relative overflow-hidden select-none">
            <div className="bg-[#ffffff] border border-[#edebe3] w-full max-w-md rounded-2xl p-8 sm:p-10 shadow-lg flex flex-col relative z-10 transition-colors duration-200">
                
                {/* Logo and Greeting */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="bg-[#00262b] p-3.5 rounded-2xl text-[#04c5e7] shadow-sm mb-4">
                        <BookOpen size={30} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-[#00262b] tracking-tight leading-tight">
                        {resetToken ? 'Reset Your Password' : isForgotPassword ? 'Forgot Password' : isRegistering ? 'Create an Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-[#52716c] text-xs mt-2.5 max-w-[280px]">
                        {resetToken 
                            ? 'Type your new password below to reset it' 
                            : isForgotPassword 
                            ? 'Enter your email to get a link to reset your password' 
                            : isRegistering 
                            ? 'Sign up to start learning on TailorLearn' 
                            : 'Log in to continue your classes'}
                    </p>
                </div>

                {error && (
                    <div className="bg-[#f3f1ed] text-[#d64000] border border-[#d64000]/30 p-3.5 rounded-xl text-xs mb-6 text-center font-bold">
                        {error}
                    </div>
                )}

                {forgotSuccess && (
                    <div className="bg-[#f3f1ed] text-[#00262b] border border-[#04c5e7] p-3.5 rounded-xl text-xs mb-6 text-center font-bold">
                        {forgotSuccess}
                    </div>
                )}

                {resetSuccess && (
                    <div className="bg-[#f3f1ed] text-[#00262b] border border-[#04c5e7] p-3.5 rounded-xl text-xs mb-6 text-center font-bold">
                        {resetSuccess}
                    </div>
                )}

                {resetToken ? (
                    /* RESET PASSWORD FORM */
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider mb-2">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={16} />
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c] hover:text-[#00262b] transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider mb-2">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={16} />
                                <input 
                                    type={showConfirmPassword ? 'text' : 'password'} 
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c] hover:text-[#00262b] transition-colors p-1"
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary w-full mt-2" 
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Reset Password'}
                        </button>
                    </form>
                ) : isForgotPassword ? (
                    /* FORGOT PASSWORD FORM */
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={16} />
                                <input 
                                    type="email" 
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                    placeholder="you@example.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary w-full mt-2" 
                            disabled={loading}
                        >
                            {loading ? 'Sending recovery link...' : 'Send Recovery Email'}
                        </button>

                        <div className="mt-6 text-center">
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsForgotPassword(false);
                                    setError('');
                                    setForgotSuccess('');
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52716c] hover:text-[#00262b] transition-colors"
                            >
                                <ArrowLeft size={14} /> Back to Log In
                            </button>
                        </div>
                    </form>
                ) : (
                    /* LOGIN / REGISTER FORM */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegistering && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider mb-2">First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={14} />
                                            <input 
                                                type="text" 
                                                className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-9 pr-4 py-2 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider mb-2">Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={14} />
                                            <input 
                                                type="text" 
                                                className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-9 pr-4 py-2 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider mb-2">I am a:</label>
                                    <select 
                                        className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-4 py-2.5 text-sm text-[#00262b] font-medium focus:outline-none focus:border-[#04c5e7]"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        <option value="STUDENT">Student (I want to learn)</option>
                                        <option value="TEACHER">Teacher (I want to teach)</option>
                                        <option value="TA">Teaching Assistant (TA)</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-0.99 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={16} />
                                <input 
                                    type="email" 
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[11px] font-bold text-[#52716c] uppercase tracking-wider">Password</label>
                                {!isRegistering && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setIsForgotPassword(true);
                                            setError('');
                                        }}
                                        className="text-[11px] font-bold text-[#04c5e7] hover:text-[#00262b] transition-colors hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-0.99 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={16} />
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#52716c] hover:text-[#00262b] transition-colors p-1"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary w-full mt-4 disabled:opacity-50" 
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Log In'}
                        </button>
                    </form>
                )}

                {!resetToken && !isForgotPassword && (
                    <div className="mt-6 text-center text-xs text-[#52716c]">
                        <span>
                            {isRegistering ? 'Already have an account? ' : 'Don\'t have an account? '}
                        </span>
                        <button 
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                            }}
                            className="font-bold text-[#00262b] hover:text-[#04c5e7] hover:underline transition-colors ml-1"
                        >
                            {isRegistering ? 'Log In here' : 'Sign up now'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
