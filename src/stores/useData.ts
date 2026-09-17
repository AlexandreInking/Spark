import { create } from "zustand";
import type { Course, Deliverable } from "../types";
import { db } from "../lib/db";
import { useAuth } from "./useAuth";

interface DataState {
  courses: Course[];
  deliverables: Deliverable[];
  loading: boolean;
  fetchAll: () => Promise<void>;
  addCourse: (c: Course) => Promise<void>;
  updateCourse: (c: Course) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;
  addDeliverable: (d: Deliverable) => Promise<void>;
  updateDeliverable: (d: Deliverable) => Promise<void>;
  removeDeliverable: (id: string) => Promise<void>;
}

export const useData = create<DataState>((set, get) => ({
  courses: [],
  deliverables: [],
  loading: false,
  fetchAll: async () => {
    const user = useAuth.getState().user;
    if (!user) return;
    set({ loading: true });
    try {
      const [courses, deliverables] = await Promise.all([
        db.listCourses(user.id),
        db.listDeliverables(),
      ]);
      // filtrar deliverables que pertenecen a cursos del user
      const ids = new Set(courses.map(c => c.id));
      const mine = deliverables.filter(d => ids.has(d.courseId));
      set({ courses, deliverables: mine, loading: false });
    } catch (e) {
      console.error("[useData] fetchAll failed", e);
      set({ loading: false });
      throw e;
    }
  },
  addCourse: async (c) => {
    try { await db.saveCourse(c); }
    catch (e) { console.error("[useData] saveCourse (create) failed", e, c); throw e; }
    await get().fetchAll();
  },
  updateCourse: async (c) => {
    try { await db.saveCourse(c); }
    catch (e) { console.error("[useData] saveCourse (update) failed", e, c); throw e; }
    await get().fetchAll();
  },
  removeCourse: async (id) => { await db.deleteCourse(id); await get().fetchAll(); },
  addDeliverable: async (d) => { await db.saveDeliverable(d); await get().fetchAll(); },
  updateDeliverable: async (d) => { await db.saveDeliverable(d); await get().fetchAll(); },
  removeDeliverable: async (id) => { await db.deleteDeliverable(id); await get().fetchAll(); },
}));
