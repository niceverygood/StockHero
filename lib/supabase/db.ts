import { supabaseAdmin } from './server';
import type { Database } from './types';

type Symbol = Database['public']['Tables']['symbols']['Row'];
type DebateSession = Database['public']['Tables']['debate_sessions']['Row'];
type DebateMessage = Database['public']['Tables']['debate_messages']['Row'];
type Verdict = Database['public']['Tables']['verdicts']['Row'];
type Prediction = Database['public']['Tables']['predictions']['Row'];
type Outcome = Database['public']['Tables']['outcomes']['Row'];

// Symbols
export async function getSymbols() {
  const { data, error } = await supabaseAdmin
    .from('symbols')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as Symbol[];
}

export async function getSymbolByCode(code: string) {
  const { data, error } = await supabaseAdmin
    .from('symbols')
    .select('*')
    .eq('code', code)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as Symbol | null;
}

// Debate Sessions
export async function createDebateSession(
  symbolCode: string,
  symbolName: string
) {
  const { data, error } = await supabaseAdmin
    .from('debate_sessions')
    .insert({
      symbol_code: symbolCode,
      symbol_name: symbolName,
      status: 'running',
      current_round: 0,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as DebateSession;
}

export async function getDebateSession(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('debate_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as DebateSession | null;
}

export async function updateDebateSession(
  sessionId: string,
  updates: { status?: string; current_round?: number }
) {
  const { data, error } = await supabaseAdmin
    .from('debate_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data as DebateSession;
}

// Debate Messages
export async function createDebateMessage(
  sessionId: string,
  character: string,
  content: string,
  score: number,
  risks: string[],
  sources: string[],
  round: number
) {
  const { data, error } = await supabaseAdmin
    .from('debate_messages')
    .insert({
      session_id: sessionId,
      character,
      content,
      score,
      risks,
      sources,
      round,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as DebateMessage;
}

export async function getDebateMessages(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('debate_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at');
  
  if (error) throw error;
  return data as DebateMessage[];
}

// Verdicts
export async function createVerdict(
  top5: Array<{
    rank: number;
    symbolCode: string;
    symbolName: string;
    avgScore: number;
    claudeScore: number;
    geminiScore: number;
    gptScore: number;
    rationale: string;
  }>,
  consensusSummary: string
) {
  const { data, error } = await supabaseAdmin
    .from('verdicts')
    .insert({
      top5,
      consensus_summary: consensusSummary,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Verdict;
}

export async function getTodayVerdict() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabaseAdmin
    .from('verdicts')
    .select('*')
    .eq('date', today)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as Verdict | null;
}

export async function getRecentVerdicts(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabaseAdmin
    .from('verdicts')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data as Verdict[];
}

// Predictions
export async function createPrediction(
  verdictId: string,
  symbolCode: string,
  symbolName: string,
  predictedDirection: string,
  avgScore: number
) {
  const { data, error } = await supabaseAdmin
    .from('predictions')
    .insert({
      verdict_id: verdictId,
      symbol_code: symbolCode,
      symbol_name: symbolName,
      predicted_direction: predictedDirection,
      avg_score: avgScore,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Prediction;
}

export async function getPredictions(verdictId: string) {
  const { data, error } = await supabaseAdmin
    .from('predictions')
    .select('*')
    .eq('verdict_id', verdictId)
    .order('avg_score', { ascending: false });
  
  if (error) throw error;
  return data as Prediction[];
}

// Outcomes
export async function createOutcome(
  predictionId: string,
  actualDirection: string,
  actualReturn: number,
  isHit: boolean
) {
  const { data, error } = await supabaseAdmin
    .from('outcomes')
    .insert({
      prediction_id: predictionId,
      actual_direction: actualDirection,
      actual_return: actualReturn,
      is_hit: isHit,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Outcome;
}

// Archive metrics
export async function getArchiveMetrics(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabaseAdmin
    .from('predictions')
    .select(`
      *,
      outcomes (*)
    `)
    .gte('date', startDate.toISOString().split('T')[0]);
  
  if (error) throw error;
  
  const predictions = data as (Prediction & { outcomes: Outcome[] })[];
  const totalPredictions = predictions.length;
  const evaluatedPredictions = predictions.filter(p => p.outcomes.length > 0);
  const hits = evaluatedPredictions.filter(p => p.outcomes[0]?.is_hit).length;
  
  return {
    totalPredictions,
    evaluatedPredictions: evaluatedPredictions.length,
    hits,
    hitRate: evaluatedPredictions.length > 0 
      ? (hits / evaluatedPredictions.length) * 100 
      : 0,
    avgReturn: evaluatedPredictions.length > 0
      ? evaluatedPredictions.reduce((sum, p) => sum + (p.outcomes[0]?.actual_return || 0), 0) / evaluatedPredictions.length
      : 0,
  };
}





