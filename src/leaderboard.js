import { supabase } from './supabaseClient'

const UNIQUE_VIOLATION = '23505'
const MAX_SUFFIX_ATTEMPTS = 1000

function normalizeBaseName(raw) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 16)
}

// Reserves a display name in the `players` table. If the base name is taken,
// tries base+1, base+2, ... until a free one is found (e.g. Ted, Ted1, Ted2).
export async function registerUsername(rawName) {
  const base = normalizeBaseName(rawName)
  if (!base) throw new Error('Enter a name first.')

  for (let suffix = 0; suffix <= MAX_SUFFIX_ATTEMPTS; suffix++) {
    const candidate = suffix === 0 ? base : `${base}${suffix}`
    const { data, error } = await supabase
      .from('players')
      .insert({ display_name: candidate, base_name: base })
      .select('id, display_name, user_id')
      .single()

    if (!error) return data
    if (error.code !== UNIQUE_VIOLATION) throw error
  }

  throw new Error('That name is too popular — try something else.')
}

// Locks a name to the signed-in user's account so they can reclaim it from
// any device by signing in again. RLS only allows this for a genuinely
// authenticated client (see players_claim_own in schema.sql).
export async function claimUsername(playerId, userId) {
  const { data, error } = await supabase
    .from('players')
    .update({ user_id: userId })
    .eq('id', playerId)
    .select('id, display_name, user_id')
    .single()
  if (error) throw error
  return data
}

export async function findPlayerByUserId(userId) {
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name, user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function submitRun({ playerId, displayName, timeMs, totalKills, savageKills }) {
  const { error } = await supabase.from('runs').insert({
    player_id: playerId,
    display_name: displayName,
    time_ms: Math.round(timeMs),
    total_kills: totalKills,
    savage_kills: savageKills,
  })
  if (error) throw error
}

export async function fetchTopLeaderboard(limit = 3) {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('display_name, best_time_ms, best_savage_kills, runs')
    .order('best_time_ms', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

export async function fetchFullLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('display_name, best_time_ms, best_savage_kills, runs')
    .order('best_time_ms', { ascending: true })
    .limit(200)
  if (error) throw error
  return data
}
