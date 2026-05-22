import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';
const emptyProgress = { topics: {}, subtopics: {} };
const defaultStudent = { fullName: '', email: '', group: '', course: '', goal: '' };
const testResultStorageKey = (studentId, subtopicId) => `rl-guide-test-result-${studentId ?? 'guest'}-${subtopicId}`;
const examResultStorageKey = (studentId) => `rl-guide-exam-result-${studentId ?? 'guest'}`;

const seedTopics = [
  {
    id: 'intro',
    title: 'Введение в обучение с подкреплением',
    description: 'Базовые понятия: агент, среда, состояние, действие и награда.',
    level: 'Базовый',
    keywords: ['агент', 'среда', 'награда'],
    articleTitle: 'Введение в обучение с подкреплением',
    theory: '',
    practice: '',
    subtopics: [
      { id: 'intro-concepts', title: 'Основные понятия RL', description: 'Пустая подтема для базовых терминов.' },
      { id: 'intro-cycle', title: 'Цикл взаимодействия агента со средой', description: 'Пустая подтема для цикла обучения.' },
    ],
  },
];

const codeExercises = {
  'q-learning-update': {
    title: 'Песочница: обновление Q-learning',
    task: 'Исправьте функцию обновления Q-значения. Например, если старая оценка равна 2, награда 5, gamma = 0.9, лучший следующий Q = 4, а alpha = 0.5, новая оценка должна стать ближе к будущей выгоде.',
    initialCode: `def update_q(current_q, reward, gamma, next_max, alpha):
    # TODO: исправьте формулу
    return current_q

print(update_q(2, 5, 0.9, 4, 0.5))`,
    guide: [
      'Определите, какая часть выражения отвечает за будущую награду.',
      'Сравните текущую оценку с целевой оценкой после перехода.',
      'Используйте alpha как долю исправления ошибки, а не как замену Q.',
      'Запустите код и проверьте, что значение изменилось, а не осталось старым.',
    ],
    validateCode: (code) => /return\s+current_q\s*\+\s*alpha\s*\*/.test(code) && /reward\s*\+\s*gamma\s*\*\s*next_max\s*-\s*current_q/.test(code.replace(/\n/g, ' ')),
    hint: 'В формуле должна быть разница между новой целью и текущей оценкой.',
  },
  'q-learning-practice': {
    title: 'Песочница: выбор лучшего действия',
    task: 'Допишите функцию выбора действия. Например, для оценок left=0.2, right=0.9, up=0.4 агент должен выбрать действие с наибольшей оценкой.',
    initialCode: `def best_action(q_values):
    # TODO: вернуть ключ действия с максимальным Q
    return ""

q = {"left": 0.2, "right": 0.9, "up": 0.4, "down": -0.1}
print(best_action(q))`,
    guide: [
      'Посмотрите, что в словаре является названием действия, а что численной оценкой.',
      'Нужно сравнивать не названия действий, а их Q-значения.',
      'Вернуть нужно само действие, а не число.',
      'Проверьте результат на примере под редактором.',
    ],
    validateCode: (code) => /max\s*\(\s*q_values/.test(code) && /key\s*=\s*q_values\.get/.test(code),
    hint: 'Подумайте, как в Python выбрать ключ словаря по максимальному значению.',
  },
  'sarsa-update': {
    title: 'Песочница: обновление SARSA',
    task: 'Исправьте функцию SARSA. В примере ниже следующий шаг уже выбран политикой, поэтому обновление должно учитывать именно его оценку, а не лучший возможный вариант.',
    initialCode: `def update_sarsa(current_q, reward, gamma, next_action_q, alpha):
    # TODO: используйте next_action_q
    return current_q

print(update_sarsa(1.5, 2, 0.8, 3, 0.4))`,
    guide: [
      'Определите, чем SARSA отличается от Q-learning.',
      'Следующее действие уже передано в функцию через его Q-оценку.',
      'Обновление должно сдвигать старую оценку к новой цели постепенно.',
      'Запустите код и сравните, изменилась ли текущая оценка.',
    ],
    validateCode: (code) => /return\s+current_q\s*\+\s*alpha\s*\*/.test(code) && /reward\s*\+\s*gamma\s*\*\s*next_action_q\s*-\s*current_q/.test(code.replace(/\n/g, ' ')),
    hint: 'Не используйте максимум по действиям: в SARSA важна оценка выбранного действия.',
  },
  'sarsa-on-policy': {
    title: 'Песочница: on-policy цель',
    task: 'Допишите функцию on-policy оценки. Например, если стратегия выбрала safe, нужно вернуть оценку safe, даже если risky имеет большее значение.',
    initialCode: `def next_policy_value(q_values, next_action):
    # TODO: вернуть Q для next_action
    return 0

q = {"safe": 0.7, "risky": 1.2}
print(next_policy_value(q, "safe"))`,
    guide: [
      'Сравните on-policy логику с жадным выбором.',
      'Функция получает название действия, которое уже выбрано стратегией.',
      'Задача не в поиске лучшего действия, а в чтении оценки выбранного.',
      'Проверьте пример с safe и risky.',
    ],
    validateCode: (code) => /return\s+q_values\s*\[\s*next_action\s*\]/.test(code) || /return\s+q_values\.get\s*\(\s*next_action\s*\)/.test(code),
    hint: 'Используйте next_action как адрес нужного значения в словаре.',
  },
  'dqn-preprocessing': {
    title: 'Песочница: нормализация входа DQN',
    task: 'Допишите нормализацию входа DQN. Например, пиксели [0, 127.5, 255] после обработки должны перейти к шкале от 0 до 1.',
    initialCode: `def normalize_pixels(pixels):
    # TODO: вернуть новый список
    return pixels

print(normalize_pixels([0, 127.5, 255]))`,
    guide: [
      'Подумайте, какой коэффициент переводит максимум 255 в единицу.',
      'Обработка должна применяться к каждому элементу списка.',
      'Исходный список лучше не менять, а вернуть новый.',
      'Запустите код и посмотрите, стала ли середина диапазона примерно 0.5.',
    ],
    validateCode: (code) => /return\s+\[\s*pixel\s*\/\s*255\s+for\s+pixel\s+in\s+pixels\s*\]/.test(code) || /return\s+\[\s*x\s*\/\s*255\s+for\s+x\s+in\s+pixels\s*\]/.test(code),
    hint: 'Нужна операция, одинаковая для всех элементов списка.',
  },
  'actor-critic-policy-gradient': {
    title: 'Песочница: преимущество действия',
    task: 'Допишите вычисление advantage. Например, если Q действия равно 8, а ценность состояния 5, действие лучше базового ожидания на 3.',
    initialCode: `def advantage(q_value, state_value):
    # TODO: вернуть преимущество действия
    return 0

print(advantage(8, 5))
print(advantage(2, 5))`,
    guide: [
      'Advantage показывает отклонение действия от обычной ценности состояния.',
      'Если действие лучше ожидания, результат должен быть положительным.',
      'Если действие хуже ожидания, результат должен быть отрицательным.',
      'Проверьте оба случая в примере под функцией.',
    ],
    validateCode: (code) => /return\s+q_value\s*-\s*state_value/.test(code),
    hint: 'Нужно получить разницу между оценкой действия и базовой оценкой состояния.',
  },
};

const readJson = (key, fallback) => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Ошибка API');
  return payload;
};

const isBlank = (value) => !String(value ?? '').trim();

const parseRoute = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'theme') {
    return { view: 'topic', topicId: parts[1], subtopicId: parts[2] };
  }
  if (parts[0] === 'articles') {
    return { view: 'articles', topicId: parts[1] };
  }
  if (parts[0] === 'exam') return { view: 'exam' };
  if (parts[0] === 'profile') return { view: 'profile' };
  if (parts[0] === 'progress') return { view: 'dashboard' };
  if (parts[0] === 'admin') return { view: 'admin' };
  if (parts[0] === 'courses') return { view: 'dashboard' };
  return { view: 'dashboard' };
};

const pathForRoute = (view, topicId, subtopicId) => {
  if (view === 'topic') {
    return ['/theme', topicId, subtopicId].filter(Boolean).join('/');
  }
  if (view === 'articles') return ['/articles', topicId].filter(Boolean).join('/');
  if (view === 'exam') return '/exam';
  if (view === 'profile') return '/profile';
  if (view === 'admin') return '/admin';
  return '/';
};

const scrollPageToTop = (behavior = 'smooth') => {
  const scrollOptions = { top: 0, left: 0, behavior };
  window.scrollTo(scrollOptions);
  document.scrollingElement?.scrollTo(scrollOptions);
  document.querySelector('.content')?.scrollTo(scrollOptions);
};

