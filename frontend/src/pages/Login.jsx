import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

export default function Login() {
    const { login, register } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);

    // Form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('STUDENT');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                await register(email, password, firstName, lastName, role);
            } else {
                await login(email, password);
            }
            // Page refresh or redirect occurs automatically via context updates
        } catch (err) {
            setError(err.message || 'Authentication failed. Please verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="card auth-card">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ backgroundColor: 'var(--accent-indigo)', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                        <BookOpen size={32} color="white" />
                    </div>
                    <h2 className="title-medium" style={{ fontSize: '24px', margin: 0 }}>
                        {isRegistering ? 'Create your Account' : 'Welcome Back'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
                        {isRegistering ? 'Sign up to start your adaptive path' : 'Log in to continue learning'}
                    </p>
                </div>

                {error && (
                    <div style={{ 
                        backgroundColor: 'rgba(244, 63, 94, 0.15)', 
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        color: 'var(--accent-rose)', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontSize: '14px',
                        marginBottom: '20px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {isRegistering && (
                        <>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">First Name</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Last Name</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Register as</label>
                                <select 
                                    className="form-input"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    style={{ appearance: 'none' }}
                                >
                                    <option value="STUDENT">Student</option>
                                    <option value="TEACHER">Teacher</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input 
                            type="email" 
                            className="form-input" 
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input 
                            type="password" 
                            className="form-input" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={loading}
                        style={{ width: '100%', marginTop: '10px' }}
                    >
                        {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Log In'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                        {isRegistering ? 'Already have an account? ' : 'New to Adaptify? '}
                    </span>
                    <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                        }}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--accent-indigo)', 
                            fontWeight: 600,
                            padding: 0
                        }}
                    >
                        {isRegistering ? 'Log In here' : 'Sign up now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
