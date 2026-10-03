import type { Course } from '../types';
import { courses as builtIn } from '../data/courses';

const KEY = 'programa.courses.v1';

export function loadCustomCourses(): Course[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Course[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomCourses(courses: Course[]) {
  localStorage.setItem(KEY, JSON.stringify(courses));
}

export function allCourses(custom: Course[]): Course[] {
  return [...custom, ...builtIn];
}
