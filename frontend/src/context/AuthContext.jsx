import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStoredUser() {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                    // Optional: sync profile with server in background
                    const freshProfile = await api.getProfile();
                    localStorage.setItem('user', JSON.stringify(freshProfile));
                    setUser(freshProfile);
                } catch (err) {
                    console.error('Session verification failed, logging out:', err.message);
                    logout();
                }
            }
            setLoading(false);
        }
        loadStoredUser();
    }, []);

    const login = async (email, password) => {
        const data = await api.login(email, password);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const register = async (email, password, firstName, lastName, role) => {
        const data = await api.register(email, password, firstName, lastName, role);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
