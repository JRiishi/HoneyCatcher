import React from 'react';
import {
  Eye, Shield, AlertTriangle, Globe, Phone,
  CreditCard, Fingerprint, Mail, Link2, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';

const ENTITY_ICONS = {
  phone: Phone,
  bank_account: CreditCard,
  upi_id: CreditCard,
  url: Globe,
  email: Mail,
  aadhaar: Fingerprint,
  pan: Fingerprint,
  ifsc: CreditCard,
  keyword: Tag,
  tactic: Shield,
  name: Eye,
  organization: Eye,
  amount: CreditCard,
};

const ENTITY_COLORS = {
  phone: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  bank_account: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  upi_id: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  url: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  email: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  aadhaar: 'text-red-400 bg-red-500/10 border-red-500/20',
  pan: 'text-red-400 bg-red-500/10 border-red-500/20',
  ifsc: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  keyword: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  tactic: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

const IntelligenceStream = ({ entities, threatLevel, tactics, urlResults }) => {
  const getThreatColor = (level) => {
    if (level >= 0.7) return 'from-red-500 to-red-600';
    if (level >= 0.4) return 'from-yellow-500 to-orange-500';
    return 'from-emerald-500 to-teal-500';
  };

  const getThreatLabel = (level) => {
    if (level >= 0.7) return 'HIGH';
    if (level >= 0.4) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <GlassCard className="max-h-[400px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          Intelligence Stream
        </h3>
        <span className="text-[10px] text-slate-600 font-mono">{entities.length} entities</span>
      </div>

      {/* Threat Level Bar */}
      <div className="mb-4 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Threat Level</span>
          <span className={`text-xs font-black ${
            threatLevel >= 0.7 ? 'text-red-400' :
            threatLevel >= 0.4 ? 'text-yellow-400' : 'text-emerald-400'
          }`}>
            {getThreatLabel(threatLevel)} ({(threatLevel * 100).toFixed(0)}%)
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${getThreatColor(threatLevel)} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${threatLevel * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Active Tactics */}
      {tactics.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tactics.map((tactic, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 rounded-md text-[10px] font-bold text-pink-400 uppercase"
            >
              {tactic}
            </span>
          ))}
        </div>
      )}

      {/* Entity List */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence>
          {entities.length === 0 && (
            <div className="flex items-center justify-center py-8 text-slate-600">
              <p className="text-xs">No intelligence extracted yet</p>
            </div>
          )}

          {entities.map((entity, i) => {
            const Icon = ENTITY_ICONS[entity.type] || Tag;
            const colorClass = ENTITY_COLORS[entity.type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';

            return (
              <motion.div
                key={`${entity.type}-${entity.value}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-2 p-2 border rounded-lg ${colorClass}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{entity.value}</p>
                  <p className="text-[10px] opacity-60 uppercase">{entity.type.replace('_', ' ')}</p>
                </div>
                <span className="text-[10px] opacity-50 shrink-0">
                  {(entity.confidence * 100).toFixed(0)}%
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* URL Scan Results */}
      {urlResults.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
            URL Scans
          </h4>
          {urlResults.map((result, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                result.is_safe
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {result.is_safe ? (
                <Shield className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              <span className="truncate flex-1 font-mono">{result.url}</span>
              <span className="text-[10px] font-bold">{(result.risk_score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

export default IntelligenceStream;
