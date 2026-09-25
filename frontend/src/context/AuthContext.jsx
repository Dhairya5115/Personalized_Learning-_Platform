import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Synchronous initial hydration from tab-scoped sessionStorage prevents flash of unauthenticated state
    const [user, setUser] = useState(() => {
        try {
            const token = sessionStorage.getItem('token');
            const storedUser = sessionStorage.getItem('user');
            if (token && storedUser) {
                return JSON.parse(storedUser);
            }
        } catch (err) {
            console.error('Error initializing user from sessionStorage:', err);
        }
        return null;
    });

    const [loading, setLoading] = useState(false);
    const [postLoginLoading, setPostLoginLoading] = useState(false);

    // Initial background profile sync (non-destructive on network/timeout errors)
    useEffect(() => {
        let isMounted = true;

        async function verifySession() {
            const token = sessionStorage.getItem('token');
            if (token) {
                try {
                    const freshProfile = await api.getProfile();
                    if (isMounted && freshProfile) {
                        sessionStorage.setItem('user', JSON.stringify(freshProfile));
                        setUser(freshProfile);
                    }
                } catch (err) {
                    // Only update state if explicit 401 was returned and unrefreshable
                    if (err.status === 401) {
                        if (isMounted) setUser(null);
                    } else {
                        // Network error or tab throttled - keep existing stored session
                        console.warn('Background profile verification deferred (offline/throttled):', err.message);
                    }
                }
            }
        }

        verifySession();
        return () => {
            isMounted = false;
        };
    }, []);

    // Tab focus & visibility rehydration from tab-scoped sessionStorage (no cross-tab interference)
    useEffect(() => {
        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') {
                const token = sessionStorage.getItem('token');
                const storedUser = sessionStorage.getItem('user');

                if (!token || !storedUser) {
                    setUser((currentUser) => (currentUser !== null ? null : currentUser));
                } else {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser((currentUser) => {
                            // Only update if data actually changed to avoid unnecessary re-renders
                            if (
                                !currentUser ||
                                currentUser.id !== parsedUser.id ||
                                currentUser.role !== parsedUser.role ||
                                currentUser.xpPoints !== parsedUser.xpPoints ||
                                currentUser.streakCount !== parsedUser.streakCount
                            ) {
                                return parsedUser;
                            }
                            return currentUser;
                        });
                    } catch (err) {
                        console.error('Failed to rehydrate user on tab focus:', err);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, []);

    const login = async (email, password) => {
        const data = await api.login(email, password);
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        setPostLoginLoading(true);
        setUser(data.user);
        return data.user;
    };

    const register = async (email, password, firstName, lastName, role) => {
        const data = await api.register(email, password, firstName, lastName, role);
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        setPostLoginLoading(true);
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setPostLoginLoading(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, postLoginLoading, setPostLoginLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
