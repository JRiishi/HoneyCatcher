import React from 'react';
import { Brain, ChevronRight, Lightbulb, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';

const AICoachPanel = ({ scripts, onSelectScript }) => {
  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-bold text-white">AI Coach</h3>
        <span className="ml-auto text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-bold uppercase">
          Your Turn
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Select a script to narrate to the scammer. AI suggests the best responses based on the conversation.
      </p>

      <AnimatePresence mode="wait">
        {scripts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-6 text-slate-600"
          >
            <Lightbulb className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">Waiting for scammer to speak...</p>
            <p className="text-[10px] text-slate-700 mt-1">AI will generate scripts when they respond</p>
          </motion.div>
        ) : (
          <motion.div
            key="scripts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {scripts.map((script, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onSelectScript(script)}
                className="w-full text-left p-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/20 transition-all group"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 shrink-0 group-hover:text-blue-300" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {script.text}
                    </p>
                    {script.tone && (
                      <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider">
                        Tone: {script.tone}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-blue-400 shrink-0 transition-colors" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

export default AICoachPanel;