function App() {
  const initialRoute = parseRoute(window.location.pathname);
  const [activeView, setActiveView] = useState(initialRoute.view);
  const [topics, setTopics] = useState(seedTopics);
  const [articles, setArticles] = useState([]);
  const [tests, setTests] = useState({});
  const [activeTopicId, setActiveTopicId] = useState(initialRoute.topicId ?? seedTopics[0].id);
  const [activeSubtopicId, setActiveSubtopicId] = useState(initialRoute.subtopicId ?? seedTopics[0].subtopics[0].id);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [ontologySearchResults, setOntologySearchResults] = useState([]);
  const [progress, setProgress] = useState(emptyProgress);
  const [testResults, setTestResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(() => new URLSearchParams(window.location.search).get('menu') === 'open');
  const [student, setStudent] = useState(() => {
    const savedStudent = readJson('rl-guide-student', null);
    return savedStudent?.id ? savedStudent : null;
  });
  const [examResult, setExamResult] = useState(() => readJson(examResultStorageKey(readJson('rl-guide-student', null)?.id), null));
  const [apiStatus, setApiStatus] = useState('Подключение к базе данных...');

  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const activeSubtopic =
    activeTopic?.subtopics?.find((subtopic) => subtopic.id === activeSubtopicId) ??
    activeTopic?.subtopics?.[0] ??
    null;
  const activeArticle =
    articles.find((article) => article.id === activeTopicId) ??
    articles.find((article) => article.topicId === activeTopicId) ??
    articles[0];
  const activeTest = activeSubtopic ? tests[activeSubtopic.id] : null;

  const completedSubtopics = Object.values(progress.subtopics ?? {}).filter(Boolean).length;
  const subtopicTotal = topics.reduce((sum, topic) => sum + (topic.subtopics?.length ?? 0), 0);
  const progressPercent = subtopicTotal ? Math.round((completedSubtopics / subtopicTotal) * 100) : 0;

  const refreshContent = async () => {
    const [topicsPayload, articlesPayload, testsPayload] = await Promise.all([
      apiRequest('/topics'),
      apiRequest('/articles'),
      apiRequest('/tests'),
    ]);
    setTopics(topicsPayload);
    setArticles(articlesPayload);
    setTests(testsPayload);
    if (!topicsPayload.some((topic) => topic.id === activeTopicId)) {
      setActiveTopicId(topicsPayload[0]?.id ?? seedTopics[0].id);
      setActiveSubtopicId(topicsPayload[0]?.subtopics?.[0]?.id ?? seedTopics[0].subtopics[0].id);
    }
  };

  const applyRoute = (route) => {
    setActiveView(route.view);
    if (route.topicId) setActiveTopicId(route.topicId);
    if (route.subtopicId) setActiveSubtopicId(route.subtopicId);
    scrollPageToTop();
  };

  const navigate = (view, topicId, subtopicId, replace = false) => {
    const path = pathForRoute(view, topicId, subtopicId);
    if (window.location.pathname !== path) {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    }
    setActiveView(view);
    if (topicId) setActiveTopicId(topicId);
    if (subtopicId) setActiveSubtopicId(subtopicId);
    setSidebarOpen(false);
    scrollPageToTop();
  };

  const navigateView = (view) => {
    navigate(view, view === 'articles' ? activeTopicId : undefined);
  };

  const localSearchResults = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];

    const results = [];
    for (const topic of topics) {
      const topicText = [topic.title, topic.description, topic.level, ...(topic.keywords ?? [])].join(' ').toLowerCase();
      if (topicText.includes(value)) {
        results.push({ type: 'Тема', title: topic.title, description: topic.description, topicId: topic.id });
      }

      for (const subtopic of topic.subtopics ?? []) {
        const subtopicText = [subtopic.title, subtopic.description, topic.title].join(' ').toLowerCase();
        if (subtopicText.includes(value)) {
          results.push({
            type: 'Подтема',
            title: subtopic.title,
            description: topic.title,
            topicId: topic.id,
            subtopicId: subtopic.id,
          });
        }
      }
    }

    for (const article of articles) {
      const articleText = [article.title, article.topicTitle, article.description, article.theory, article.practice].join(' ').toLowerCase();
      if (articleText.includes(value)) {
        results.push({
          type: 'Статья',
          title: article.title,
          description: article.topicTitle,
          topicId: article.id,
          view: 'articles',
        });
      }
    }

    return results.slice(0, 8);
  }, [articles, query, topics]);

  const searchResults = query.trim() ? (ontologySearchResults.length ? ontologySearchResults : localSearchResults) : [];

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setOntologySearchResults([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const payload = await apiRequest(`/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        setOntologySearchResults(payload);
      } catch (error) {
        if (error.name !== 'AbortError') setOntologySearchResults([]);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [topicsPayload, articlesPayload, testsPayload, profilePayload] = await Promise.all([
          apiRequest('/topics'),
          apiRequest('/articles'),
          apiRequest('/tests'),
          student?.id
            ? apiRequest('/profile', { method: 'POST', body: JSON.stringify({ userId: student.id }) })
            : Promise.resolve({ student: null, progress: emptyProgress, testResults: [], recommendations: [] }),
        ]);

        setTopics(topicsPayload);
        setArticles(articlesPayload);
        setTests(testsPayload);
        const route = parseRoute(window.location.pathname);
        const routeTopic = topicsPayload.find((topic) => topic.id === route.topicId);
        const nextTopic = routeTopic ?? topicsPayload[0];
        const nextSubtopic =
          nextTopic?.subtopics?.find((subtopic) => subtopic.id === route.subtopicId) ?? nextTopic?.subtopics?.[0];
        setActiveView(route.view);
        setActiveTopicId(nextTopic?.id ?? seedTopics[0].id);
        setActiveSubtopicId(nextSubtopic?.id ?? seedTopics[0].subtopics[0].id);
        setProgress(profilePayload.progress ?? emptyProgress);
        setTestResults(profilePayload.testResults ?? []);
        setRecommendations(profilePayload.recommendations ?? []);
        if (profilePayload.student) {
          setStudent(profilePayload.student);
          localStorage.setItem('rl-guide-student', JSON.stringify(profilePayload.student));
        }
        setApiStatus('PostgreSQL подключена');
      } catch {
        setApiStatus('API или PostgreSQL недоступны');
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const onPopState = () => applyRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => scrollPageToTop('auto'));
  }, [activeView, activeTopicId, activeSubtopicId]);

  const openTopic = (topicId, subtopicId, keepTopicOnlyUrl = false) => {
    const topic = topics.find((item) => item.id === topicId);
    const nextSubtopicId = subtopicId ?? topic?.subtopics?.[0]?.id ?? '';
    navigate('topic', topicId, keepTopicOnlyUrl ? undefined : nextSubtopicId);
    setActiveSubtopicId(nextSubtopicId);
    setSearchOpen(false);
  };

  const openArticle = (topicId) => {
    const targetArticle = articles.find((article) => article.id === topicId) ?? articles.find((article) => article.topicId === topicId);
    navigate('articles', targetArticle?.id ?? topicId);
    setSearchOpen(false);
  };

  const openNextLesson = () => {
    const topicIndex = topics.findIndex((item) => item.id === activeTopic?.id);
    const subtopics = activeTopic?.subtopics ?? [];
    const subtopicIndex = subtopics.findIndex((item) => item.id === activeSubtopic?.id);
    const nextSubtopic = subtopics[subtopicIndex + 1];

    if (nextSubtopic) {
      openTopic(activeTopic.id, nextSubtopic.id);
      return;
    }

    const nextTopic = topics[(topicIndex + 1) % topics.length];
    openTopic(nextTopic.id, nextTopic.subtopics?.[0]?.id);
  };

  const selectSearchResult = (result) => {
    if (result.view === 'articles') openArticle(result.topicId);
    else openTopic(result.topicId, result.subtopicId, !result.subtopicId);
  };

  const markSubtopicComplete = async () => {
    if (!student?.id) {
      navigate('profile');
      return;
    }
    const payload = await apiRequest('/progress', {
      method: 'POST',
      body: JSON.stringify({ userId: student.id, subtopicId: activeSubtopic.id }),
    });
    setProgress(payload.progress);
  };

  const submitTest = async (answers) => {
    if (!student?.id) {
      navigate('profile');
      return { error: 'Войдите в личный кабинет, чтобы сохранить результат теста.' };
    }

    const payload = await apiRequest('/submit-test', {
      method: 'POST',
      body: JSON.stringify({ userId: student.id, subtopicId: activeSubtopic.id, answers }),
    });
    setProgress(payload.progress ?? emptyProgress);
    setTestResults(payload.testResults ?? []);
    setRecommendations(payload.recommendations ?? []);
    return payload;
  };

  const saveStudent = async (nextStudent) => {
    const payload = await apiRequest('/register', { method: 'POST', body: JSON.stringify(nextStudent) });
    setStudent(payload.student);
    setProgress(payload.progress ?? emptyProgress);
    setTestResults(payload.testResults ?? []);
    setRecommendations(payload.recommendations ?? []);
    localStorage.setItem('rl-guide-student', JSON.stringify(payload.student));
    setExamResult(readJson(examResultStorageKey(payload.student.id), null));
    return payload.student;
  };

  const loginStudent = async (credentials) => {
    const payload = await apiRequest('/login', { method: 'POST', body: JSON.stringify(credentials) });
    setStudent(payload.student);
    setProgress(payload.progress ?? emptyProgress);
    setTestResults(payload.testResults ?? []);
    setRecommendations(payload.recommendations ?? []);
    localStorage.setItem('rl-guide-student', JSON.stringify(payload.student));
    setExamResult(readJson(examResultStorageKey(payload.student.id), null));
    return payload.student;
  };

  const logoutStudent = () => {
    setStudent(null);
    setProgress(emptyProgress);
    setTestResults([]);
    setRecommendations([]);
    setExamResult(readJson(examResultStorageKey(null), null));
    localStorage.removeItem('rl-guide-student');
  };

  const adminRequest = async (path, body) => {
    const payload = await apiRequest(path, {
      method: 'POST',
      body: JSON.stringify({ ...body, userId: student?.id }),
    });
    await refreshContent();
    if (payload.tests) setTests(payload.tests);
    return payload;
  };

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" onClick={() => setSidebarOpen(true)} type="button">
        <Menu size={20} />
        Меню
      </button>
      {sidebarOpen && <button aria-label="Закрыть меню" className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} type="button" />}
        <Sidebar
        activeSubtopicId={activeSubtopic?.id}
        activeTopicId={activeTopic?.id}
        activeView={activeView}
        examResult={examResult}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        openArticle={openArticle}
        openTopic={openTopic}
        progress={progress}
        progressPercent={progressPercent}
        setActiveView={navigateView}
        student={student}
        topics={topics}
      />

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Алгоритмы обучения с подкреплением</span>
            <h1>Пособие для последовательного изучения RL</h1>
          </div>
          <SearchBox
            query={query}
            results={searchResults}
            searchOpen={searchOpen}
            selectResult={selectSearchResult}
            setQuery={setQuery}
            setSearchOpen={setSearchOpen}
          />
        </header>

        <Breadcrumbs activeArticle={activeArticle} activeSubtopic={activeSubtopic} activeTopic={activeTopic} activeView={activeView} />

        {activeView === 'dashboard' && (
          <Dashboard
            completedSubtopics={completedSubtopics}
            examResult={examResult}
            openArticle={openArticle}
            openExam={() => navigate('exam')}
            openTopic={openTopic}
            progress={progress}
            progressPercent={progressPercent}
            student={student}
            topics={topics}
          />
        )}

        {activeView === 'topic' && (
          <TopicPage
            activeSubtopic={activeSubtopic}
            activeTest={activeTest}
            activeTopic={activeTopic}
            markSubtopicComplete={markSubtopicComplete}
            openArticle={openArticle}
            openNextLesson={openNextLesson}
            openTopic={openTopic}
            progress={progress}
            recommendations={recommendations}
            setActiveSubtopicId={(subtopicId) => openTopic(activeTopic.id, subtopicId)}
            student={student}
            submitTest={submitTest}
            testResults={testResults}
          />
        )}

        {activeView === 'articles' && <ArticlesPage activeArticle={activeArticle} articles={articles} openArticle={openArticle} />}

        {activeView === 'exam' && (
          <ExamPage
            examResult={examResult}
            openTopic={openTopic}
            setExamResult={setExamResult}
            student={student}
            tests={tests}
            topics={topics}
          />
        )}

        {activeView === 'progress' && (
          <ProgressPage
            completedSubtopics={completedSubtopics}
            openArticle={openArticle}
            openTopic={openTopic}
            progress={progress}
            progressPercent={progressPercent}
            examResult={examResult}
            recommendations={recommendations}
            openExam={() => navigate('exam')}
            subtopicTotal={subtopicTotal}
            testResults={testResults}
            topics={topics}
          />
        )}

        {activeView === 'admin' && (
          <AdminPage adminRequest={adminRequest} student={student} tests={tests} topics={topics} />
        )}

        {activeView === 'profile' && (
          <ProfilePage
            completedSubtopics={completedSubtopics}
            loginStudent={loginStudent}
            logoutStudent={logoutStudent}
            openDashboard={() => navigate('dashboard')}
            progress={progress}
            progressPercent={progressPercent}
            examResult={examResult}
            recommendations={recommendations}
            saveStudent={saveStudent}
            student={student}
            subtopicTotal={subtopicTotal}
            testResults={testResults}
            topics={topics}
          />
        )}
      </main>
    </div>
  );
}

function Sidebar({ activeSubtopicId, activeTopicId, activeView, examResult, isOpen, onClose, openArticle, openTopic, progress, progressPercent, setActiveView, student, topics }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside className={isOpen ? 'sidebar open' : 'sidebar'}>
      <button aria-label="Закрыть меню" className="sidebar-close" onClick={onClose} type="button">
        <X size={20} />
      </button>
      <button className="brand" onClick={() => setActiveView('dashboard')}>
        <div className="brand-mark">
          <Sparkles size={22} />
        </div>
        <div>
          <p>RL Guide</p>
          <span>электронное пособие</span>
        </div>
      </button>

      <nav className="nav">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>
          <Home size={18} />
          Главная
        </button>

        <button className={activeView === 'articles' ? 'active' : ''} onClick={() => openArticle(topics[0]?.id)}>
          <FileText size={18} />
          Статьи
        </button>

        <button className={activeView === 'exam' ? 'active' : ''} onClick={() => setActiveView('exam')}>
          <ClipboardCheck size={18} />
          Экзамен
        </button>

        <button className="nav-dropdown" onClick={() => setExpanded(!expanded)}>
          <BookOpen size={18} />
          Темы
          <ChevronDown className={expanded ? 'rotated' : ''} size={16} />
        </button>

        {expanded && (
          <div className="topic-nav-list">
            {topics.map((topic) => {
              const topicProgress = progress.topics?.[topic.id]?.percent ?? 0;
              return (
                <div className={activeTopicId === topic.id && activeView === 'topic' ? 'topic-nav-group active' : 'topic-nav-group'} key={topic.id}>
                  <button className={activeTopicId === topic.id && activeView === 'topic' ? 'current' : ''} onClick={() => openTopic(topic.id)}>
                    <span>{topic.title}</span>
                    <strong>{topicProgress}%</strong>
                  </button>
                  <div className="mini-progress">
                    <div style={{ width: `${topicProgress}%` }} />
                  </div>
                  <div className="subtopic-nav-list">
                    {(topic.subtopics ?? []).map((subtopic) => (
                      <button className={activeSubtopicId === subtopic.id && activeView === 'topic' ? 'current' : ''} key={subtopic.id} onClick={() => openTopic(topic.id, subtopic.id)}>
                        <CheckCircle2 size={14} className={progress.subtopics?.[subtopic.id] ? 'done-icon' : ''} />
                        {subtopic.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {false && <button className={activeView === 'articles' ? 'active' : ''} onClick={() => openArticle(topics[0]?.id)}>
          <FileText size={18} />
          Статьи
        </button>}

        {false && <button className={activeView === 'progress' ? 'active' : ''} onClick={() => setActiveView('progress')}>
          <LayoutDashboard size={18} />
          Прогресс
        </button>}
      </nav>

      <div className="sidebar-footer">
        <span className="footer-student-name">{student ? student.fullName : 'Гость'}</span>
        <div className="footer-progress-label">
          <span>Прогресс курса</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="progress-track">
          <div style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="exam-footer-progress">
          <span>Экзамен</span>
          <strong>{examResult?.score ?? 0}%</strong>
        </div>
        <div className="progress-track exam-track">
          <div style={{ width: `${examResult?.score ?? 0}%` }} />
        </div>
        <button className={activeView === 'profile' ? 'footer-profile active' : 'footer-profile'} onClick={() => setActiveView('profile')}>
          <UserRound size={18} />
          Личный кабинет
        </button>
        {student?.role === 'admin' && (
          <button className={activeView === 'admin' ? 'footer-profile active' : 'footer-profile'} onClick={() => setActiveView('admin')}>
            <Settings size={18} />
            Админ-панель
          </button>
        )}
      </div>
    </aside>
  );
}

function Breadcrumbs({ activeArticle, activeSubtopic, activeTopic, activeView }) {
  const labels = {
    dashboard: ['Главная'],
    topic: ['Главная', activeTopic?.title, activeSubtopic?.title],
    articles: ['Главная', 'Статьи', activeArticle?.title],
    progress: ['Главная', 'Прогресс'],
    profile: ['Главная', 'Личный кабинет'],
    admin: ['Главная', 'Админ-панель'],
  };

  return (
    <div className="breadcrumbs">
      {(labels[activeView] ?? ['Главная']).filter(Boolean).map((label, index, array) => (
        <span key={`${label}-${index}`} className={index === array.length - 1 ? 'current' : ''}>
          {label}
        </span>
      ))}
    </div>
  );
}

function SearchBox({ query, results, searchOpen, selectResult, setQuery, setSearchOpen }) {
  return (
    <div className="search-wrap">
      <label className="search-box">
        <Search size={18} />
        <input
          value={query}
          onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Поиск по темам, статьям и онтологии"
        />
      </label>
      {searchOpen && query.trim() && (
        <div className="search-results">
          {results.length ? (
            results.map((result) => (
              <button key={`${result.type}-${result.topicId}-${result.subtopicId ?? result.title}`} onMouseDown={() => selectResult(result)}>
                <span>{result.type}</span>
                <strong>{result.title}</strong>
                <small>{result.description}</small>
              </button>
            ))
          ) : (
            <p>Ничего не найдено</p>
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard({ completedSubtopics, examResult, openArticle, openExam, openTopic, progress, progressPercent, student, topics }) {
  return (
    <section className="view-grid">
      <div className="summary-panel">
        <div>
          <span className="eyebrow">{student ? `Ученик: ${student.fullName}` : 'Личный маршрут'}</span>
          <h2>Темы, подтемы, статьи и практические задания</h2>
          <p>
            Учебный маршрут разбит на темы и подтемы. В каждой подтеме есть теория, тест или практическая песочница кода,
            а прогресс помогает видеть, какие части уже изучены.
          </p>
        </div>
        <div className="summary-stats">
          <div>
            <strong>{topics.length}</strong>
            <span>тем</span>
          </div>
          <div>
            <strong>{completedSubtopics}</strong>
            <span>подтем изучено</span>
          </div>
          <div>
            <strong>{progressPercent}%</strong>
            <span>общий прогресс</span>
          </div>
        </div>
      </div>

      <div className="topic-list">
        {topics.map((topic, index) => {
          const topicProgress = progress.topics?.[topic.id]?.percent ?? 0;
          const completed = progress.topics?.[topic.id]?.completed ?? 0;

          return (
            <article className="topic-card" key={topic.id}>
              <span className="topic-index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <div className="topic-card-head">
                  <div>
                    <h3>{topic.title}</h3>
                    <p>{topic.description}</p>
                  </div>
                  <strong>{topicProgress}%</strong>
                </div>
                {false && <div className="topic-card-progress">
                  <span>{completed} из {topic.subtopics?.length ?? 0} подтем изучено</span>
                  <div className="mini-progress light">
                    <div style={{ width: `${topicProgress}%` }} />
                  </div>
                </div>}
                <div className="topic-card-subtopics">
                  {(topic.subtopics ?? []).map((subtopic) => (
                    <button key={subtopic.id} onClick={() => openTopic(topic.id, subtopic.id)}>
                      <CheckCircle2 size={15} className={progress.subtopics?.[subtopic.id] ? 'done-icon' : ''} />
                      <span>{subtopic.title}</span>
                    </button>
                  ))}
                </div>
                <span className="level">{topic.level}</span>
                <div className="topic-card-progress">
                  <span>{completed} из {topic.subtopics?.length ?? 0} подтем изучено</span>
                  <div className="mini-progress light">
                    <div style={{ width: `${topicProgress}%` }} />
                  </div>
                </div>
                <div className="card-actions">
                  <button className="secondary compact" onClick={() => openTopic(topic.id)}>
                    <BookOpen size={16} />
                    Подтемы
                  </button>
                  <button className="secondary compact" onClick={() => openArticle(topic.id)}>
                    <FileText size={16} />
                    Статья
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        <article className="topic-card exam-progress-card">
          <span className="topic-index">Э</span>
          <div>
            <div className="topic-card-head">
              <div>
                <h3>Экзамен</h3>
                <p>Итоговый тест по всем темам курса. Результат отображается отдельно и не входит в общий прогресс.</p>
              </div>
              <strong>{examResult?.score ?? 0}%</strong>
            </div>
            <span className="level">{examResult?.passed ? 'Пройден' : 'Отдельный результат'}</span>
            <div className="topic-card-progress">
              <span>{examResult ? `${examResult.correct} из ${examResult.total} ответов верно` : 'Экзамен еще не пройден'}</span>
              <div className="mini-progress light">
                <div style={{ width: `${examResult?.score ?? 0}%` }} />
              </div>
            </div>
            <div className="card-actions">
              <button className="secondary compact" onClick={openExam}>
                <ClipboardCheck size={16} />
                Экзамен
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function EmptyState({ text }) {
  return <p className="empty-state">{text}</p>;
}

const illustrationCatalog = {
  'mdp-elements': {
    title: 'Структура MDP',
    formula: 'S, A, P, R, γ',
    nodes: ['Состояние s', 'Действие a', 'Переход P', 'Награда R', 'Новое s′'],
  },
  bellman: {
    title: 'Рекурсивная идея Беллмана',
    formula: 'V(s) = E[R + γV(s′)]',
    nodes: ['Текущее состояние', 'Награда', 'Будущая ценность', 'Суммарная оценка'],
  },
  'value-functions': {
    title: 'V и Q функции',
    formula: 'V(s) ↔ Q(s,a)',
    nodes: ['Состояние', 'Доступные действия', 'Q-оценки', 'Выбор действия'],
  },
  'policy-improvement': {
    title: 'Оценивание и улучшение',
    formula: 'π → Vπ/Qπ → π′',
    nodes: ['Стратегия π', 'Оценка ценности', 'Улучшение', 'Новая π′'],
  },
  'monte-carlo': {
    title: 'Метод Монте-Карло',
    formula: 'G_t = Σ γ^k R_{t+k}',
    nodes: ['Эпизод', 'Возврат', 'Средняя оценка', 'Обновление'],
  },
  'td-learning': {
    title: 'Временные различия',
    formula: 'R + γV(s′) - V(s)',
    nodes: ['Прогноз', 'Шаг опыта', 'TD-ошибка', 'Коррекция'],
  },
  'policy-iteration': {
    title: 'Итерация по стратегиям',
    formula: 'evaluate → improve',
    nodes: ['π', 'Оценить Vπ', 'Сделать жадной', 'π лучше'],
  },
  'value-iteration': {
    title: 'Итерация по ценности',
    formula: 'V ← max_a E[R + γV(s′)]',
    nodes: ['V(s)', 'Bellman backup', 'max по действиям', 'π*'],
  },
  'q-learning-update': {
    title: 'Обновление Q-learning',
    formula: 'Q ← Q + α[R + γ max Q - Q]',
    nodes: ['s,a', 'r,s′', 'max Q(s′,a′)', 'новое Q'],
  },
  'epsilon-greedy': {
    title: 'ε-жадный выбор',
    formula: 'случайно ε, жадно 1-ε',
    nodes: ['Q-таблица', 'Случайный выбор', 'Лучшее действие', 'Опыт'],
  },
  'sarsa-update': {
    title: 'Обновление SARSA',
    formula: 'S, A, R, S′, A′',
    nodes: ['s,a', 'r,s′', 'следующее a′', 'on-policy Q'],
  },
  'sarsa-vs-q': {
    title: 'SARSA и Q-learning',
    formula: 'Q(s′,a′) vs max_a Q(s′,a)',
    nodes: ['Текущая стратегия', 'Осторожное обновление', 'Жадная цель', 'Разные траектории'],
  },
  'dqn-network': {
    title: 'DQN архитектура',
    formula: 'state → NN → Q-values',
    nodes: ['Состояние', 'Нейросеть', 'Q(a1..an)', 'argmax действие'],
  },
  'replay-target': {
    title: 'Replay и target network',
    formula: 'D replay + Qtarget',
    nodes: ['Опыт', 'Буфер', 'Мини-батч', 'Target Q'],
  },
  'actor-critic': {
    title: 'Actor-Critic',
    formula: 'actor π + critic V/Q',
    nodes: ['Actor', 'Действие', 'Среда', 'Critic', 'Сигнал обучения'],
  },
  advantage: {
    title: 'Преимущество',
    formula: 'A(s,a)=Q(s,a)-V(s)',
    nodes: ['Q действия', 'V состояния', 'Advantage', 'Обновление π'],
  },
};

Object.assign(illustrationCatalog, {
  'mdp-elements': { layout: 'matrix', title: 'Структура MDP', formula: 'S, A, P, R, gamma', nodes: ['Состояния S', 'Действия A', 'Переходы P', 'Награды R', 'Дисконт'] },
  bellman: { layout: 'formula', title: 'Идея Беллмана', formula: 'V(s) = E[R + gamma V(s\')]', nodes: ['сейчас', 'награда', 'будущее', 'оценка'] },
  'value-functions': { layout: 'matrix', title: 'V и Q функции', formula: 'V(s) сравнивает состояния, Q(s,a) сравнивает действия', nodes: ['S1', 'вверх', 'вниз', 'влево', 'вправо'] },
  'policy-improvement': { layout: 'cycle', title: 'Оценивание и улучшение', formula: 'policy evaluation -> policy improvement', nodes: ['стратегия pi', 'оценить V/Q', 'выбрать лучше', 'новая pi'] },
  'monte-carlo': { layout: 'timeline', title: 'Метод Монте-Карло', formula: 'полный эпизод -> фактический возврат', nodes: ['старт', 'шаги эпизода', 'финал', 'расчет G', 'усреднение'] },
  'td-learning': { layout: 'formula', title: 'TD-обучение', formula: 'delta = R + gamma V(s\') - V(s)', nodes: ['прогноз', 'один шаг', 'TD-ошибка', 'коррекция'] },
  'policy-iteration': { layout: 'cycle', title: 'Итерация по стратегиям', formula: 'evaluate -> improve -> evaluate', nodes: ['pi', 'V^pi', 'жадное улучшение', 'pi лучше'] },
  'value-iteration': { layout: 'formula', title: 'Итерация по ценности', formula: 'V <- max_a E[R + gamma V(s\')]', nodes: ['Bellman backup', 'max по действиям', 'обновить V', 'извлечь pi*'] },
  'return-episode': { layout: 'timeline', title: 'Возврат в эпизоде', formula: 'G_t = R1 + gamma R2 + gamma^2 R3 + ...', nodes: ['S0', 'R1', 'R2', 'R3', 'терминал'] },
  'model-types': { layout: 'compare', title: 'Модельные и безмодельные методы', formula: 'планирование по модели или обучение по опыту', nodes: ['model-based: знает P и R', 'model-free: учится по переходам', 'hybrid: опыт + модель'] },
  'q-learning-update': { layout: 'formula', title: 'Обновление Q-learning', formula: 'Q <- Q + alpha [R + gamma max Q - Q]', nodes: ['текущее Q', 'TD-цель', 'ошибка', 'новое Q'] },
  'epsilon-greedy': { layout: 'compare', title: 'epsilon-жадный выбор', formula: 'epsilon исследует, 1 - epsilon использует', nodes: ['случайное действие', 'лучшее по Q', 'баланс опыта'] },
  'q-parameters': { layout: 'compare', title: 'Параметры Q-learning', formula: 'alpha, gamma, epsilon задают стиль обучения', nodes: ['alpha: скорость', 'gamma: будущее', 'epsilon: исследование'] },
  'q-practice': { layout: 'timeline', title: 'Практический Q-learning', formula: 'наблюдать -> выбрать -> обновить -> повторить', nodes: ['Q-таблица', 'epsilon-выбор', 'переход', 'TD-ошибка', 'политика'] },
  'sarsa-update': { layout: 'timeline', title: 'Обновление SARSA', formula: 'S, A, R, S\', A\'', nodes: ['S', 'A', 'R', 'S\'', 'A\''] },
  'sarsa-vs-q': { layout: 'compare', title: 'SARSA и Q-learning', formula: 'on-policy против off-policy', nodes: ['SARSA: Q(S\',A\')', 'Q-learning: max Q(S\',a)', 'разные траектории'] },
  'on-policy-safety': { layout: 'cycle', title: 'On-policy и риск', formula: 'обновление учитывает реальное исследование', nodes: ['epsilon-стратегия', 'реальное A\'', 'оценка риска', 'безопаснее путь'] },
  'cliff-walking': { layout: 'gridworld', title: 'Cliff Walking', formula: 'короткий рискованный путь и длинный безопасный путь', nodes: ['старт', 'обрыв', 'цель', 'SARSA', 'Q-learning'] },
  'dqn-network': { layout: 'network', title: 'Архитектура DQN', formula: 'state -> neural network -> Q-values', nodes: ['состояние', 'признаки', 'скрытые слои', 'Q(a1..an)'] },
  'replay-target': { layout: 'cycle', title: 'Replay и target network', formula: 'память опыта + стабильная целевая сеть', nodes: ['переход', 'replay buffer', 'мини-батч', 'target Q'] },
  'state-preprocessing': { layout: 'pipeline', title: 'Предобработка состояния', formula: 'кадры -> признаки -> вход DQN', nodes: ['кадр', 'серый цвет', 'resize', 'стек кадров', 'DQN'] },
  'dqn-improvements': { layout: 'compare', title: 'Double и Dueling DQN', formula: 'меньше переоценка, лучше структура Q', nodes: ['Double: выбор != оценка', 'Dueling: V + A', 'устойчивее цель'] },
  'actor-critic': { layout: 'cycle', title: 'Actor-Critic', formula: 'actor выбирает, critic оценивает', nodes: ['actor', 'действие', 'среда', 'critic', 'обновление'] },
  advantage: { layout: 'formula', title: 'Преимущество', formula: 'A(s,a) = Q(s,a) - V(s)', nodes: ['лучше среднего', 'хуже среднего', 'сигнал actor', 'меньше шум'] },
  'policy-gradient': { layout: 'formula', title: 'Градиент стратегии', formula: 'увеличить вероятность действий с высоким преимуществом', nodes: ['pi(a|s)', 'действие', 'возврат', 'градиент'] },
  'a2c-ppo': { layout: 'compare', title: 'A2C и PPO', formula: 'actor-critic с преимуществом и осторожным обновлением', nodes: ['A2C: advantage', 'PPO: clipped update', 'стабильная политика'] },
});

function wrapSvgText(text, x, y, className = 'svg-note', maxChars = 18, lineHeight = 17) {
  const words = String(text).split(' ').flatMap((word) => {
    if (word.length <= maxChars) return word;
    const chunks = [];
    for (let i = 0; i < word.length; i += maxChars) {
      chunks.push(word.slice(i, i + maxChars));
    }
    return chunks;
  });
  const lines = words.reduce((result, word) => {
    const current = result[result.length - 1] ?? '';
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      result.push(word);
    } else if (result.length) {
      result[result.length - 1] = next;
    } else {
      result.push(next);
    }
    return result;
  }, []);

  return (
    <text className={className} x={x} y={y}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>
      ))}
    </text>
  );
}

function shortenSegment(x1, y1, x2, y2, offset = 24) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  return {
    sx: x1 + ux * offset,
    sy: y1 + uy * offset,
    ex: x2 - ux * offset,
    ey: y2 - uy * offset,
  };
}

function curvedPathAroundCenter(x1, y1, x2, y2, centerX = 210, centerY = 210, curve = 34, offset = 38) {
  const { sx, sy, ex, ey } = shortenSegment(x1, y1, x2, y2, offset);
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const dx = midX - centerX;
  const dy = midY - centerY;
  const length = Math.hypot(dx, dy) || 1;
  const cx = midX + (dx / length) * curve;
  const cy = midY + (dy / length) * curve;

  return `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`;
}

function GenericIllustration({ type, generic }) {
  const arrowId = `arrow-${type}`;
  const marker = (
    <defs>
      <marker id={arrowId} markerHeight="4.5" markerWidth="4.5" orient="auto" refX="4" refY="1.8">
        <path d="M0,0 L4.2,1.8 L0,3.6 Z" />
      </marker>
    </defs>
  );
  const header = (
    <>
      <rect className="svg-card active" x="42" y="28" width="636" height="58" rx="12" />
      <text className="svg-title" x="360" y="64">{generic.title}</text>
      {wrapSvgText(generic.formula, 360, 106, 'svg-note compact', 42, 14)}
    </>
  );

  if (type === 'on-policy-safety') {
    const cards = [
      { x: 54, y: 170, title: generic.nodes[0], number: 1 },
      { x: 214, y: 170, title: generic.nodes[1], number: 2 },
      { x: 374, y: 170, title: generic.nodes[2], number: 3 },
      { x: 534, y: 170, title: generic.nodes[3], number: 4 },
    ];

    return (
      <svg viewBox="0 0 720 360" role="img">
        <title>{generic.title}</title>
        {marker}
        {header}
        <path className="svg-arrow safety-arc" d="M172 156 C196 118 232 118 256 156" markerEnd={`url(#${arrowId})`} />
        <path className="svg-arrow safety-arc" d="M332 156 C356 118 392 118 416 156" markerEnd={`url(#${arrowId})`} />
        <path className="svg-arrow safety-arc" d="M492 156 C516 118 552 118 576 156" markerEnd={`url(#${arrowId})`} />
        <path className="svg-arrow safety-return" d="M595 254 C500 306 220 306 116 254" markerEnd={`url(#${arrowId})`} />
        {cards.map((card, index) => (
          <g key={card.title} transform={`translate(${card.x} ${card.y})`}>
            <rect className={index === 3 ? 'svg-card active' : 'svg-card'} width="132" height="82" rx="10" />
            <circle className="svg-dot active small" cx="22" cy="22" r="11" />
            <text className="svg-step-number small" x="22" y="26">{card.number}</text>
            {wrapSvgText(card.title, 74, 45, 'svg-note compact', 12, 12)}
          </g>
        ))}
        <text className="svg-note compact" x="360" y="334">возврат к стратегии с учетом реального риска</text>
      </svg>
    );
  }

  if (generic.layout === 'cycle') {
    const isSafetyCycle = type === 'on-policy-safety';
    const points = isSafetyCycle
      ? [[210, 136], [342, 188], [292, 278], [128, 278], [78, 188]]
      : [[210, 144], [318, 188], [276, 266], [144, 266], [102, 188]];
    const center = isSafetyCycle ? { x: 210, y: 214, curve: 66, offset: 54 } : { x: 210, y: 210, curve: 34, offset: 38 };
    const used = generic.nodes.slice(0, points.length);
    return (
      <svg viewBox="0 0 720 330" role="img">
        <title>{generic.title}</title>
        {marker}
        {header}
        <circle className="svg-cycle-core" cx={center.x} cy={center.y} r="42" />
        <text className="svg-note compact" x={center.x} y={center.y - 3}>цикл</text>
        <text className="svg-note compact" x={center.x} y={center.y + 12}>обучения</text>
        {used.map((node, index) => {
          const [x, y] = points[index];
          const [nx, ny] = points[(index + 1) % used.length];
          return (
            <g key={node}>
              <path className={isSafetyCycle ? 'svg-arrow soft' : 'svg-arrow soft thin'} d={curvedPathAroundCenter(x, y, nx, ny, center.x, center.y, center.curve, center.offset)} markerEnd={`url(#${arrowId})`} />
              <circle className="svg-dot active" cx={x} cy={y} r="17" />
              <text className="svg-step-number" x={x} y={y + 5}>{index + 1}</text>
            </g>
          );
        })}
        {used.map((node, index) => (
          <g key={`${node}-legend`} transform={`translate(410 ${128 + index * 38})`}>
            <rect className="svg-card" width="236" height="30" rx="7" />
            <circle className="svg-dot active small" cx="18" cy="15" r="10" />
            <text className="svg-step-number small" x="18" y="19">{index + 1}</text>
            {wrapSvgText(node, 130, 20, 'svg-note compact', 24, 12)}
          </g>
        ))}
      </svg>
    );
  }

  if (generic.layout === 'matrix') {
    return (
      <svg viewBox="0 0 720 300" role="img">
        <title>{generic.title}</title>
        {header}
        <rect className="svg-card" x="76" y="128" width="568" height="130" rx="10" />
        <path className="svg-grid" d="M76 168 H644 M76 208 H644 M190 128 V258 M326 128 V258 M462 128 V258 M586 128 V258" />
        {['объект', ...generic.nodes.slice(1, 5)].map((node, index) => wrapSvgText(node, [133, 258, 394, 524, 616][index], 148, 'svg-label q-label', 10, 12))}
        {['S1', 'S2'].map((row, rowIndex) => (
          <g key={row}>
            <text className="svg-title small" x="133" y={194 + rowIndex * 40}>{row}</text>
            {[0.2, 0.8, 0.4, 0.6].map((value, colIndex) => (
              <text className={rowIndex === 0 && colIndex === 1 ? 'svg-value best' : 'svg-value'} x={[258, 394, 524, 616][colIndex]} y={194 + rowIndex * 40} key={`${row}-${colIndex}`}>
                {rowIndex === 1 && colIndex === 3 ? '0.9' : value}
              </text>
            ))}
          </g>
        ))}
      </svg>
    );
  }

  if (generic.layout === 'network') {
    const layers = [[130, [142, 184, 226]], [330, [126, 168, 210, 252]], [548, [146, 196, 246]]];
    return (
      <svg viewBox="0 0 720 300" role="img">
        <title>{generic.title}</title>
        {header}
        {layers[0][1].flatMap((y1) => layers[1][1].map((y2) => <line className="svg-connection strong" x1="130" y1={y1} x2="330" y2={y2} key={`${y1}-${y2}`} />))}
        {layers[1][1].flatMap((y1) => layers[2][1].map((y2) => <line className="svg-connection strong" x1="330" y1={y1} x2="548" y2={y2} key={`${y1}-${y2}`} />))}
        {layers.map(([x, ys]) => ys.map((y) => <circle className="svg-dot active" cx={x} cy={y} r="14" key={`${x}-${y}`} />))}
        {generic.nodes.slice(0, 4).map((node, index) => wrapSvgText(node, [130, 250, 410, 548][index], 278, 'svg-note', 14, 14))}
      </svg>
    );
  }

  if (generic.layout === 'compare') {
    const width = generic.nodes.length === 2 ? 250 : 180;
    const start = generic.nodes.length === 2 ? 100 : 70;
    return (
      <svg viewBox="0 0 720 300" role="img">
        <title>{generic.title}</title>
        {header}
        {generic.nodes.map((node, index) => (
          <g key={node} transform={`translate(${start + index * (width + 28)} 142)`}>
            <rect className={index === 1 ? 'svg-card active' : 'svg-card'} width={width} height="124" rx="10" />
            <circle className={index === 1 ? 'svg-dot active' : 'svg-dot'} cx={width / 2} cy="28" r="12" />
            {wrapSvgText(node, width / 2, 58, 'svg-note compact', 16, 14)}
          </g>
        ))}
      </svg>
    );
  }

  if (generic.layout === 'formula') {
    return (
      <svg viewBox="0 0 720 300" role="img">
        <title>{generic.title}</title>
        {header}
        <rect className="svg-formula-card" x="76" y="130" width="568" height="76" rx="12" />
        {wrapSvgText(generic.formula, 360, 158, 'svg-title small compact-title', 42, 17)}
        {generic.nodes.slice(0, 4).map((node, index) => {
          const x = 130 + index * 154;
          return (
            <g key={node}>
              <line className="svg-line muted thin" x1={x} y1="208" x2={x} y2="222" />
              <rect className="svg-card" x={x - 62} y="222" width="124" height="50" rx="8" />
              {wrapSvgText(node, x, 244, 'svg-note compact', 12, 13)}
            </g>
          );
        })}
      </svg>
    );
  }

  if (generic.layout === 'timeline') {
    return (
      <svg viewBox="0 0 720 320" role="img">
        <title>{generic.title}</title>
        {marker}
        {header}
        {generic.nodes.map((node, index) => {
          const x = 56 + index * 128;
          const y = index % 2 ? 218 : 150;
          const nextX = 56 + (index + 1) * 128;
          const nextY = (index + 1) % 2 ? 218 : 150;
          return (
            <g key={node}>
              {index < generic.nodes.length - 1 && (
                <path className="svg-arrow thin" d={`M${x + 112} ${y + 24} C${x + 128} ${y + 24} ${nextX - 18} ${nextY + 24} ${nextX} ${nextY + 24}`} markerEnd={`url(#${arrowId})`} />
              )}
              <rect className={index === generic.nodes.length - 1 ? 'svg-card active' : 'svg-card'} x={x} y={y} width="112" height="54" rx="8" />
              <circle className="svg-dot active small" cx={x + 18} cy={y + 18} r="10" />
              <text className="svg-step-number small" x={x + 18} y={y + 22}>{index + 1}</text>
              {wrapSvgText(node, x + 62, y + 26, 'svg-note compact', 11, 12)}
            </g>
          );
        })}
      </svg>
    );
  }

  if (generic.layout === 'gridworld') {
    return (
      <svg viewBox="0 0 720 300" role="img">
        <title>{generic.title}</title>
        {header}
        <rect className="svg-card" x="110" y="132" width="500" height="104" rx="8" />
        {[0, 1, 2, 3, 4, 5, 6].map((index) => <line className="svg-grid" x1={110 + index * 71.4} y1="132" x2={110 + index * 71.4} y2="236" key={index} />)}
        {[0, 1, 2].map((index) => <line className="svg-grid" x1="110" y1={132 + index * 52} x2="610" y2={132 + index * 52} key={index} />)}
        <rect className="svg-danger" x="182" y="184" width="286" height="52" />
        <circle className="svg-dot active" cx="146" cy="210" r="15" />
        <rect className="svg-card active" x="540" y="190" width="44" height="32" rx="6" />
        <path className="svg-line muted thin" d="M146 158 C270 118 430 118 562 158" />
        <path className="svg-line thin" d="M146 210 H560" />
        <text className="svg-note" x="146" y="260">старт</text>
        <text className="svg-note" x="324" y="260">обрыв</text>
        <text className="svg-note" x="562" y="260">цель</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 720 300" role="img">
      <title>{generic.title}</title>
      {marker}
      {header}
      {generic.nodes.map((node, index) => {
        const x = 96 + index * (528 / Math.max(generic.nodes.length - 1, 1));
        const nextX = 96 + (index + 1) * (528 / Math.max(generic.nodes.length - 1, 1));
        return (
          <g key={node}>
            {index < generic.nodes.length - 1 && (
              <path className="svg-arrow thin" d={`M${x + 22} 194 H${nextX - 22}`} markerEnd={`url(#${arrowId})`} />
            )}
            <circle className={index === generic.nodes.length - 1 ? 'svg-dot active' : 'svg-dot'} cx={x} cy="194" r="15" />
            <rect className="svg-card" x={x - 66} y="216" width="132" height="54" rx="8" />
            {wrapSvgText(node, x, 238, 'svg-note compact', 12, 13)}
          </g>
        );
      })}
    </svg>
  );
}

const introIllustrationTypes = new Set(['rl-cycle', 'gamma-chart', 'learning-comparison', 'exploration-chart', 'q-table', 'rl-applications']);

function IntroIllustration({ type }) {
  if (type === 'rl-cycle') {
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>Основные понятия RL</title>
          <defs>
            <marker id="intro-cycle-arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4.3" refY="2">
              <path d="M0,0 L4.6,2 L0,4 Z" />
            </marker>
          </defs>
          <rect className="svg-card active" x="52" y="58" width="166" height="82" rx="10" />
          <text className="svg-title small" x="135" y="94">Агент</text>
          <text className="svg-note compact" x="135" y="118">выбирает действие</text>
          <rect className="svg-card" x="502" y="58" width="166" height="82" rx="10" />
          <text className="svg-title small" x="585" y="94">Среда</text>
          <text className="svg-note compact" x="585" y="118">отвечает состоянием</text>
          <rect className="svg-card" x="260" y="220" width="200" height="78" rx="10" />
          <text className="svg-title small" x="360" y="252">Состояние S</text>
          <text className="svg-note compact" x="360" y="276">описание ситуации</text>
          <path className="svg-arrow" d="M222 88 C310 44 408 44 496 88" markerEnd="url(#intro-cycle-arrow)" />
          <text className="svg-label" x="360" y="48">действие A</text>
          <path className="svg-arrow soft" d="M588 146 C576 232 500 272 466 264" markerEnd="url(#intro-cycle-arrow)" />
          <text className="svg-label muted" x="592" y="224">S′</text>
          <path className="svg-arrow soft" d="M254 264 C182 258 132 210 134 148" markerEnd="url(#intro-cycle-arrow)" />
          <text className="svg-label muted" x="132" y="224">награда R</text>
          <rect className="svg-formula-card" x="238" y="128" width="244" height="52" rx="10" />
          <text className="svg-note" x="360" y="160">опыт = действие + обратная связь</text>
        </svg>
      </div>
    );
  }

  if (type === 'gamma-chart') {
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>Дисконтированный возврат</title>
          <rect className="svg-card active" x="58" y="42" width="604" height="64" rx="12" />
          <text className="svg-title small" x="360" y="76">G = R₀ + γR₁ + γ²R₂ + γ³R₃ ...</text>
          <line className="svg-axis" x1="92" y1="238" x2="632" y2="238" />
          {[0, 1, 2, 3, 4].map((step) => (
            <g key={step}>
              <line className="svg-grid" x1={112 + step * 122} y1="136" x2={112 + step * 122} y2="246" />
              <circle className={step < 2 ? 'svg-dot active' : 'svg-dot'} cx={112 + step * 122} cy={238 - step * 18} r="14" />
              <text className="svg-step-number small" x={112 + step * 122} y={242 - step * 18}>{step}</text>
              <text className="svg-note compact" x={112 + step * 122} y="268">t+{step}</text>
            </g>
          ))}
          <path className="svg-line muted thin" d="M112 238 L234 220 L356 202 L478 184 L600 166" />
          <path className="svg-line thin" d="M112 156 C230 166 352 198 600 226" />
          <text className="svg-label" x="548" y="154">γ ≈ 1</text>
          <text className="svg-label muted" x="542" y="218">γ ≈ 0</text>
          <text className="svg-note" x="360" y="316">чем больше γ, тем сильнее учитываются будущие награды</text>
        </svg>
      </div>
    );
  }

  if (type === 'learning-comparison') {
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>Отличие RL от других методов</title>
          <g transform="translate(54 64)">
            <rect className="svg-card" width="178" height="190" rx="10" />
            <text className="svg-title small" x="89" y="38">С учителем</text>
            <line className="svg-grid" x1="30" y1="72" x2="148" y2="72" />
            <text className="svg-note compact" x="89" y="104">есть правильный ответ</text>
            <text className="svg-note compact" x="89" y="134">ошибка считается сразу</text>
          </g>
          <g transform="translate(271 64)">
            <rect className="svg-card" width="178" height="190" rx="10" />
            <text className="svg-title small" x="89" y="38">Без учителя</text>
            <circle className="svg-dot" cx="58" cy="96" r="12" />
            <circle className="svg-dot" cx="92" cy="118" r="12" />
            <circle className="svg-dot" cx="124" cy="92" r="12" />
            <text className="svg-note compact" x="89" y="154">ищет структуру данных</text>
          </g>
          <g transform="translate(488 64)">
            <rect className="svg-card active" width="178" height="190" rx="10" />
            <text className="svg-title small" x="89" y="38">RL</text>
            <path className="svg-arrow thin" d="M42 92 H126" markerEnd="url(#intro-compare-arrow)" />
            <circle className="svg-dot active" cx="42" cy="92" r="13" />
            <rect className="svg-card" x="104" y="72" width="44" height="40" rx="8" />
            <text className="svg-note compact" x="89" y="154">есть награда, но нет ответа</text>
          </g>
          <defs>
            <marker id="intro-compare-arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4.3" refY="2">
              <path d="M0,0 L4.6,2 L0,4 Z" />
            </marker>
          </defs>
          <text className="svg-note" x="360" y="306">главное отличие RL: обучение через взаимодействие и последствия действий</text>
        </svg>
      </div>
    );
  }

  if (type === 'exploration-chart') {
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>Исследование и использование</title>
          <defs>
            <marker id="intro-explore-arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4.3" refY="2">
              <path d="M0,0 L4.6,2 L0,4 Z" />
            </marker>
          </defs>
          <rect className="svg-card" x="70" y="64" width="218" height="116" rx="10" />
          <text className="svg-title small" x="179" y="100">Исследование</text>
          <text className="svg-note compact" x="179" y="130">пробовать новые действия</text>
          <text className="svg-note compact" x="179" y="152">риск сейчас, знания потом</text>
          <rect className="svg-card active" x="432" y="64" width="218" height="116" rx="10" />
          <text className="svg-title small" x="541" y="100">Использование</text>
          <text className="svg-note compact" x="541" y="130">выбирать лучшее известное</text>
          <text className="svg-note compact" x="541" y="152">награда сейчас</text>
          <path className="svg-arrow" d="M296 122 C342 82 380 82 424 122" markerEnd="url(#intro-explore-arrow)" />
          <path className="svg-arrow soft" d="M424 156 C380 210 342 210 296 156" markerEnd="url(#intro-explore-arrow)" />
          <rect className="svg-formula-card" x="194" y="230" width="332" height="62" rx="12" />
          <text className="svg-title small" x="360" y="256">ε-greedy</text>
          <text className="svg-note compact" x="360" y="278">с вероятностью ε пробуем, иначе используем лучшее</text>
        </svg>
      </div>
    );
  }

  if (type === 'q-table') {
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>Стратегия и функции ценности</title>
          <defs>
            <marker id="intro-policy-arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4.3" refY="2">
              <path d="M0,0 L4.6,2 L0,4 Z" />
            </marker>
          </defs>
          <rect className="svg-card" x="52" y="66" width="166" height="78" rx="10" />
          <text className="svg-title small" x="135" y="98">Состояние s</text>
          <text className="svg-note compact" x="135" y="122">что видит агент</text>
          <rect className="svg-card active" x="277" y="66" width="166" height="78" rx="10" />
          <text className="svg-title small" x="360" y="98">Policy π</text>
          <text className="svg-note compact" x="360" y="122">правило выбора</text>
          <rect className="svg-card" x="502" y="66" width="166" height="78" rx="10" />
          <text className="svg-title small" x="585" y="98">Действие a</text>
          <text className="svg-note compact" x="585" y="122">шаг агента</text>
          <path className="svg-arrow thin" d="M222 106 H270" markerEnd="url(#intro-policy-arrow)" />
          <path className="svg-arrow thin" d="M447 106 H495" markerEnd="url(#intro-policy-arrow)" />
          <rect className="svg-card" x="70" y="214" width="250" height="74" rx="10" />
          <text className="svg-title small" x="195" y="244">V(s)</text>
          <text className="svg-note compact" x="195" y="266">насколько хорошее состояние</text>
          <rect className="svg-card active" x="400" y="214" width="250" height="74" rx="10" />
          <text className="svg-title small" x="525" y="244">Q(s, a)</text>
          <text className="svg-note compact" x="525" y="266">насколько хорош выбор действия</text>
          <path className="svg-line muted thin" d="M195 154 V208" />
          <path className="svg-line thin" d="M525 154 V208" />
        </svg>
      </div>
    );
  }

  if (type === 'rl-applications') {
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>Применения RL</title>
          <rect className="svg-formula-card" x="266" y="124" width="188" height="84" rx="14" />
          <text className="svg-title small" x="360" y="156">RL-агент</text>
          <text className="svg-note compact" x="360" y="180">учится по награде</text>
          {[
            ['Игры', 'M266 146 C250 122 250 100 238 88'],
            ['Роботы', 'M454 146 C470 122 470 100 494 88'],
            ['Автопилот', 'M300 208 C276 236 250 268 226 282'],
            ['Финансы', 'M360 208 C360 226 356 240 354 256'],
            ['Энергетика', 'M420 208 C444 236 470 268 494 282'],
          ].map(([title, path]) => (
            <g key={`${title}-line`}>
              <path className="svg-line muted thin" d={path} />
            </g>
          ))}
          {[
            ['Игры', 98, 52, 'победа'],
            ['Роботы', 494, 52, 'устойчивость'],
            ['Автопилот', 86, 246, 'безопасность'],
            ['Финансы', 284, 256, 'доходность'],
            ['Энергетика', 494, 246, 'экономия'],
          ].map(([title, x, y, reward]) => (
            <g key={title}>
              <rect className="svg-card" x={x} y={y} width="140" height="72" rx="10" />
              <text className="svg-title small" x={x + 70} y={y + 30}>{title}</text>
              <text className="svg-note compact" x={x + 70} y={y + 52}>награда: {reward}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  return null;
}

function DistinctIllustration({ type, generic }) {
  const arrowId = `distinct-arrow-${type}`;
  const marker = (
    <defs>
      <marker id={arrowId} markerHeight="5" markerWidth="5" orient="auto" refX="4.3" refY="2">
        <path d="M0,0 L4.6,2 L0,4 Z" />
      </marker>
    </defs>
  );
  const title = (
    <>
      <rect className="svg-card active" x="58" y="34" width="604" height="58" rx="12" />
      <text className="svg-title small" x="360" y="68">{generic.title}</text>
    </>
  );

  if (type === 'mdp-elements') {
    const cells = [
      ['S', 'состояния', 70, 150],
      ['A', 'действия', 210, 150],
      ['P', 'переходы', 350, 150],
      ['R', 'награды', 490, 150],
    ];
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>{generic.title}</title>
          {marker}
          {title}
          <rect className="svg-formula-card" x="268" y="244" width="184" height="56" rx="12" />
          <text className="svg-title small" x="360" y="278">MDP = S, A, P, R</text>
          {cells.map(([letter, label, x, y]) => (
            <g key={letter}>
              <path className="svg-line muted thin" d={`M360 244 C360 214 ${x + 60} 214 ${x + 60} ${y + 70}`} />
              <rect className="svg-card" x={x} y={y} width="120" height="70" rx="10" />
              <text className="svg-title small" x={x + 60} y={y + 30}>{letter}</text>
              <text className="svg-note compact" x={x + 60} y={y + 52}>{label}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  if (type === 'bellman' || type === 'td-learning' || type === 'value-iteration' || type === 'q-learning-update' || type === 'advantage' || type === 'policy-gradient') {
    const blocks = generic.nodes.slice(0, 4);
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>{generic.title}</title>
          {marker}
          {title}
          <rect className="svg-formula-card" x="88" y="122" width="544" height="66" rx="12" />
          {wrapSvgText(generic.formula, 360, 154, 'svg-title small compact-title', 42, 16)}
          {blocks.map((node, index) => {
            const x = 78 + index * 156;
            return (
              <g key={node}>
                <path className="svg-line muted thin" d={`M${x + 66} 188 V222`} />
                <rect className={index === blocks.length - 1 ? 'svg-card active' : 'svg-card'} x={x} y="222" width="132" height="68" rx="10" />
                <circle className="svg-dot active small" cx={x + 22} cy="244" r="11" />
                <text className="svg-step-number small" x={x + 22} y="248">{index + 1}</text>
                {wrapSvgText(node, x + 76, 250, 'svg-note compact', 12, 12)}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (type === 'dqn-network') {
    const layers = [
      { x: 110, ys: [152, 196, 240], label: 'состояние' },
      { x: 306, ys: [132, 174, 216, 258], label: 'скрытые слои' },
      { x: 520, ys: [146, 196, 246], label: 'Q-значения' },
    ];
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>{generic.title}</title>
          {title}
          {layers[0].ys.flatMap((y1) => layers[1].ys.map((y2) => <line className="svg-connection strong" x1="124" y1={y1} x2="292" y2={y2} key={`${y1}-${y2}`} />))}
          {layers[1].ys.flatMap((y1) => layers[2].ys.map((y2) => <line className="svg-connection strong" x1="320" y1={y1} x2="506" y2={y2} key={`${y1}-${y2}`} />))}
          {layers.map((layer) => (
            <g key={layer.label}>
              {layer.ys.map((y) => <circle className="svg-dot active" cx={layer.x} cy={y} r="14" key={y} />)}
              <text className="svg-note" x={layer.x} y="304">{layer.label}</text>
            </g>
          ))}
          <rect className="svg-card active" x="570" y="176" width="88" height="40" rx="8" />
          <text className="svg-note compact" x="614" y="200">argmax</text>
        </svg>
      </div>
    );
  }

  if (type === 'cliff-walking') {
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>{generic.title}</title>
          {title}
          <rect className="svg-card" x="92" y="138" width="536" height="132" rx="10" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => <line className="svg-grid" x1={92 + index * 76.5} y1="138" x2={92 + index * 76.5} y2="270" key={index} />)}
          {[0, 1, 2].map((index) => <line className="svg-grid" x1="92" y1={138 + index * 66} x2="628" y2={138 + index * 66} key={index} />)}
          <rect className="svg-danger" x="168" y="204" width="306" height="66" />
          <path className="svg-line muted thin" d="M128 171 C260 110 450 112 586 171" />
          <path className="svg-line thin" d="M128 237 H584" />
          <circle className="svg-dot active" cx="128" cy="237" r="14" />
          <rect className="svg-card active" x="560" y="220" width="48" height="34" rx="7" />
          <text className="svg-note compact" x="128" y="304">старт</text>
          <text className="svg-note compact" x="322" y="304">обрыв</text>
          <text className="svg-note compact" x="584" y="304">цель</text>
        </svg>
      </div>
    );
  }

  if (type === 'value-functions' || type === 'model-types' || type === 'q-parameters' || type === 'sarsa-vs-q' || type === 'dqn-improvements' || type === 'a2c-ppo') {
    const cards = generic.nodes.slice(0, 3);
    return (
      <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
        <svg viewBox="0 0 720 360" role="img">
          <title>{generic.title}</title>
          {title}
          {cards.map((node, index) => {
            const x = 70 + index * 204;
            return (
              <g key={node}>
                <rect className={index === 1 ? 'svg-card active' : 'svg-card'} x={x} y="146" width="174" height="116" rx="10" />
                <circle className={index === 1 ? 'svg-dot active' : 'svg-dot'} cx={x + 87} cy="178" r="14" />
                {wrapSvgText(node, x + 87, 218, 'svg-note compact', 16, 13)}
              </g>
            );
          })}
          <text className="svg-note" x="360" y="306">{generic.formula}</text>
        </svg>
      </div>
    );
  }

  const steps = generic.nodes.slice(0, 5);
  return (
    <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
      <svg viewBox="0 0 720 360" role="img">
        <title>{generic.title}</title>
        {marker}
        {title}
        {steps.map((node, index) => {
          const x = 56 + index * 128;
          const y = index % 2 ? 226 : 146;
          const nextX = 56 + (index + 1) * 128;
          const nextY = (index + 1) % 2 ? 226 : 146;
          return (
            <g key={node}>
              {index < steps.length - 1 && (
                <path className="svg-arrow thin" d={`M${x + 112} ${y + 27} C${x + 132} ${y + 27} ${nextX - 18} ${nextY + 27} ${nextX} ${nextY + 27}`} markerEnd={`url(#${arrowId})`} />
              )}
              <rect className={index === steps.length - 1 ? 'svg-card active' : 'svg-card'} x={x} y={y} width="112" height="58" rx="9" />
              <circle className="svg-dot active small" cx={x + 18} cy={y + 19} r="10" />
              <text className="svg-step-number small" x={x + 18} y={y + 23}>{index + 1}</text>
              {wrapSvgText(node, x + 64, y + 29, 'svg-note compact', 11, 12)}
            </g>
          );
        })}
        <text className="svg-note compact" x="360" y="318">{generic.formula}</text>
      </svg>
    </div>
  );
}

function LearningIllustration({ type }) {
  if (!type) return null;
  if (introIllustrationTypes.has(type)) return <IntroIllustration type={type} />;
  const generic = illustrationCatalog[type];
  if (generic) return <DistinctIllustration type={type} generic={generic} />;

  return (
    <div className="learning-illustration" aria-label="Иллюстрация к подтеме">
      {type === 'rl-cycle' && (
        <svg viewBox="0 0 720 300" role="img">
          <title>Цикл обучения с подкреплением</title>
          <defs>
            <marker id="arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4.4" refY="2">
              <path d="M0,0 L4.6,2 L0,4 Z" />
            </marker>
          </defs>
          <rect className="svg-card" x="38" y="86" width="170" height="90" rx="12" />
          <rect className="svg-card" x="512" y="86" width="170" height="90" rx="12" />
          <text className="svg-title" x="123" y="126">Агент</text>
          <text className="svg-title" x="597" y="126">Среда</text>
          <path className="svg-arrow" d="M214 118 C314 68 408 68 506 118" markerEnd="url(#arrow)" />
          <path className="svg-arrow" d="M506 148 C408 210 314 210 214 148" markerEnd="url(#arrow)" />
          <path className="svg-arrow soft" d="M128 84 C160 46 558 46 590 84" markerEnd="url(#arrow)" />
          <text className="svg-note" x="328" y="52">S<tspan baselineShift="sub">t+1</tspan>, R<tspan baselineShift="sub">t</tspan></text>
          <text className="svg-note" x="336" y="88">A<tspan baselineShift="sub">t</tspan></text>
          <text className="svg-note" x="302" y="232">новое состояние и награда</text>
        </svg>
      )}
      {type === 'gamma-chart' && (
        <svg viewBox="0 0 720 300" role="img">
          <title>Влияние коэффициента дисконтирования</title>
          <line className="svg-axis" x1="118" y1="238" x2="640" y2="238" />
          <line className="svg-axis" x1="118" y1="238" x2="118" y2="54" />
          <path className="svg-line muted" d="M126 206 L225 206 L324 206 L423 206 L522 206 L625 206" />
          <path className="svg-line" d="M126 210 C205 186 270 151 340 126 S500 76 625 62" />
          <text className="svg-note" x="130" y="268">время</text>
          <text className="svg-note axis-title" x="190" y="42">учет награды</text>
          <text className="svg-label" x="520" y="70">γ = 0.9</text>
          <text className="svg-label muted" x="520" y="198">γ = 0</text>
        </svg>
      )}
      {type === 'learning-comparison' && (
        <svg viewBox="0 0 720 300" role="img">
          <title>Сравнение типов обучения</title>
          {['С учителем', 'Без учителя', 'RL'].map((label, index) => (
            <g key={label} transform={`translate(${70 + index * 210} 72)`}>
              <rect className={index === 2 ? 'svg-card active' : 'svg-card'} width="170" height="130" rx="12" />
              <text className="svg-title" x="85" y="42">{label}</text>
              <text className="svg-note" x="85" y="82">{index === 0 ? 'правильные ответы' : index === 1 ? 'нет меток' : 'сигнал награды'}</text>
              <circle className={index === 2 ? 'svg-dot active' : 'svg-dot'} cx="85" cy="108" r="12" />
            </g>
          ))}
        </svg>
      )}
      {type === 'exploration-chart' && (
        <svg viewBox="0 0 720 300" role="img">
          <title>Исследование и использование</title>
          <line className="svg-axis" x1="118" y1="238" x2="640" y2="238" />
          <line className="svg-axis" x1="118" y1="238" x2="118" y2="54" />
          <path className="svg-line" d="M128 218 C200 142 260 124 342 132 S505 100 626 78" />
          <path className="svg-line muted" d="M128 210 C202 198 280 176 352 144 S492 84 626 104" />
          <text className="svg-label" x="458" y="74">exploration</text>
          <text className="svg-label muted" x="458" y="126">exploitation</text>
          <text className="svg-note" x="130" y="268">время</text>
          <text className="svg-note axis-title" x="162" y="42">награда</text>
        </svg>
      )}
      {type === 'q-table' && (
        <svg viewBox="0 0 720 300" role="img">
          <title>Таблица Q-values</title>
          <rect className="svg-card" x="38" y="54" width="644" height="190" rx="12" />
          {['Состояние', 'Вверх', 'Вниз', 'Влево', 'Вправо'].map((label, index) => (
            <text className="svg-label q-label" x={[114, 256, 374, 492, 610][index]} y="94" key={label}>{label}</text>
          ))}
          {['S1', 'S2', 'S3'].map((label, row) => (
            <g key={label}>
              <text className="svg-title small" x="114" y={138 + row * 44}>{label}</text>
              {[0.2, 0.8, 0.1, 0.5].map((value, col) => (
                <text className={value === 0.8 || value === 0.9 ? 'svg-value best' : 'svg-value'} x={[256, 374, 492, 610][col]} y={138 + row * 44} key={`${label}-${col}`}>
                  {row === 1 && col === 3 ? '0.9' : value}
                </text>
              ))}
            </g>
          ))}
          <path className="svg-grid" d="M38 110 H682 M38 154 H682 M38 198 H682 M190 54 V244 M318 54 V244 M434 54 V244 M550 54 V244" />
        </svg>
      )}
      {type === 'rl-applications' && (
        <svg viewBox="0 0 720 300" role="img">
          <title>Применения обучения с подкреплением</title>
          {[
            ['Игры', '🎮'],
            ['Роботы', '🤖'],
            ['Автопилот', '🚗'],
            ['Финансы', '₽'],
            ['Энергетика', '⚡'],
          ].map(([label, icon], index) => (
            <g key={label} transform={`translate(${58 + index * 126} 82)`}>
              <rect className="svg-card" width="104" height="118" rx="12" />
              <text className="svg-icon" x="52" y="54">{icon}</text>
              <text className="svg-note" x="52" y="88">{label}</text>
            </g>
          ))}
        </svg>
      )}
      {generic && <GenericIllustration type={type} generic={generic} />}
    </div>
  );
}

function CodeExercise({ exercise, onComplete }) {
  const [code, setCode] = useState(exercise.initialCode);
  const [status, setStatus] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const lineNumbers = code.split('\n').map((_, index) => index + 1);

  useEffect(() => {
    setCode(exercise.initialCode);
    setStatus(null);
    setRunResult(null);
  }, [exercise]);

  const runCode = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const payload = await apiRequest('/run-python', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setRunResult(payload);
    } catch (error) {
      setRunResult({ stdout: '', stderr: error.message, exitCode: 1 });
    } finally {
      setIsRunning(false);
    }
  };

  const checkCode = () => {
    try {
      if (!/def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(code)) {
        setStatus({ kind: 'warning', text: 'Функция Python не найдена. Проверьте строку с def.' });
        return;
      }

      if (exercise.validateCode?.(code.replace(/\r/g, ''))) {
        setStatus({ kind: 'success', text: 'Код работает правильно. Практическое задание зачтено.' });
        onComplete?.();
      } else {
        setStatus({ kind: 'warning', text: `Пока неверно. Подсказка: ${exercise.hint}` });
      }
    } catch (error) {
      setStatus({ kind: 'warning', text: `В коде ошибка: ${error.message}` });
    }
  };

  return (
    <div className="code-exercise">
      <div>
        <span className="eyebrow">Практика по теме</span>
        <h3>{exercise.title}</h3>
        <p>{exercise.task}</p>
      </div>
      <div className="code-guide">
        <h4>Как выполнить</h4>
        <ol>
          {(exercise.guide ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
      <div className="code-editor-shell">
        <div className="code-editor-header">
          <span>exercise.py</span>
          <span>Python</span>
        </div>
        <div className="code-editor-body">
          <div className="code-line-numbers" aria-hidden="true">
            {lineNumbers.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <textarea
            aria-label="Редактор кода"
            spellCheck="false"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
      </div>
      <div className="code-exercise-actions">
        <button className="secondary" onClick={() => setCode(exercise.initialCode)}>Сбросить</button>
        <button className="secondary" onClick={runCode} disabled={isRunning}>
          {isRunning ? 'Выполняется...' : 'Запустить код'}
        </button>
        <button className="primary" onClick={checkCode}>
          <ClipboardCheck size={18} />
          Проверить код
        </button>
      </div>
      {runResult && (
        <div className="code-output">
          <div>
            <span>Вывод программы</span>
            <strong>exit code: {runResult.exitCode ?? 0}</strong>
          </div>
          <pre>{runResult.stdout || runResult.stderr ? `${runResult.stdout ?? ''}${runResult.stderr ? `\n${runResult.stderr}` : ''}` : 'Программа ничего не вывела.'}</pre>
        </div>
      )}
      {status && <p className={`result-message ${status.kind}`}>{status.text}</p>}
    </div>
  );
}

function TopicPage({
  activeSubtopic,
  activeTest,
  activeTopic,
  markSubtopicComplete,
  openArticle,
  openNextLesson,
  openTopic,
  progress,
  recommendations,
  setActiveSubtopicId,
  student,
  submitTest,
  testResults,
}) {
  const [selected, setSelected] = useState({});
  const [result, setResult] = useState(null);
  const [retryMode, setRetryMode] = useState(false);
  const adaptiveRecommendation = recommendations.find((item) => item.kind === 'ontology') ?? recommendations[0];
  const codeExercise = codeExercises[activeSubtopic?.id];
  const canCompleteManually = !codeExercise && !(activeTest?.questions?.length > 0);
  const savedTestResult = (testResults ?? []).find((item) => item.subtopicId === activeSubtopic?.id);
  const hasSubmittedTest = !codeExercise && !retryMode && Boolean(result?.attempted || savedTestResult);

  useEffect(() => {
    setRetryMode(false);
    const saved = readJson(testResultStorageKey(student?.id, activeSubtopic?.id), null);
    const latest = (testResults ?? []).find((item) => item.subtopicId === activeSubtopic?.id);
    if (latest) {
      setSelected(latest.selectedAnswers ?? {});
      setResult({
        kind: latest.passed ? 'success' : 'warning',
        text: latest.passed
          ? `Тест пройден: ${latest.score}%. Повторное прохождение недоступно.`
          : `Последний результат теста: ${latest.score}%. Можно пройти тест еще раз.`,
        score: latest.score,
        passed: latest.passed,
        attempted: true,
        recommendations: saved?.recommendations ?? [],
      });
    } else {
      setSelected(saved?.selectedAnswers ?? {});
      setResult(saved);
    }
  }, [activeSubtopic?.id, student?.id, testResults]);

  const handleSubmitTest = async () => {
    const questions = activeTest?.questions ?? [];
    const answered = questions.filter((question) => selected[question.id] !== undefined).length;
    if (answered !== questions.length) {
      setResult({ kind: 'warning', text: 'Ответьте на все вопросы теста.' });
      return;
    }

    const payload = await submitTest(selected);
    if (payload?.error) {
      setResult({ kind: 'warning', text: payload.error });
      return;
    }

    const nextResult = {
      kind: payload.passed ? 'success' : 'warning',
      text: payload.passed
        ? `Тест пройден: ${payload.score}%. Подтема засчитана.`
        : `Тест не пройден: ${payload.score}%. Рекомендуется повторить материал и пройти тест еще раз.`,
      score: payload.score,
      passed: payload.passed,
      attempted: true,
      selectedAnswers: selected,
      recommendations: payload.recommendations ?? [],
    };
    setResult(nextResult);
    setRetryMode(false);
    localStorage.setItem(testResultStorageKey(student?.id, activeSubtopic?.id), JSON.stringify(nextResult));
  };

  const handleRetryTest = () => {
    setSelected({});
    setResult(null);
    setRetryMode(true);
    localStorage.removeItem(testResultStorageKey(student?.id, activeSubtopic?.id));
  };

  return (
    <section className="lesson-layout">
      <article className="lesson">
        <span className="eyebrow">{activeTopic.level}</span>
        <h2>{activeTopic.title}</h2>
        <p className="lesson-lead">{activeTopic.description}</p>

        <div className="subtopic-tabs">
          {(activeTopic.subtopics ?? []).map((subtopic) => (
            <button
              className={activeSubtopic?.id === subtopic.id ? 'active' : ''}
              key={subtopic.id}
              onClick={() => setActiveSubtopicId(subtopic.id)}
            >
              {subtopic.title}
              {progress.subtopics?.[subtopic.id] && <CheckCircle2 size={15} />}
            </button>
          ))}
        </div>

        <div className="placeholder-block">
          <h3>{activeSubtopic?.title}</h3>
          {isBlank(activeSubtopic?.description) ? (
            <EmptyState text="Описание подтемы еще не добавлено." />
          ) : (
            <p>{activeSubtopic.description}</p>
          )}
        </div>

        <div className="placeholder-block">
          <h3>Теоретический материал подтемы</h3>
          {isBlank(activeSubtopic?.theory) ? (
            <EmptyState text="Материал подтемы еще не добавлен. Его можно заполнить через админ-панель." />
          ) : (
            <>
              <p className="theory-text">{activeSubtopic.theory}</p>
              <LearningIllustration type={activeSubtopic?.illustrationKey} />
            </>
          )}
        </div>

        {codeExercise ? (
          <CodeExercise exercise={codeExercise} onComplete={markSubtopicComplete} />
        ) : (
          <div className="question">
          <h3>Тест по подтеме</h3>
          {(activeTest?.questions ?? []).map((question, questionIndex) => (
            <div className="test-question" key={question.id}>
              <h4>{question.question || `Вопрос ${questionIndex + 1}`}</h4>
              {isBlank(question.question) && <EmptyState text="Текст вопроса еще не добавлен." />}
              <div className="options">
                {question.options.filter((option) => !isBlank(option.text)).map((option, optionIndex) => (
                  <label key={option.id}>
                    <input
                      type="radio"
                      name={String(question.id)}
                      checked={String(selected[question.id]) === String(option.id)}
                      aria-disabled={hasSubmittedTest}
                      onChange={() => {
                        if (!hasSubmittedTest) {
                          setSelected({ ...selected, [question.id]: String(option.id) });
                        }
                      }}
                    />
                    <span>{option.text || `Вариант ответа ${optionIndex + 1}`}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          </div>
        )}

        <div className="actions">
          {canCompleteManually && (
          <button className="primary" onClick={markSubtopicComplete}>
            <CheckCircle2 size={18} />
            Отметить подтему изученной
          </button>
          )}
          {!codeExercise && !hasSubmittedTest && (
          <button className="secondary" onClick={handleSubmitTest}>
            <ClipboardCheck size={18} />
            Проверить тест
          </button>
          )}
          {!codeExercise && hasSubmittedTest && (
            <button className="secondary" onClick={handleRetryTest}>
              Пройти тест еще раз
            </button>
          )}
          <button className="primary" onClick={openNextLesson}>
            Следующая тема
          </button>
        </div>
        {result && <p className={`result-message ${result.kind}`}>{result.text}</p>}
        {result?.recommendations?.length > 0 && (
          <div className="post-test-panel">
            <span className="eyebrow">После теста</span>
            <h3>Статья и рекомендации</h3>
            <Recommendations
              recommendations={result.recommendations}
              openArticle={openArticle}
              openTopic={openTopic}
            />
          </div>
        )}
      </article>

      <aside className="recommendation">
        <LayoutDashboard size={22} />
        <h3>Прогресс темы</h3>
        <p>Подтем изучено: {progress.topics?.[activeTopic.id]?.completed ?? 0} из {activeTopic.subtopics?.length ?? 0}.</p>
        {false && adaptiveRecommendation && (
          <div className="ontology-tip">
            <span>Онтология</span>
            <h4>{adaptiveRecommendation.title}</h4>
            <p>{adaptiveRecommendation.text}</p>
            {adaptiveRecommendation.topicId && (
              <div className="card-actions">
                <button className="secondary compact" onClick={() => openTopic(adaptiveRecommendation.topicId, adaptiveRecommendation.subtopicId)}>
                  Подтема
                </button>
                <button className="secondary compact" onClick={() => openArticle(adaptiveRecommendation.topicId)}>
                  Статья
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </section>
  );
}

function buildExamQuestions(tests, topics) {
  const byTopic = new Map(topics.map((topic) => [topic.id, []]));
  const genericOptionPatterns = [
    'неверный вариант',
    'зависит только от интерфейса',
    'не относится к алгоритму',
  ];
  const isMeaningfulQuestion = (question) => {
    const options = question.options?.filter((option) => !isBlank(option.text)) ?? [];
    return options.length >= 3 && !options.some((option) => (
      genericOptionPatterns.some((pattern) => option.text.toLowerCase().includes(pattern))
    ));
  };

  for (const topic of topics) {
    for (const subtopic of topic.subtopics ?? []) {
      const test = tests[subtopic.id];
      for (const question of test?.questions ?? []) {
        if (!isBlank(question.question) && question.options?.some((option) => !isBlank(option.text))) {
          byTopic.get(topic.id)?.push({
            ...question,
            topicId: topic.id,
            topicTitle: topic.title,
            subtopicTitle: subtopic.title,
          });
        }
      }
    }
  }

  for (const topic of topics) {
    const questions = byTopic.get(topic.id) ?? [];
    questions.sort((left, right) => Number(isMeaningfulQuestion(right)) - Number(isMeaningfulQuestion(left)));
  }

  const selected = [];
  let offset = 0;
  while (selected.length < 30) {
    let added = false;
    for (const topic of topics) {
      const question = byTopic.get(topic.id)?.[offset];
      if (question && isMeaningfulQuestion(question)) {
        selected.push(question);
        added = true;
        if (selected.length === 30) break;
      }
    }
    if (!added) break;
    offset += 1;
  }

  if (selected.length < 30) {
    for (const topic of topics) {
      for (const question of byTopic.get(topic.id) ?? []) {
        if (!selected.some((item) => item.id === question.id)) {
          selected.push(question);
          if (selected.length === 30) break;
        }
      }
      if (selected.length === 30) break;
    }
  }

  return selected;
}

function buildExamOntologyRecommendations(questions, selected, topics) {
  const mistakesByTopic = new Map();

  for (const question of questions) {
    const answer = question.options.find((option) => String(option.id) === String(selected[question.id]));
    if (!answer?.isCorrect) {
      const current = mistakesByTopic.get(question.topicId) ?? {
        topicId: question.topicId,
        topicTitle: question.topicTitle,
        subtopicTitle: question.subtopicTitle,
        subtopicId: topics.find((topic) => topic.id === question.topicId)?.subtopics?.[0]?.id,
        count: 0,
      };
      current.count += 1;
      current.subtopicTitle = question.subtopicTitle;
      const topic = topics.find((item) => item.id === question.topicId);
      current.subtopicId = topic?.subtopics?.find((subtopic) => subtopic.title === question.subtopicTitle)?.id ?? current.subtopicId;
      mistakesByTopic.set(question.topicId, current);
    }
  }

  return [...mistakesByTopic.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      title: `Повторить тему: ${item.topicTitle}`,
      text: `Онтология экзамена нашла ${item.count} ошибок в этой теме. Рекомендуется вернуться к подтеме "${item.subtopicTitle}" и повторить связанные понятия.`,
    }));
}

function ExamPage({ examResult, openTopic, setExamResult, student, tests, topics }) {
  const questions = useMemo(() => buildExamQuestions(tests, topics), [tests, topics]);
  const [selected, setSelected] = useState({});
  const [result, setResult] = useState(examResult);
  const isSubmitted = Boolean(result);

  useEffect(() => {
    setSelected(examResult?.selectedAnswers ?? {});
    setResult(examResult ?? null);
  }, [questions.map((question) => question.id).join('-'), examResult]);

  const submitExam = () => {
    const answered = questions.filter((question) => selected[question.id] !== undefined).length;
    if (answered !== questions.length) {
      setResult({
        kind: 'warning',
        text: `Ответьте на все вопросы экзамена: выбрано ${answered} из ${questions.length}.`,
        incomplete: true,
      });
      return;
    }

    const correct = questions.filter((question) => {
      const answer = question.options.find((option) => String(option.id) === String(selected[question.id]));
      return answer?.isCorrect;
    }).length;
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const ontology = buildExamOntologyRecommendations(questions, selected, topics);

    const nextResult = {
      kind: score >= 70 ? 'success' : 'warning',
      text: score >= 70
        ? `Экзамен пройден: ${score}%. Правильных ответов: ${correct} из ${questions.length}.`
        : `Экзамен не пройден: ${score}%. Правильных ответов: ${correct} из ${questions.length}. Рекомендуется повторить темы и пройти экзамен еще раз.`,
      score,
      correct,
      total: questions.length,
      passed: score >= 70,
      incomplete: false,
      ontology,
      selectedAnswers: selected,
    };

    setResult(nextResult);
    const bestResult = !examResult || nextResult.score >= examResult.score ? nextResult : examResult;
    setExamResult(bestResult);
    localStorage.setItem(examResultStorageKey(student?.id), JSON.stringify(bestResult));
  };

  const retryExam = () => {
    setSelected({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="exam-page">
      <div className="exam-head">
        <span className="eyebrow">Итоговая проверка</span>
        <h2>Экзамен по курсу</h2>
        <p>Тест включает 30 вопросов по всем темам курса.</p>
        <div className="exam-stats">
          <strong>{questions.length}</strong>
          <span>вопросов</span>
          <strong>{topics.length}</strong>
          <span>тем</span>
          <strong>70%</strong>
          <span>порог прохождения</span>
        </div>
      </div>

      <div className="question exam-question-list">
        {questions.map((question, questionIndex) => (
          <div className="test-question" key={question.id}>
            <span className="exam-topic-label">{question.topicTitle} · {question.subtopicTitle}</span>
            <h4>{questionIndex + 1}. {question.question}</h4>
            <div className="options">
              {question.options.filter((option) => !isBlank(option.text)).map((option) => (
                <label key={option.id}>
                  <input
                    aria-disabled={isSubmitted && !result?.incomplete}
                    checked={String(selected[question.id]) === String(option.id)}
                    name={`exam-${question.id}`}
                    onChange={() => {
                      if (!isSubmitted || result?.incomplete) {
                        setSelected({ ...selected, [question.id]: String(option.id) });
                        if (result?.incomplete) setResult(null);
                      }
                    }}
                    type="radio"
                  />
                  <span>{option.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        {!isSubmitted || result?.incomplete ? (
          <button className="primary" onClick={submitExam}>
            <ClipboardCheck size={18} />
            Проверить экзамен
          </button>
        ) : (
          <button className="secondary" onClick={retryExam}>
            Пройти экзамен еще раз
          </button>
        )}
      </div>

      {result && <p className={`result-message ${result.kind}`}>{result.text}</p>}
      {result && !result.incomplete && (
        <div className="post-test-panel exam-ontology-panel">
          <span className="eyebrow">Онтология после экзамена</span>
          <h3>Рекомендации по повторению</h3>
          {result.ontology?.length > 0 ? (
            <div className="recommendation-list">
              {result.ontology.map((item) => (
              <article key={item.topicId}>
                <span className="ontology-badge">Связанная тема</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="card-actions">
                  <button className="secondary compact" onClick={() => openTopic(item.topicId, item.subtopicId)}>
                    Подтема
                  </button>
                </div>
              </article>
              ))}
            </div>
          ) : (
            <p className="result-message success">Ошибок нет: онтология не нашла тем для обязательного повторения.</p>
          )}
        </div>
      )}
    </section>
  );
}

function ArticlesPage({ activeArticle, articles, openArticle }) {
  const [expandedTopics, setExpandedTopics] = useState({});
  const groupedArticles = articles.reduce((groups, article) => {
    const key = article.topicId ?? article.topicTitle;
    if (!groups[key]) {
      groups[key] = { id: key, title: article.topicTitle, items: [] };
    }
    groups[key].items.push(article);
    return groups;
  }, {});

  useEffect(() => {
    if (!activeArticle?.topicId) return;
    setExpandedTopics((current) => ({ ...current, [activeArticle.topicId]: true }));
  }, [activeArticle?.topicId]);

  return (
    <section className="articles-layout">
      <aside className="article-list">
        {Object.values(groupedArticles).map((group) => {
          const isOpen = expandedTopics[group.id] ?? activeArticle?.topicId === group.id;
          return (
            <div className="article-topic-group" key={group.id}>
              <button className={isOpen ? 'article-topic-toggle active' : 'article-topic-toggle'} onClick={() => setExpandedTopics({ ...expandedTopics, [group.id]: !isOpen })}>
                <strong>{group.title}</strong>
                <ChevronDown className={isOpen ? 'rotated' : ''} size={16} />
              </button>
              {isOpen && (
                <div className="article-topic-items">
                  {group.items.map((article) => (
                    <button className={activeArticle?.id === article.id ? 'active' : ''} key={article.id} onClick={() => openArticle(article.id)}>
                      <span>{article.sources?.[0]?.sourceName ?? 'Источник'}</span>
                      <strong>{article.title}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      <article className="lesson article-reader">
        <span className="eyebrow">Статья</span>
        <h2>{activeArticle?.title}</h2>
        <p className="lesson-lead">{activeArticle?.description}</p>

        <div className="placeholder-block">
          <h3>Теория</h3>
          {isBlank(activeArticle?.theory) ? (
            <EmptyState text="Теоретический материал статьи еще не добавлен." />
          ) : (
            <div className="article-text">
              {activeArticle.theory.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>

        {activeArticle?.sources?.length > 0 && (
          <div className="article-sources">
            <h3>Источники</h3>
            <p>Материал статьи подготовлен на основе следующих источников:</p>
            <ol>
              {activeArticle.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                  <span>{source.description}</span>
                  <small>{source.sourceName}</small>
                </li>
              ))}
            </ol>
          </div>
        )}
      </article>
    </section>
  );
}

function Recommendations({ recommendations, openArticle, openTopic }) {
  return (
    <div className="recommendation-list">
      {recommendations.map((item, index) => {
        const articleTarget = item.articleId ?? item.topicId;

        return (
        <article key={`${item.title}-${index}`}>
          {item.kind === 'ontology' && <span className="ontology-badge">Онтология</span>}
          <h3>{item.title}</h3>
          <p>{item.text}</p>
          {(articleTarget || item.subtopicId) && (
            <div className="card-actions">
              {articleTarget && (
              <button className="secondary compact" onClick={() => openArticle(articleTarget)}>
                Статья
              </button>
              )}
              {item.subtopicId && (
              <button className="secondary compact" onClick={() => openTopic(item.topicId, item.subtopicId)}>
                Подтема
              </button>
              )}
            </div>
          )}
        </article>
        );
      })}
    </div>
  );
}

function ProgressPage({ completedSubtopics, examResult, openArticle, openExam, openTopic, progress, progressPercent, recommendations, subtopicTotal, testResults, topics }) {
  return (
    <section className="profile wide progress-page">
      <div>
        <span className="eyebrow">Отслеживание прогресса</span>
        <h2>Прогресс, история тестов и рекомендации</h2>
      </div>

      <div className="profile-stats">
        <div>
          <strong>{progressPercent}%</strong>
          <span>общий прогресс</span>
        </div>
        <div>
          <strong>{completedSubtopics}</strong>
          <span>подтем изучено</span>
        </div>
        <div>
          <strong>{subtopicTotal - completedSubtopics}</strong>
          <span>осталось</span>
        </div>
      </div>

      <div className="progress-grid">
        {topics.map((topic) => (
          <article className="progress-topic" key={topic.id}>
            <div>
              <h3>{topic.title}</h3>
              <strong>{progress.topics?.[topic.id]?.percent ?? 0}%</strong>
            </div>
            <div className="mini-progress light">
              <div style={{ width: `${progress.topics?.[topic.id]?.percent ?? 0}%` }} />
            </div>
            {(topic.subtopics ?? []).map((subtopic) => (
              <button key={subtopic.id} onClick={() => openTopic(topic.id, subtopic.id)}>
                <CheckCircle2 size={15} className={progress.subtopics?.[subtopic.id] ? 'done-icon' : ''} />
                {subtopic.title}
              </button>
            ))}
          </article>
        ))}
        <article className="progress-topic exam-progress-card">
          <div>
            <h3>Экзамен</h3>
            <strong>{examResult?.score ?? 0}%</strong>
          </div>
          <div className="mini-progress light">
            <div style={{ width: `${examResult?.score ?? 0}%` }} />
          </div>
          <button onClick={openExam ?? (() => {})}>
            <ClipboardCheck size={15} className={examResult?.passed ? 'done-icon' : ''} />
            {examResult ? `${examResult.correct} из ${examResult.total} ответов верно` : 'Экзамен еще не пройден'}
          </button>
        </article>
      </div>

      <section>
        <span className="eyebrow">Рекомендации</span>
        <Recommendations recommendations={recommendations} openArticle={openArticle} openTopic={openTopic} />
      </section>

      <section>
        <span className="eyebrow">История тестов</span>
        <div className="history">
          {testResults.length ? (
            testResults.map((result) => (
              <div key={result.id}>
                <span>{result.testTitle}</span>
                <strong>{result.score}%</strong>
              </div>
            ))
          ) : (
            <EmptyState text="История тестов пока пуста." />
          )}
        </div>
      </section>
    </section>
  );
}

function ProfilePage({
  completedSubtopics,
  examResult,
  loginStudent,
  logoutStudent,
  openDashboard,
  progress,
  progressPercent,
  recommendations,
  saveStudent,
  student,
  subtopicTotal,
  testResults,
  topics,
}) {
  const [mode, setMode] = useState(student ? 'profile' : 'register');
  const [form, setForm] = useState({ ...(student ?? defaultStudent), password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(null);

  const updateField = (field, value) => setForm({ ...form, [field]: value });

  const submitProfile = (event) => {
    event.preventDefault();
    const trimmedStudent = {
      userId: student?.id,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      group: form.group.trim(),
      course: form.course.trim(),
      goal: form.goal.trim(),
      password: form.password,
    };

    if (!trimmedStudent.fullName || !trimmedStudent.email || (!student && !trimmedStudent.password)) {
      setMessage({ kind: 'warning', text: 'Укажите имя ученика, email и пароль.' });
      return;
    }

    const isRegistration = !student;
    saveStudent(trimmedStudent)
      .then((savedStudent) => {
        setForm({ ...savedStudent, password: '' });
        setMode('profile');
        setMessage({
          kind: 'success',
          text: isRegistration ? 'Регистрация прошла успешно.' : 'Данные ученика сохранены.',
        });
        if (isRegistration) {
          setTimeout(openDashboard, 900);
        }
      })
      .catch((error) => setMessage({ kind: 'warning', text: error.message }));
  };

  const submitLogin = (event) => {
    event.preventDefault();
    loginStudent(loginForm)
      .then((savedStudent) => {
        setForm({ ...savedStudent, password: '' });
        setMode('profile');
        setMessage(null);
      })
      .catch(() => setMessage({ kind: 'warning', text: 'Неверный email или пароль.' }));
  };

  return (
    <section className="profile-layout">
      <form autoComplete="off" className="profile-form" onSubmit={mode === 'login' ? submitLogin : submitProfile}>
        <span className="eyebrow">{student ? 'Личный кабинет' : 'Учетная запись ученика'}</span>
        <h2>{mode === 'login' ? 'Вход ученика' : student ? 'Данные ученика' : 'Регистрация ученика'}</h2>

        {!student && (
          <div className="auth-switch">
            <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => { setMode('register'); setMessage(null); }}>
              Регистрация
            </button>
            <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => { setMode('login'); setMessage(null); }}>
              Вход
            </button>
          </div>
        )}

        {message && <div className={`form-message ${message.kind}`}>{message.text}</div>}

        {mode === 'login' ? (
          <>
            <label>
              Email
              <input autoComplete="off" type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
            </label>
            <label>
              Пароль
              <input autoComplete="new-password" type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
            </label>
          </>
        ) : (
          <>
            <label>
              ФИО ученика
              <input autoComplete="off" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
            </label>
            {!student && (
              <label>
                Пароль
                <input autoComplete="new-password" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} />
              </label>
            )}
            <label>
              Email
              <input autoComplete="off" disabled={Boolean(student)} type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
            <div className="form-row">
              <label>
                Группа
                <input autoComplete="off" value={form.group} onChange={(event) => updateField('group', event.target.value)} />
              </label>
              <label>
                Курс
                <input autoComplete="off" value={form.course} onChange={(event) => updateField('course', event.target.value)} />
              </label>
            </div>
            <label>
              Цель обучения
              <textarea autoComplete="off" value={form.goal} onChange={(event) => updateField('goal', event.target.value)} />
            </label>
          </>
        )}

        <div className="actions">
          <button className="primary" type="submit">
            <UserRound size={18} />
            {mode === 'login' ? 'Войти' : student ? 'Сохранить данные' : 'Зарегистрироваться'}
          </button>
          {student && (
            <button className="secondary" type="button" onClick={logoutStudent}>
              <LogOut size={18} />
              Выйти
            </button>
          )}
        </div>
      </form>

      <aside className="student-card">
        <div className="student-avatar">
          <UserRound size={36} />
        </div>
        <span className="eyebrow">Информация об ученике</span>
        <h3>{student?.fullName || 'Ученик не зарегистрирован'}</h3>
        <dl>
          <div>
            <dt>Email</dt>
            <dd>{student?.email || 'не указан'}</dd>
          </div>
          <div>
            <dt>Роль</dt>
            <dd>{student?.role === 'admin' ? 'Администратор' : 'Ученик'}</dd>
          </div>
          <div>
            <dt>Группа</dt>
            <dd>{student?.group || 'не указана'}</dd>
          </div>
          <div>
            <dt>Курс</dt>
            <dd>{student?.course || 'не указан'}</dd>
          </div>
        </dl>
      </aside>

      <ProgressPage
        completedSubtopics={completedSubtopics}
        examResult={examResult}
        openArticle={() => {}}
        openTopic={() => {}}
        progress={progress}
        progressPercent={progressPercent}
        recommendations={recommendations}
        subtopicTotal={subtopicTotal}
        testResults={testResults}
        topics={topics}
      />
    </section>
  );
}

function AdminPage({ adminRequest, student, tests, topics }) {
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const [subtopicId, setSubtopicId] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [subtopicMode, setSubtopicMode] = useState('edit');
  const [questionMode, setQuestionMode] = useState('edit');
  const topic = topics.find((item) => item.id === topicId) ?? topics[0];
  const subtopic = topic?.subtopics?.find((item) => item.id === subtopicId) ?? topic?.subtopics?.[0];
  const test = subtopic ? tests[subtopic.id] : null;
  const question = test?.questions?.find((item) => String(item.id) === String(questionId)) ?? test?.questions?.[0];
  const [articleForm, setArticleForm] = useState({ title: '', theory: '', practice: '' });
  const [subtopicForm, setSubtopicForm] = useState({ title: '', description: '' });
  const [questionForm, setQuestionForm] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setArticleForm({ title: topic?.articleTitle ?? topic?.title ?? '', theory: topic?.theory ?? '', practice: topic?.practice ?? '' });
    setSubtopicId(topic?.subtopics?.[0]?.id ?? '');
  }, [topicId, topics]);

  useEffect(() => {
    if (subtopicMode === 'edit') {
      setSubtopicForm({ title: subtopic?.title ?? '', description: subtopic?.description ?? '' });
    } else {
      setSubtopicForm({ title: '', description: '' });
    }
    setQuestionId(test?.questions?.[0]?.id ?? '');
  }, [subtopic?.id, subtopicMode, test?.questions]);

  useEffect(() => {
    const currentQuestion = questionMode === 'edit' ? question : null;
    setQuestionForm(
      currentQuestion
        ? {
            questionId: currentQuestion.id,
            question: currentQuestion.question,
            options: currentQuestion.options.map((option, index) => ({ ...option, isCorrect: option.isCorrect ?? index === 0 })),
          }
        : {
            question: '',
            options: [
              { id: 'new-1', text: '', isCorrect: true },
              { id: 'new-2', text: '', isCorrect: false },
              { id: 'new-3', text: '', isCorrect: false },
              { id: 'new-4', text: '', isCorrect: false },
            ],
          },
    );
  }, [question?.id, questionMode]);

  if (student?.role !== 'admin') {
    return (
      <section className="lesson">
        <span className="eyebrow">Админ-панель</span>
        <h2>Доступ только для администратора</h2>
        <p>Войдите под учетной записью администратора: admin@example.com / admin123.</p>
      </section>
    );
  }

  const formatOntologyMessage = (payload) => {
    const ontology = payload?.ontology;
    if (!ontology) return '';
    return ` Онтология обновлена: ${ontology.concepts ?? 0} понятий, ${ontology.links ?? 0} связей.`;
  };

  const saveArticle = async () => {
    const payload = await adminRequest('/admin/article', { topicId, ...articleForm });
    setMessage(`Статья сохранена.${formatOntologyMessage(payload)}`);
  };

  const saveSubtopic = async () => {
    if (subtopicMode === 'edit') {
      const payload = await adminRequest('/admin/subtopic', { subtopicId: subtopic.id, ...subtopicForm });
      setMessage(`Подтема сохранена.${formatOntologyMessage(payload)}`);
    } else {
      const payload = await adminRequest('/admin/subtopic/create', { topicId, ...subtopicForm });
      setSubtopicMode('edit');
      setMessage(`Новая подтема добавлена.${formatOntologyMessage(payload)}`);
    }
  };

  const saveQuestion = async () => {
    if (questionMode === 'edit') {
      await adminRequest('/admin/question', questionForm);
      setMessage('Вопрос сохранен.');
    } else {
      await adminRequest('/admin/question/create', { subtopicId: subtopic.id, ...questionForm });
      setQuestionMode('edit');
      setMessage('Новый вопрос добавлен.');
    }
  };

  return (
    <section className="admin-layout">
      <div className="lesson">
        <span className="eyebrow">Админ-панель</span>
        <h2>Наполнение пособия</h2>
        <label className="admin-label">
          Тема
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)}>
            {topics.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="profile-form">
        <h3>Статья</h3>
        <label>
          Заголовок
          <input value={articleForm.title} onChange={(event) => setArticleForm({ ...articleForm, title: event.target.value })} />
        </label>
        <label>
          Теория
          <textarea value={articleForm.theory} onChange={(event) => setArticleForm({ ...articleForm, theory: event.target.value })} />
        </label>
        <label>
          Практический блок
          <textarea value={articleForm.practice} onChange={(event) => setArticleForm({ ...articleForm, practice: event.target.value })} />
        </label>
        <button className="primary" type="button" onClick={saveArticle}>
          Сохранить статью
        </button>
      </div>

      <div className="profile-form">
        <div className="admin-section-head">
          <h3>{subtopicMode === 'edit' ? 'Подтема' : 'Новая подтема'}</h3>
          <div className="auth-switch compact-switch">
            <button className={subtopicMode === 'edit' ? 'active' : ''} type="button" onClick={() => setSubtopicMode('edit')}>
              Изменить
            </button>
            <button className={subtopicMode === 'create' ? 'active' : ''} type="button" onClick={() => setSubtopicMode('create')}>
              Добавить
            </button>
          </div>
        </div>
        {subtopicMode === 'edit' && (
          <label>
            Выбор подтемы
            <select value={subtopic?.id ?? ''} onChange={(event) => setSubtopicId(event.target.value)}>
              {(topic?.subtopics ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Название
          <input value={subtopicForm.title} onChange={(event) => setSubtopicForm({ ...subtopicForm, title: event.target.value })} />
        </label>
        <label>
          Описание
          <textarea value={subtopicForm.description} onChange={(event) => setSubtopicForm({ ...subtopicForm, description: event.target.value })} />
        </label>
        <button className="primary" type="button" onClick={saveSubtopic}>
          {subtopicMode === 'edit' ? 'Сохранить подтему' : 'Добавить подтему'}
        </button>
      </div>

      {questionForm && (
        <div className="profile-form wide">
          <div className="admin-section-head">
            <h3>{questionMode === 'edit' ? 'Вопрос теста' : 'Новый вопрос теста'}</h3>
            <div className="auth-switch compact-switch">
              <button className={questionMode === 'edit' ? 'active' : ''} type="button" onClick={() => setQuestionMode('edit')}>
                Изменить
              </button>
              <button className={questionMode === 'create' ? 'active' : ''} type="button" onClick={() => setQuestionMode('create')}>
                Добавить
              </button>
            </div>
          </div>
          {questionMode === 'edit' && (
            <label>
              Выбор вопроса
              <select value={question?.id ?? ''} onChange={(event) => setQuestionId(event.target.value)}>
                {(test?.questions ?? []).map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {item.question || `Вопрос ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Текст вопроса
            <input value={questionForm.question} onChange={(event) => setQuestionForm({ ...questionForm, question: event.target.value })} />
          </label>
          {questionForm.options.map((option, index) => (
            <label key={option.id}>
              Вариант {index + 1}
              <div className="option-editor">
                <input
                  value={option.text}
                  onChange={(event) => {
                    const options = questionForm.options.map((item) => (item.id === option.id ? { ...item, text: event.target.value } : item));
                    setQuestionForm({ ...questionForm, options });
                  }}
                />
                <input
                  checked={option.isCorrect}
                  name="correct-option"
                  type="radio"
                  onChange={() => {
                    const options = questionForm.options.map((item) => ({ ...item, isCorrect: item.id === option.id }));
                    setQuestionForm({ ...questionForm, options });
                  }}
                />
              </div>
            </label>
          ))}
          <button className="primary" type="button" onClick={saveQuestion}>
            {questionMode === 'edit' ? 'Сохранить вопрос' : 'Добавить вопрос'}
          </button>
        </div>
      )}
      {message && <p className="result-message wide">{message}</p>}
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);

