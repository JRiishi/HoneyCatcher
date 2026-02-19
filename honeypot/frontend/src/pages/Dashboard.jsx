import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import GlassCard from '../components/GlassCard.jsx';
import { fetchSessions } from '../services/api.js';
import { cn } from '../utils.js';
import DashboardFilters from '../components/DashboardFilters.jsx';
import { Volume2, MessageSquare, Globe } from 'lucide-react';

// Helper for safe date formatting
const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Just now' : date.toLocaleTimeString();
};

const Dashboard = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [filters, setFilters] = useState({
        voiceEnabled: null,
        language: '',
        minScamScore: 0,
        voiceMode: ''
    });

    const load = async (currentFilters = filters) => {
        const data = await fetchSessions(currentFilters);
        // Sort by last_updated desc
        const sorted = (data || []).sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
        setSessions(sorted);
        setLoading(false);
    };

    useEffect(() => {
        load();
        const interval = setInterval(() => load(), 3000);
        return () => clearInterval(interval);
    }, [filters]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setLoading(true);
    };

    const activeSessions = sessions.filter(s => s.status !== 'terminated');

    return (
        <div className="min-h-screen bg-background text-text-primary flex flex-col overflow-hidden">
            <Navbar />

            <main className="flex-1 flex flex-col w-full mt-12 md:mt-20 px-4 md:px-8 pb-8 overflow-hidden">
                <header className="mb-4 md:mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold mb-2">Active Threats</h1>
                        <p className="text-gray-400 text-sm md:text-base">Monitoring {activeSessions.length} active engagements</p>
                    </div>
                    <button
                        onClick={async () => {
                            setSimulating(true);
                            const { simulateScamMessage } = await import('../services/api');
                            const uniqueId = Math.random().toString(36).substring(7);
                            await simulateScamMessage(
                                `sim-${uniqueId}`,
                                "URGENT ALERT: Your KYC is pending. Your account will be BLOCKED in 10 minutes. Click valid-bank-url.com/verify to update immediately."
                            );
                            setSimulating(false);
                            // Trigger reload
                            const data = await fetchSessions();
                            setSessions((data || []).sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated)));
                        }}
                        disabled={simulating}
                        className="btn-touch w-full md:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center md:justify-start gap-2"
                    >
                        {simulating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                <span className="hidden sm:inline">INJECTING THREAT...</span>
                                <span className="sm:hidden">INJECT...</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={16} />
                                <span className="hidden sm:inline">SIMULATE ATTACK</span>
                                <span className="sm:hidden">SIMULATE</span>
                            </>
                        )}
                    </button>
                </header>

                <div className="mb-6 md:mb-8">
                    <DashboardFilters onFilterChange={handleFilterChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto">
                    {loading ? (
                        <div className="text-gray-500 animate-pulse">Scanning network...</div>
                    ) : sessions.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-gray-500 bg-white/5 rounded-xl border border-white/5">
                            No active honey-pot sessions. The network is quiet.
                        </div>
                    ) : (
                        sessions.map((session, i) => (
                            <Link key={session.session_id} to={`/session/${session.session_id}`}>
                                <GlassCard
                                    delay={i * 0.05}
                                    className={cn(
                                        "group hover:border-primary/50 cursor-pointer h-full flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
                                        session.is_confirmed_scam ? "border-red-500/20 bg-red-900/5" : "border-white/10"
                                    )}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="bg-white/10 text-[10px] px-2 py-0.5 rounded font-mono text-gray-400 border border-white/5 w-fit">
                                                    ID: {session.session_id.slice(0, 6)}
                                                </div>
                                                <div className="flex gap-2">
                                                    {session.voice_enabled ? (
                                                        <div className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-500/20">
                                                            <Volume2 size={10} /> VOICE
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-500/10 text-slate-400 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border border-slate-500/20">
                                                            <MessageSquare size={10} /> SMS
                                                        </div>
                                                    )}
                                                    {session.detected_language && (
                                                        <div className="bg-white/5 text-gray-500 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border border-white/5 uppercase">
                                                            <Globe size={10} /> {session.detected_language}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {session.is_confirmed_scam ? (
                                                <div className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded flex items-center gap-1 border border-red-500/20 animate-pulse">
                                                    <AlertCircle size={12} />
                                                    THREAT
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">
                                                    MONITOR
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 mb-6 bg-black/20 p-4 rounded-lg">
                                            <div className="text-sm text-gray-400 flex justify-between">
                                                <span>Messages</span>
                                                <span className="text-white font-mono">{session.message_count || 0}</span>
                                            </div>
                                            <div className="text-sm text-gray-400 flex justify-between">
                                                <span>Risk Level</span>
                                                <span className={cn(
                                                    "font-bold",
                                                    (session.scam_score || 0) > 0.8 ? "text-red-500" :
                                                        (session.scam_score || 0) > 0.5 ? "text-yellow-500" : "text-emerald-500"
                                                )}>
                                                    {((session.scam_score || 0) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400 flex justify-between">
                                                <span>State</span>
                                                <span className="uppercase text-[10px] font-bold tracking-wider bg-white/5 px-2 py-0.5 rounded">
                                                    {session.status || 'ACTIVE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs text-gray-500 group-hover:text-primary transition-colors">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatDate(session.last_updated)}
                                        </span>
                                        <div className="flex items-center gap-1 text-primary/80">
                                            View Intel <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </GlassCard>
                            </Link>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
