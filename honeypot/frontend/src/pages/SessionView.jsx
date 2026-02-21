import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSession } from '../services/api.js';
import Navbar from '../components/Navbar.jsx';
import GlassCard from '../components/GlassCard.jsx';
import MessageBubble from '../components/MessageBubble.jsx';
import IntelligencePanel from '../components/IntelligencePanel.jsx';
import { AlertTriangle, Lock, MessageSquare } from 'lucide-react';

const SessionView = () => {
    const { id } = useParams();
    const [session, setSession] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            const data = await fetchSession(id);
            if (data) setSession(data);
        };
        load();
        const interval = setInterval(load, 3000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages]); // simplified dependency

    if (!session) return <div className="min-h-screen bg-background flex items-center justify-center text-gray-500">Loading session details...</div>;

    const messages = session.history || []; // Backend needs to send history

    return (
        <div className="h-screen bg-background overflow-hidden flex flex-col">
            <Navbar />

            <div className="flex-1 flex gap-6 p-6 pt-24 overflow-hidden max-w-7xl mx-auto w-full">
                {/* Chat Column */}
                <div className="flex-1 flex flex-col gap-4">
                    <GlassCard className="flex-1 overflow-hidden flex flex-col p-0 bg-surface/30">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="font-mono text-sm text-gray-300">LIVE FEED: {id}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-yellow-500/80 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                                <Lock size={10} />
                                READ ONLY MODE
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-600 mt-20">Waiting for incoming messages...</div>
                            ) : (
                                messages.map((msg, i) => (
                                    <MessageBubble key={i} message={msg} />
                                ))
                            )}
                            <div ref={bottomRef} />
                        </div>
                    </GlassCard>
                </div>

                {/* Intelligence Column */}
                <div className="w-[400px] flex flex-col gap-4 overflow-y-auto pb-6">
                    <IntelligencePanel 
                        intelligence={session.extracted_intelligence} 
                        enableTesting={true}
                    />

                    {/* SMS Evidence Panel */}
                    {session.sms_evidence && session.sms_evidence.length > 0 && (
                        <GlassCard className="p-4 bg-surface/30">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="text-purple-400" size={18} />
                                <h3 className="font-semibold text-white">Extracted SMS Evidence</h3>
                                <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                    {session.sms_evidence.length} Msgs
                                </span>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {session.sms_evidence.map((sms, i) => (
                                    <div key={i} className="bg-black/40 rounded-lg p-3 border border-white/5">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-medium text-gray-200">{sms.address}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(sms.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 break-words">{sms.body}</p>
                                        <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
                                            <span>Type: {sms.type === 1 ? 'Inbox' : 'Sent'}</span>
                                            <span>{new Date(sms.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionView;
