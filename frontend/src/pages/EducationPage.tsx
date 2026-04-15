import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Clock, Award, ChevronRight, Search } from 'lucide-react';
import api from '@/services/api';
import { CardSkeleton } from '@/components/ui/Skeleton';

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  lessons: number;
  completed?: boolean;
}

const DEMO_COURSES: Course[] = [
  { _id:'1', title:'Stock Market Basics',              description:'Learn how stock markets work, key terms, and how to start investing.',      category:'Fundamentals',    level:'Beginner',     duration:'2h 30m', lessons:12 },
  { _id:'2', title:'Technical Analysis Masterclass',   description:'Chart patterns, indicators (RSI, MACD), and entry/exit strategies.',        category:'Technical',       level:'Intermediate', duration:'4h 00m', lessons:20 },
  { _id:'3', title:'Fundamental Analysis Deep Dive',   description:'How to read financial statements and value a company accurately.',          category:'Fundamentals',    level:'Intermediate', duration:'3h 15m', lessons:16 },
  { _id:'4', title:'Risk Management & Position Sizing',description:'Protect your capital using stop losses, position sizing, and diversification.',category:'Risk',           level:'Beginner',     duration:'1h 45m', lessons:9 },
  { _id:'5', title:'Options & Derivatives',             description:'Calls, puts, hedging strategies, and option Greeks explained simply.',       category:'Derivatives',     level:'Advanced',     duration:'5h 30m', lessons:28 },
  { _id:'6', title:'AI & Algo Trading Fundamentals',   description:'Introduction to algorithmic trading and using AI signals in your strategy.',  category:'Technology',      level:'Advanced',     duration:'3h 00m', lessons:15 },
];

const LEVEL_COLORS: Record<string, string> = {
  Beginner:     'bg-bull/20 text-bull border-bull/30',
  Intermediate: 'bg-hold/20 text-hold border-hold/30',
  Advanced:     'bg-bear/20 text-bear border-bear/30',
};

export default function EducationPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/education/modules');
      const backendModules = data.data?.modules || data.modules;
      if (backendModules && Array.isArray(backendModules)) {
        setCourses(backendModules.map((m: any) => ({
          _id: m.id || m._id || String(Math.random()),
          title: m.name || m.title || 'Course',
          description: m.description || '',
          category: m.category || 'General',
          level: ['Beginner', 'Intermediate', 'Advanced'].includes(m.category) ? m.category : 'Beginner',
          duration: m.duration || '1h',
          lessons: m.topics?.length || m.lessons || 5,
          completed: m.progress?.completed || false,
        })));
      } else {
        setCourses(data.courses ?? data.data?.courses ?? DEMO_COURSES);
      }
    } catch { setCourses(DEMO_COURSES); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filtered = courses.filter(c =>
    (filter === 'All' || c.level === filter) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()) ||
     c.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Education Hub</h1>
        <p className="page-subtitle mt-1">Master trading from basics to advanced AI strategies.</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…" className="form-input pl-10 text-sm" />
        </div>
        <div className="flex gap-2">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setFilter(l)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all
                ${filter === l ? 'bg-primary-500/20 border-primary-500/40 text-primary-400' : 'bg-white dark:bg-dark-100 border-slate-300 dark:border-slate-700 text-slate-500 hover:border-slate-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Courses', value: courses.length.toString(),                             icon: BookOpen },
          { label: 'Completed',     value: courses.filter(c => c.completed).length.toString(),    icon: Award    },
          { label: 'Total Lessons', value: courses.reduce((s,c) => s + c.lessons, 0).toString(),  icon: Play     },
        ].map((s) => (
          <div key={s.label} className="stat-card flex-row items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            </div>
            <s.icon size={20} className="text-primary-400 opacity-60" />
          </div>
        ))}
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course, i) => (
            <motion.div key={course._id}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}
              className="card hover:border-primary-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <BookOpen size={18} className="text-primary-400" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[course.level]}`}>
                  {course.level}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1.5 group-hover:text-primary-300 transition-colors leading-snug">
                {course.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{course.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 dark:border-slate-800/60 pt-3">
                <span className="flex items-center gap-1"><Clock size={11} /> {course.duration}</span>
                <span className="flex items-center gap-1"><Play size={11} /> {course.lessons} lessons</span>
                <span className="text-primary-500 font-semibold flex items-center gap-0.5">
                  Start <ChevronRight size={12} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No courses match your search. Try different keywords.</p>
        </div>
      )}
    </div>
  );
}
