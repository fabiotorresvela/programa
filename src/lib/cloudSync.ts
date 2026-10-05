import type { Course, MoneyEntry } from '../types';
import { loadCustomCourses, saveCustomCourses } from './courseStore';
import { loadEntries, saveEntries } from './storage';
import { getSupabase } from './supabase';

type CloudRow = {
  user_id: string;
  finance_entries: MoneyEntry[];
  custom_courses: Course[];
  updated_at: string;
};

export async function pullUserData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false as const, reason: 'no_config' };

  const { data, error } = await supabase
    .from('programa_user_data')
    .select('finance_entries, custom_courses, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false as const, reason: error.message };

  if (!data) {
    // Primera vez: sube lo local si hay algo
    const localFinance = loadEntries();
    const localCourses = loadCustomCourses();
    await pushUserData(userId, localFinance, localCourses);
    return { ok: true as const, finance: localFinance, courses: localCourses };
  }

  const finance = (data.finance_entries as MoneyEntry[]) ?? [];
  const courses = (data.custom_courses as Course[]) ?? [];
  saveEntries(finance);
  saveCustomCourses(courses);
  return { ok: true as const, finance, courses };
}

export async function pushUserData(
  userId: string,
  finance: MoneyEntry[],
  courses: Course[],
) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false as const, reason: 'no_config' };

  const row: CloudRow = {
    user_id: userId,
    finance_entries: finance,
    custom_courses: courses,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('programa_user_data').upsert(row, {
    onConflict: 'user_id',
  });

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export async function pushLocalSnapshot(userId: string) {
  return pushUserData(userId, loadEntries(), loadCustomCourses());
}
