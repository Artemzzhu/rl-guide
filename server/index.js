import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 55432),
  database: process.env.DB_NAME ?? 'rl_guide',
  user: process.env.DB_USER ?? 'rl_user',
  password: process.env.DB_PASSWORD ?? 'rl_password',
});

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const sha256Password = async (password) => {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(password).digest('hex');
};
const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);
const isBcryptHash = (value) => String(value ?? '').startsWith('$2a$') || String(value ?? '').startsWith('$2b$') || String(value ?? '').startsWith('$2y$');
const verifyPassword = async (password, passwordHash) => {
  if (isBcryptHash(passwordHash)) return bcrypt.compare(password, passwordHash);
  return passwordHash === await sha256Password(password);
};
const publicDir = path.join(process.cwd(), 'dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const sendStaticFile = async (response, pathname) => {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const normalizedPath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(publicDir, normalizedPath);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(publicDir, 'index.html');
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, { 'Content-Type': contentTypes[ext] ?? 'application/octet-stream' });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
  }
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const runPythonCode = async (code) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rl-python-'));
  const filePath = path.join(tempDir, 'exercise.py');

  try {
    await fs.writeFile(filePath, code, 'utf8');

    return await new Promise((resolve) => {
      const child = spawn('python', ['-I', filePath], {
        cwd: tempDir,
        windowsHide: true,
        env: { PYTHONIOENCODING: 'utf-8' },
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, 3000);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({ stdout, stderr: error.message, exitCode: 1, timedOut: false });
      });
      child.on('close', (exitCode) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: timedOut ? `${stderr}\nВремя выполнения превышено.`.trim() : stderr,
          exitCode: timedOut ? 124 : exitCode,
          timedOut,
        });
      });
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е');

const ontologyTermRules = [
  {
    slug: 'agent',
    name: 'Агент',
    complexity: 1,
    aliases: ['агент', 'agent'],
    description: 'Сущность, которая выбирает действия и обучается по обратной связи.',
  },
  {
    slug: 'environment',
    name: 'Среда',
    complexity: 1,
    aliases: ['среда', 'environment'],
    description: 'Система, с которой взаимодействует агент.',
  },
  {
    slug: 'state',
    name: 'Состояние',
    complexity: 1,
    aliases: ['состояние', 'state', 'наблюдение', 'observation'],
    description: 'Описание ситуации, доступное агенту при выборе действия.',
  },
  {
    slug: 'action',
    name: 'Действие',
    complexity: 1,
    aliases: ['действие', 'action'],
    description: 'Выбор агента, влияющий на новое состояние и награду.',
  },
  {
    slug: 'reward',
    name: 'Награда',
    complexity: 1,
    aliases: ['награда', 'reward', 'вознаграждение'],
    description: 'Числовой сигнал обратной связи от среды.',
  },
  {
    slug: 'return',
    name: 'Возврат',
    complexity: 2,
    aliases: ['возврат', 'return', 'суммарная награда', 'дисконтированная награда'],
    description: 'Сумма будущих наград с учетом дисконтирования.',
  },
  {
    slug: 'discount-factor',
    name: 'Коэффициент дисконтирования',
    complexity: 2,
    aliases: ['gamma', 'γ', 'дисконтирование', 'коэффициент дисконтирования'],
    description: 'Параметр, задающий важность будущих наград.',
  },
  {
    slug: 'mdp',
    name: 'MDP',
    complexity: 2,
    aliases: ['mdp', 'марковский процесс', 'марковские процессы', 'процесс принятия решений'],
    description: 'Формальная модель задачи последовательного принятия решений.',
  },
  {
    slug: 'policy',
    name: 'Стратегия',
    complexity: 2,
    aliases: ['policy', 'политика', 'стратегия', 'π'],
    description: 'Правило выбора действия в состоянии.',
  },
  {
    slug: 'value-function',
    name: 'Функция ценности',
    complexity: 2,
    aliases: ['value function', 'функция ценности', 'v(s)', 'ценность состояния'],
    description: 'Оценка полезности состояния или поведения.',
  },
  {
    slug: 'q-function',
    name: 'Q-функция',
    complexity: 3,
    aliases: ['q-function', 'q function', 'q-функция', 'q(s,a)', 'q-значение', 'q-таблица'],
    description: 'Оценка полезности пары состояние-действие.',
  },
  {
    slug: 'bellman-equation',
    name: 'Уравнение Беллмана',
    complexity: 3,
    aliases: ['bellman', 'беллман', 'уравнение беллмана', 'bellman backup'],
    description: 'Рекурсивная связь текущей ценности с наградой и будущей ценностью.',
  },
  {
    slug: 'exploration',
    name: 'Исследование',
    complexity: 2,
    aliases: ['exploration', 'исследование', 'проба новых действий'],
    description: 'Проба новых действий для получения опыта.',
  },
  {
    slug: 'exploitation',
    name: 'Использование',
    complexity: 2,
    aliases: ['exploitation', 'использование', 'жадный выбор'],
    description: 'Выбор действия, которое уже считается лучшим.',
  },
  {
    slug: 'epsilon-greedy',
    name: 'ε-жадная стратегия',
    complexity: 3,
    aliases: ['epsilon-greedy', 'ε-greedy', 'epsilon жадн', 'эпсилон', 'ε-жад'],
    description: 'Стратегия, которая смешивает исследование и использование.',
  },
  {
    slug: 'monte-carlo',
    name: 'Метод Монте-Карло',
    complexity: 3,
    aliases: ['monte carlo', 'монте-карло', 'монте карло'],
    description: 'Оценивание по полным эпизодам и фактическим возвратам.',
  },
  {
    slug: 'td-learning',
    name: 'TD-обучение',
    complexity: 3,
    aliases: ['td-learning', 'td learning', 'временные различия', 'td-ошибка', 'temporal difference'],
    description: 'Обучение по одному шагу опыта с использованием прогноза.',
  },
  {
    slug: 'q-learning',
    name: 'Q-learning',
    complexity: 3,
    aliases: ['q-learning', 'q learning', 'q-обучение'],
    description: 'Off-policy алгоритм обучения Q-функции.',
  },
  {
    slug: 'sarsa',
    name: 'SARSA',
    complexity: 3,
    aliases: ['sarsa', 'сарса', 'on-policy'],
    description: 'On-policy алгоритм временных различий.',
  },
  {
    slug: 'dqn',
    name: 'DQN',
    complexity: 4,
    aliases: ['dqn', 'deep q-network', 'deep q network', 'глубокая q-сеть', 'нейронная аппроксимация'],
    description: 'Подход, где Q-функция аппроксимируется нейронной сетью.',
  },
  {
    slug: 'experience-replay',
    name: 'Experience replay',
    complexity: 4,
    aliases: ['experience replay', 'replay buffer', 'буфер опыта', 'воспроизведение опыта'],
    description: 'Повторное использование сохраненных переходов для обучения.',
  },
  {
    slug: 'target-network',
    name: 'Target network',
    complexity: 4,
    aliases: ['target network', 'целевая сеть', 'target q'],
    description: 'Стабилизирующая сеть для расчета целевых Q-значений.',
  },
  {
    slug: 'actor-critic',
    name: 'Actor-Critic',
    complexity: 4,
    aliases: ['actor-critic', 'actor critic', 'актор', 'критик', 'critic'],
    description: 'Архитектура, где actor выбирает действия, а critic оценивает их.',
  },
  {
    slug: 'policy-gradient',
    name: 'Градиент стратегии',
    complexity: 4,
    aliases: ['policy gradient', 'градиент стратегии', 'градиент политики'],
    description: 'Метод прямого улучшения параметризованной стратегии.',
  },
  {
    slug: 'ppo',
    name: 'PPO',
    complexity: 5,
    aliases: ['ppo', 'proximal policy optimization', 'clipped update'],
    description: 'Стабильный actor-critic метод с ограниченным обновлением стратегии.',
  },
];

const prerequisiteRules = {
  return: ['reward', 'discount-factor'],
  mdp: ['agent', 'environment', 'state', 'action', 'reward'],
  policy: ['state', 'action'],
  'value-function': ['return', 'policy'],
  'q-function': ['state', 'action', 'return'],
  'bellman-equation': ['value-function', 'discount-factor'],
  'epsilon-greedy': ['exploration', 'exploitation', 'q-function'],
  'monte-carlo': ['return'],
  'td-learning': ['value-function', 'bellman-equation'],
  'q-learning': ['q-function', 'td-learning', 'epsilon-greedy'],
  sarsa: ['q-function', 'td-learning', 'policy'],
  dqn: ['q-learning', 'q-function'],
  'experience-replay': ['dqn'],
  'target-network': ['dqn'],
  'policy-gradient': ['policy', 'return'],
  'actor-critic': ['policy-gradient', 'value-function'],
  ppo: ['actor-critic', 'policy-gradient'],
};

const extractOntologyConcepts = (text) => {
  const normalized = normalizeText(text);
  return ontologyTermRules
    .map((rule) => {
      const hits = rule.aliases.reduce((sum, alias) => {
        const normalizedAlias = normalizeText(alias);
        return sum + (normalized.includes(normalizedAlias) ? 1 : 0);
      }, 0);
      return hits ? { ...rule, hits } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.hits - left.hits || left.complexity - right.complexity);
};

const upsertConcept = async (client, concept) => {
  const { rows } = await client.query(
    `
      INSERT INTO ontology_concepts (slug, name, description, complexity)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = CASE
          WHEN ontology_concepts.description = '' THEN EXCLUDED.description
          ELSE ontology_concepts.description
        END,
        complexity = LEAST(ontology_concepts.complexity, EXCLUDED.complexity)
      RETURNING id
    `,
    [concept.slug, concept.name, concept.description, concept.complexity],
  );
  return rows[0].id;
};

const syncOntologyForTopic = async (topicSlug) => {
  if (!topicSlug) return { concepts: 0, links: 0 };
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `
        SELECT
          topics.id AS topic_id,
          topics.slug AS topic_slug,
          topics.name AS topic_name,
          topics.description AS topic_description,
          articles.title AS article_title,
          articles.theory_content,
          articles.practice_content,
          COALESCE(
            json_agg(
              json_build_object(
                'id', subtopics.id,
                'slug', subtopics.slug,
                'name', subtopics.name,
                'description', subtopics.description,
                'theory', subtopics.theory_content
              )
              ORDER BY subtopics.sort_order
            ) FILTER (WHERE subtopics.id IS NOT NULL),
            '[]'::json
          ) AS subtopics
        FROM topics
        LEFT JOIN articles ON articles.topic_id = topics.id
        LEFT JOIN subtopics ON subtopics.topic_id = topics.id
        WHERE topics.slug = $1
        GROUP BY topics.id, articles.id
      `,
      [topicSlug],
    );

    const topic = rows[0];
    if (!topic) {
      await client.query('ROLLBACK');
      return { concepts: 0, links: 0 };
    }

    const articleText = [topic.topic_name, topic.topic_description, topic.article_title, topic.theory_content, topic.practice_content].join(' ');
    const articleConcepts = extractOntologyConcepts(articleText).slice(0, 10);
    const conceptIds = new Map();

    const ensureConcept = async (concept) => {
      const conceptId = conceptIds.get(concept.slug) ?? (await upsertConcept(client, concept));
      conceptIds.set(concept.slug, conceptId);
      for (const requiredSlug of prerequisiteRules[concept.slug] ?? []) {
        const requiredConcept = ontologyTermRules.find((item) => item.slug === requiredSlug);
        if (requiredConcept) {
          const requiredId = conceptIds.get(requiredSlug) ?? (await upsertConcept(client, requiredConcept));
          conceptIds.set(requiredSlug, requiredId);
        }
      }
      return conceptId;
    };

    for (const concept of articleConcepts) {
      await ensureConcept(concept);
    }

    for (const concept of articleConcepts) {
      const sourceId = conceptIds.get(concept.slug);
      for (const requiredSlug of prerequisiteRules[concept.slug] ?? []) {
        const targetId = conceptIds.get(requiredSlug);
        if (sourceId && targetId) {
          await client.query(
            `
              INSERT INTO ontology_relations (source_concept_id, target_concept_id, relation_type)
              VALUES ($1, $2, 'requires')
              ON CONFLICT (source_concept_id, target_concept_id, relation_type) DO NOTHING
            `,
            [sourceId, targetId],
          );
        }
      }
    }

    let links = 0;
    for (const subtopic of topic.subtopics ?? []) {
      const subtopicText = [subtopic.name, subtopic.description, subtopic.theory].join(' ');
      const subtopicConcepts = extractOntologyConcepts(subtopicText);
      const selected = subtopicConcepts.length ? subtopicConcepts.slice(0, 6) : articleConcepts.slice(0, 3);

      for (const concept of selected) {
        const conceptId = await ensureConcept(concept);
        const weight = Math.max(1, Math.min(5, concept.hits + (subtopicConcepts.length ? 2 : 0)));
        await client.query(
          `
            INSERT INTO subtopic_concepts (subtopic_id, concept_id, weight)
            VALUES ($1, $2, $3)
            ON CONFLICT (subtopic_id, concept_id) DO UPDATE SET
              weight = GREATEST(subtopic_concepts.weight, EXCLUDED.weight)
          `,
          [subtopic.id, conceptId, weight],
        );
        links += 1;

        await client.query(
          `
            INSERT INTO subtopic_keywords (subtopic_id, keyword)
            VALUES ($1, $2)
            ON CONFLICT (subtopic_id, keyword) DO NOTHING
          `,
          [subtopic.id, concept.name],
        );
      }
    }

    const sourceResult = await client.query(
      `
        SELECT id, title, source_name, description
        FROM article_sources
        WHERE topic_id = $1
        ORDER BY sort_order, id
      `,
      [topic.topic_id],
    );
    await client.query(
      `
        DELETE FROM article_source_concepts
        USING article_sources
        WHERE article_source_concepts.article_source_id = article_sources.id
          AND article_sources.topic_id = $1
      `,
      [topic.topic_id],
    );

    let articleLinks = 0;
    for (const source of sourceResult.rows) {
      const generatedArticle = articleTextByTopic[topic.topic_slug]?.theory ?? '';
      const sourceText = [
        topic.topic_name,
        topic.topic_description,
        source.title,
        source.source_name,
        source.description,
        generatedArticle,
      ].join(' ');
      const sourceConcepts = extractOntologyConcepts(sourceText);
      const selected = sourceConcepts.length ? sourceConcepts.slice(0, 7) : articleConcepts.slice(0, 4);

      for (const concept of selected) {
        const conceptId = await ensureConcept(concept);
        const weight = Math.max(1, Math.min(5, concept.hits + 1));
        await client.query(
          `
            INSERT INTO article_source_concepts (article_source_id, concept_id, weight)
            VALUES ($1, $2, $3)
            ON CONFLICT (article_source_id, concept_id) DO UPDATE SET
              weight = EXCLUDED.weight
          `,
          [source.id, conceptId, weight],
        );
        articleLinks += 1;
      }
    }

    for (const concept of articleConcepts.slice(0, 8)) {
      await client.query(
        `
          INSERT INTO topic_keywords (topic_id, keyword)
          VALUES ($1, $2)
          ON CONFLICT (topic_id, keyword) DO NOTHING
        `,
        [topic.topic_id, concept.name],
      );
    }

    await client.query('COMMIT');
    return { concepts: articleConcepts.length, links, articleLinks };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const syncOntologyForSubtopic = async (subtopicSlug) => {
  const { rows } = await pool.query(
    `
      SELECT topics.slug
      FROM subtopics
      JOIN topics ON topics.id = subtopics.topic_id
      WHERE subtopics.slug = $1
    `,
    [subtopicSlug],
  );
  return syncOntologyForTopic(rows[0]?.slug);
};

const mapUser = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role ?? 'student',
  group: row.student_group ?? '',
  course: row.course ? String(row.course) : '',
  goal: row.learning_goal ?? '',
  createdAt: row.created_at,
});

const mapTopic = (row) => ({
  id: row.slug,
  dbId: row.id,
  title: row.name,
  description: row.description,
  level: row.level_name,
  keywords: row.keywords ?? [],
  theory: row.theory_content ?? '',
  practice: row.practice_content ?? '',
  articleTitle: row.article_title ?? row.name,
  subtopics: row.subtopics ?? [],
});

const getTopics = async () => {
  const { rows } = await pool.query(`
    WITH keyword_data AS (
      SELECT topic_id, array_agg(keyword ORDER BY keyword) AS keywords
      FROM topic_keywords
      GROUP BY topic_id
    ),
    subtopic_data AS (
      SELECT
        subtopics.topic_id,
        json_agg(
          json_build_object(
            'id', subtopics.slug,
            'dbId', subtopics.id,
            'title', subtopics.name,
            'description', subtopics.description,
            'theory', subtopics.theory_content,
            'keywords', COALESCE(keyword_data.keywords, '[]'::json),
            'illustrationKey', subtopics.illustration_key,
            'testId', tests.id
          )
          ORDER BY subtopics.sort_order
        ) AS subtopics
      FROM subtopics
      LEFT JOIN LATERAL (
        SELECT id
        FROM tests
        WHERE tests.subtopic_id = subtopics.id
        ORDER BY tests.id
        LIMIT 1
      ) tests ON true
      LEFT JOIN (
        SELECT
          subtopic_keywords.subtopic_id,
          json_agg(subtopic_keywords.keyword ORDER BY subtopic_keywords.keyword) AS keywords
        FROM subtopic_keywords
        GROUP BY subtopic_keywords.subtopic_id
      ) keyword_data ON keyword_data.subtopic_id = subtopics.id
      GROUP BY subtopics.topic_id
    )
    SELECT
      topics.id,
      topics.slug,
      topics.name,
      topics.description,
      topics.level_name,
      articles.title AS article_title,
      articles.theory_content,
      articles.practice_content,
      COALESCE(keyword_data.keywords, '{}') AS keywords,
      COALESCE(subtopic_data.subtopics, '[]'::json) AS subtopics
    FROM topics
    LEFT JOIN articles ON articles.topic_id = topics.id
    LEFT JOIN keyword_data ON keyword_data.topic_id = topics.id
    LEFT JOIN subtopic_data ON subtopic_data.topic_id = topics.id
    ORDER BY topics.sort_order
  `);

  return rows.map(mapTopic);
};

const getProgress = async (userId) => {
  if (!userId) return { topics: {}, subtopics: {} };

  const subtopicResult = await pool.query(
    `
      SELECT
        topics.slug AS topic_slug,
        subtopics.slug AS subtopic_slug,
        user_subtopic_progress.status
      FROM user_subtopic_progress
      JOIN subtopics ON subtopics.id = user_subtopic_progress.subtopic_id
      JOIN topics ON topics.id = subtopics.topic_id
      WHERE user_subtopic_progress.user_id = $1
    `,
    [userId],
  );

  const totalsResult = await pool.query(`
    SELECT topics.slug, COUNT(subtopics.id)::int AS total
    FROM topics
    LEFT JOIN subtopics ON subtopics.topic_id = topics.id
    GROUP BY topics.id
  `);

  const subtopics = Object.fromEntries(
    subtopicResult.rows.map((row) => [row.subtopic_slug, row.status === 'completed']),
  );

  const completedByTopic = subtopicResult.rows.reduce((acc, row) => {
    if (row.status === 'completed') {
      acc[row.topic_slug] = (acc[row.topic_slug] ?? 0) + 1;
    }
    return acc;
  }, {});

  const topics = Object.fromEntries(
    totalsResult.rows.map((row) => {
      const completed = completedByTopic[row.slug] ?? 0;
      const total = row.total || 0;
      return [
        row.slug,
        {
          completed,
          total,
          percent: total ? Math.round((completed / total) * 100) : 0,
          done: total > 0 && completed === total,
        },
      ];
    }),
  );

  return { topics, subtopics };
};

const requireAdmin = async (userId) => {
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  return rows[0]?.role === 'admin';
};

const getTestHistory = async (userId) => {
  if (!userId) return [];

  const { rows } = await pool.query(
    `
      SELECT
        test_results.id,
        test_results.score,
        test_results.passed,
        test_results.completed_at,
        tests.title AS test_title,
        topics.name AS topic_title,
        topics.slug AS topic_id,
        subtopics.name AS subtopic_title,
        subtopics.slug AS subtopic_id,
        COALESCE(
          (
            SELECT jsonb_object_agg(user_answers.question_id::text, user_answers.answer_option_id::text)
            FROM user_answers
            WHERE user_answers.result_id = test_results.id
              AND user_answers.answer_option_id IS NOT NULL
          ),
          '{}'::jsonb
        ) AS selected_answers
      FROM test_results
      JOIN tests ON tests.id = test_results.test_id
      JOIN topics ON topics.id = tests.topic_id
      LEFT JOIN subtopics ON subtopics.id = tests.subtopic_id
      WHERE test_results.user_id = $1
      ORDER BY test_results.completed_at DESC
      LIMIT 500
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    score: row.score,
    passed: row.passed,
    completedAt: row.completed_at,
    testTitle: row.test_title,
    topicTitle: row.topic_title,
    topicId: row.topic_id,
    subtopicTitle: row.subtopic_title,
    subtopicId: row.subtopic_id,
    selectedAnswers: row.selected_answers ?? {},
  }));
};

const getScoreRecommendations = async (userId) => {
  const history = await getTestHistory(userId);
  const failed = history.filter((result) => !result.passed).slice(0, 3);

  if (failed.length === 0) {
    return [
      {
        kind: 'article',
        title: '\u0417\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0441\u0442\u0430\u0442\u044c\u0435\u0439',
        text: '\u041a\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043e\u0448\u0438\u0431\u043e\u043a \u043f\u043e\u043a\u0430 \u043d\u0435\u0442. \u041f\u043e\u0441\u043b\u0435 \u0442\u0435\u0441\u0442\u0430 \u043f\u043e\u043b\u0435\u0437\u043d\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u0442\u0430\u0442\u044c\u044e \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0442\u0435\u043c\u044b \u0438 \u0441\u0432\u044f\u0437\u0430\u0442\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u044f \u0441 \u043e\u0431\u0449\u0435\u0439 \u043a\u0430\u0440\u0442\u0438\u043d\u043e\u0439 \u043a\u0443\u0440\u0441\u0430.',
      },
    ];
  }

  return failed.map((result) => ({
    kind: 'repeat',
    title: `\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435: ${result.subtopicTitle}`,
    text: `\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u043e \u0442\u0435\u0441\u0442\u0443 "${result.testTitle}" - ${result.score}%. \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u0442\u0441\u044f \u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u0441\u0442\u0430\u0442\u044c\u0435 \u0442\u0435\u043c\u044b "${result.topicTitle}" \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u0443\u044e \u043f\u043e\u0434\u0442\u0435\u043c\u0443.`,
    topicId: result.topicId,
    subtopicId: result.subtopicId,
  }));
};

const getArticleRecommendationForConcept = async (conceptSlug) => {
  if (!conceptSlug) return null;

  const { rows } = await pool.query(
    `
      SELECT
        article_sources.id AS article_source_id,
        article_sources.title,
        article_sources.source_name,
        topics.slug AS topic_id,
        topics.name AS topic_title,
        ontology_concepts.name AS concept_title
      FROM article_source_concepts
      JOIN article_sources ON article_sources.id = article_source_concepts.article_source_id
      JOIN topics ON topics.id = article_sources.topic_id
      JOIN ontology_concepts ON ontology_concepts.id = article_source_concepts.concept_id
      WHERE ontology_concepts.slug = $1
      ORDER BY article_source_concepts.weight DESC, article_sources.sort_order, article_sources.id
      LIMIT 1
    `,
    [conceptSlug],
  );

  const article = rows[0];
  if (!article) return null;

  return {
    kind: 'article',
    title: `Связанная статья: ${article.title}`,
    text: `Статья подобрана автоматически по понятию "${article.concept_title}" из темы "${article.topic_title}". Она поможет закрепить материал перед переходом дальше.`,
    articleId: `${article.topic_id}-source-${article.article_source_id}`,
  };
};

const getOntologyRecommendations = async (userId) => {
  if (!userId) return [];

  const [conceptResult, relationResult] = await Promise.all([
    pool.query(
      `
        SELECT
          topics.slug AS topic_id,
          topics.name AS topic_title,
          subtopics.slug AS subtopic_id,
          subtopics.name AS subtopic_title,
          subtopics.sort_order,
          ontology_concepts.slug AS concept_id,
          ontology_concepts.name AS concept_title,
          ontology_concepts.description AS concept_description,
          ontology_concepts.complexity,
          subtopic_concepts.weight,
          COALESCE(user_subtopic_progress.status = 'completed', false) AS completed
        FROM subtopic_concepts
        JOIN ontology_concepts ON ontology_concepts.id = subtopic_concepts.concept_id
        JOIN subtopics ON subtopics.id = subtopic_concepts.subtopic_id
        JOIN topics ON topics.id = subtopics.topic_id
        LEFT JOIN user_subtopic_progress
          ON user_subtopic_progress.subtopic_id = subtopics.id
          AND user_subtopic_progress.user_id = $1
        ORDER BY topics.sort_order, subtopics.sort_order, ontology_concepts.complexity
      `,
      [userId],
    ),
    pool.query(
      `
        SELECT
          source.slug AS source_id,
          target.slug AS target_id,
          target.name AS target_title
        FROM ontology_relations
        JOIN ontology_concepts source ON source.id = ontology_relations.source_concept_id
        JOIN ontology_concepts target ON target.id = ontology_relations.target_concept_id
        WHERE ontology_relations.relation_type = 'requires'
      `,
    ),
  ]);

  const conceptRows = conceptResult.rows;
  const knownConcepts = new Set(conceptRows.filter((row) => row.completed).map((row) => row.concept_id));
  const relations = relationResult.rows.reduce((acc, row) => {
    acc[row.source_id] = [...(acc[row.source_id] ?? []), { id: row.target_id, title: row.target_title }];
    return acc;
  }, {});

  const conceptLesson = new Map();
  for (const row of conceptRows) {
    if (!conceptLesson.has(row.concept_id) || row.weight > conceptLesson.get(row.concept_id).weight) {
      conceptLesson.set(row.concept_id, row);
    }
  }

  const candidates = conceptRows
    .filter((row) => !row.completed && !knownConcepts.has(row.concept_id))
    .map((row) => {
      const missingPrerequisites = (relations[row.concept_id] ?? []).filter((concept) => !knownConcepts.has(concept.id));
      const targetLesson = missingPrerequisites.length ? conceptLesson.get(missingPrerequisites[0].id) ?? row : row;
      return {
        row,
        targetLesson,
        missingPrerequisites,
        score: missingPrerequisites.length * 10 + Number(row.complexity) - Number(row.weight),
      };
    })
    .sort((left, right) => left.score - right.score || left.row.sort_order - right.row.sort_order);

  const first = candidates[0];
  if (!first) {
    return [
      {
        kind: 'ontology',
        title: 'Онтология: маршрут завершен',
        text: 'По связям понятий все основные блоки уже закрыты. Можно переходить к повторению тестов или углублять статьи.',
      },
    ];
  }

  if (first.missingPrerequisites.length) {
    const missingNames = first.missingPrerequisites.map((concept) => concept.title).join(', ');
    const articleRecommendation = await getArticleRecommendationForConcept(first.targetLesson.concept_id);
    return [
      {
        kind: 'ontology',
        title: `Онтология: сначала ${first.targetLesson.concept_title}`,
        text: `Для темы "${first.row.concept_title}" не хватает предпосылок: ${missingNames}. Система предлагает закрыть ближайшую связанную подтему.`,
        topicId: first.targetLesson.topic_id,
        subtopicId: first.targetLesson.subtopic_id,
      },
      articleRecommendation,
    ].filter(Boolean);
  }

  const articleRecommendation = await getArticleRecommendationForConcept(first.row.concept_id);
  return [
    {
      kind: 'ontology',
      title: `Онтология: следующий шаг — ${first.row.concept_title}`,
      text: `Понятие связано с текущим маршрутом и подходит по сложности. Рекомендуем открыть подтему "${first.row.subtopic_title}".`,
      topicId: first.row.topic_id,
      subtopicId: first.row.subtopic_id,
    },
    articleRecommendation,
  ].filter(Boolean);
};

const getRecommendations = async (userId) => {
  const [scoreRecommendations, ontologyRecommendations] = await Promise.all([
    getScoreRecommendations(userId),
    getOntologyRecommendations(userId),
  ]);

  return [...scoreRecommendations, ...ontologyRecommendations];
};

const getOntologySearch = async (query) => {
  const value = normalizeText(query).trim();
  if (!value) return [];

  const matchedRuleSlugs = ontologyTermRules
    .filter((rule) => rule.aliases.some((alias) => normalizeText(alias).includes(value) || value.includes(normalizeText(alias))))
    .map((rule) => rule.slug);

  const like = `%${value}%`;
  const { rows: subtopicRows } = await pool.query(
    `
      WITH matched_concepts AS (
        SELECT id, slug, name
        FROM ontology_concepts
        WHERE LOWER(slug) = ANY($2::text[])
          OR LOWER(name) LIKE $1
          OR LOWER(description) LIKE $1
      ),
      expanded_concepts AS (
        SELECT id, slug, name, 0 AS distance
        FROM matched_concepts

        UNION

        SELECT target.id, target.slug, target.name, 1 AS distance
        FROM ontology_relations
        JOIN matched_concepts source ON source.id = ontology_relations.source_concept_id
        JOIN ontology_concepts target ON target.id = ontology_relations.target_concept_id

        UNION

        SELECT source.id, source.slug, source.name, 1 AS distance
        FROM ontology_relations
        JOIN matched_concepts target ON target.id = ontology_relations.target_concept_id
        JOIN ontology_concepts source ON source.id = ontology_relations.source_concept_id
      )
      SELECT DISTINCT ON (subtopics.slug)
        topics.slug AS topic_id,
        topics.name AS topic_title,
        subtopics.slug AS subtopic_id,
        subtopics.name AS subtopic_title,
        subtopics.description,
        expanded_concepts.name AS concept_title,
        expanded_concepts.distance,
        subtopic_concepts.weight
      FROM expanded_concepts
      JOIN subtopic_concepts ON subtopic_concepts.concept_id = expanded_concepts.id
      JOIN subtopics ON subtopics.id = subtopic_concepts.subtopic_id
      JOIN topics ON topics.id = subtopics.topic_id
      ORDER BY subtopics.slug, expanded_concepts.distance, subtopic_concepts.weight DESC, subtopics.sort_order
      LIMIT 12
    `,
    [like, matchedRuleSlugs],
  );

  const { rows: articleRows } = await pool.query(
    `
      WITH matched_concepts AS (
        SELECT id, slug, name
        FROM ontology_concepts
        WHERE LOWER(slug) = ANY($2::text[])
          OR LOWER(name) LIKE $1
          OR LOWER(description) LIKE $1
      ),
      expanded_concepts AS (
        SELECT id, slug, name, 0 AS distance
        FROM matched_concepts

        UNION

        SELECT target.id, target.slug, target.name, 1 AS distance
        FROM ontology_relations
        JOIN matched_concepts source ON source.id = ontology_relations.source_concept_id
        JOIN ontology_concepts target ON target.id = ontology_relations.target_concept_id

        UNION

        SELECT source.id, source.slug, source.name, 1 AS distance
        FROM ontology_relations
        JOIN matched_concepts target ON target.id = ontology_relations.target_concept_id
        JOIN ontology_concepts source ON source.id = ontology_relations.source_concept_id
      )
      SELECT DISTINCT ON (article_sources.id)
        CONCAT(topics.slug, '-source-', article_sources.id) AS article_id,
        topics.name AS topic_title,
        article_sources.title AS article_title,
        article_sources.source_name,
        expanded_concepts.name AS concept_title,
        expanded_concepts.distance,
        article_source_concepts.weight
      FROM expanded_concepts
      JOIN article_source_concepts ON article_source_concepts.concept_id = expanded_concepts.id
      JOIN article_sources ON article_sources.id = article_source_concepts.article_source_id
      JOIN topics ON topics.id = article_sources.topic_id
      ORDER BY article_sources.id, expanded_concepts.distance, article_source_concepts.weight DESC, article_sources.sort_order
      LIMIT 8
    `,
    [like, matchedRuleSlugs],
  );

  const subtopicResults = subtopicRows.map((row) => ({
    type: 'Связанная тема',
    title: row.subtopic_title,
    description: `Связано с понятием: ${row.concept_title}`,
    topicId: row.topic_id,
    subtopicId: row.subtopic_id,
    ontology: true,
  }));
  const articleResults = articleRows.map((row) => ({
    type: 'Связанная статья',
    title: row.article_title,
    description: `${row.topic_title} · связано с понятием: ${row.concept_title}`,
    topicId: row.article_id,
    view: 'articles',
    ontology: true,
  }));

  return [...articleResults, ...subtopicResults];
};

const getSearchResults = async (query) => {
  const value = normalizeText(query).trim();
  if (!value) return [];

  const like = `%${value}%`;
  const { rows } = await pool.query(
    `
      SELECT *
      FROM (
        SELECT
          'Тема' AS type,
          topics.name AS title,
          topics.description AS description,
          topics.slug AS topic_id,
          NULL::text AS subtopic_id,
          NULL::text AS view,
          1 AS rank
        FROM topics
        LEFT JOIN topic_keywords ON topic_keywords.topic_id = topics.id
        WHERE LOWER(topics.name) LIKE $1
           OR LOWER(topics.description) LIKE $1
           OR LOWER(topics.level_name) LIKE $1
           OR LOWER(COALESCE(topic_keywords.keyword, '')) LIKE $1

        UNION ALL

        SELECT
          'Подтема' AS type,
          subtopics.name AS title,
          topics.name AS description,
          topics.slug AS topic_id,
          subtopics.slug AS subtopic_id,
          NULL::text AS view,
          2 AS rank
        FROM subtopics
        JOIN topics ON topics.id = subtopics.topic_id
        LEFT JOIN subtopic_keywords ON subtopic_keywords.subtopic_id = subtopics.id
        WHERE LOWER(subtopics.name) LIKE $1
           OR LOWER(subtopics.description) LIKE $1
           OR LOWER(subtopics.theory_content) LIKE $1
           OR LOWER(COALESCE(subtopic_keywords.keyword, '')) LIKE $1

        UNION ALL

        SELECT
          'Статья' AS type,
          articles.title AS title,
          topics.name AS description,
          topics.slug AS topic_id,
          NULL::text AS subtopic_id,
          'articles' AS view,
          3 AS rank
        FROM articles
        JOIN topics ON topics.id = articles.topic_id
        WHERE LOWER(articles.title) LIKE $1
           OR LOWER(articles.theory_content) LIKE $1
           OR LOWER(articles.practice_content) LIKE $1
           OR LOWER(topics.name) LIKE $1

        UNION ALL

        SELECT
          'Статья' AS type,
          article_sources.title AS title,
          CONCAT(topics.name, ' · ', article_sources.source_name) AS description,
          CONCAT(topics.slug, '-source-', article_sources.id) AS topic_id,
          NULL::text AS subtopic_id,
          'articles' AS view,
          3 AS rank
        FROM article_sources
        JOIN topics ON topics.id = article_sources.topic_id
        WHERE LOWER(article_sources.title) LIKE $1
           OR LOWER(article_sources.description) LIKE $1
           OR LOWER(article_sources.source_name) LIKE $1
           OR LOWER(topics.name) LIKE $1
      ) results
      ORDER BY rank, title
      LIMIT 8
    `,
    [like],
  );

  const directResults = rows.map((row) => ({
    type: row.type,
    title: row.title,
    description: row.description,
    topicId: row.topic_id,
    subtopicId: row.subtopic_id,
    view: row.view,
  }));
  const ontologyResults = await getOntologySearch(query);
  const seen = new Set();

  return [...directResults, ...ontologyResults]
    .filter((result) => {
      const key = `${result.view ?? 'topic'}:${result.topicId}:${result.subtopicId ?? ''}:${result.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
};

const articleTextByTopic = {
  intro: {
    theory: `Обучение с подкреплением рассматривает задачу, в которой агент учится действовать через опыт. Он не получает готовые правильные ответы, а взаимодействует со средой, выбирает действия и получает награду. По этой награде агент постепенно понимает, какие решения приближают его к цели.

Основные элементы RL: агент, среда, состояние, действие и награда. Агент принимает решение. Среда отвечает на это решение новым состоянием и наградой. Состояние описывает текущую ситуацию, действие меняет ход процесса, а награда показывает полезность результата.

Главная особенность RL — последовательность решений. Одно действие может быть невыгодным сейчас, но полезным позже. Поэтому агенту нужно учитывать не только ближайшую награду, но и будущие последствия. Это отличает RL от классического обучения с учителем, где ошибка обычно видна сразу.

Важная проблема — баланс исследования и использования. Исследование помогает находить новые действия, а использование позволяет применять уже найденные хорошие решения. Если агент только исследует, обучение идет медленно. Если только использует известное, он может застрять в плохой стратегии.

RL применяется в играх, робототехнике, управлении транспортом, финансах, энергетике и рекомендательных системах. Во всех этих задачах нужно выбирать действия во времени и улучшать поведение по обратной связи.`,
    practice: `Для закрепления можно описать простую среду-лабиринт: агент — персонаж, состояние — координаты, действия — шаги, награда — штраф за шаг и плюс за выход. Такая постановка показывает полный цикл RL.`,
  },
  mdp: {
    theory: `Марковский процесс принятия решений, или MDP, формально описывает задачу обучения с подкреплением. Он задает состояния, действия, вероятности переходов, награды и коэффициент дисконтирования. Благодаря MDP поведение агента можно анализировать математически.

Состояние содержит информацию, которая нужна агенту для выбора действия. Действие переводит процесс в новое состояние. Переход может быть вероятностным: одно и то же действие иногда приводит к разным результатам. Награда показывает полезность перехода.

Марковское свойство означает, что будущее зависит от текущего состояния и действия, а не от полной истории. Если состояние выбрано правильно, прошлые шаги уже не нужны для прогноза следующего результата. Это упрощает задачу и делает возможными алгоритмы динамического программирования.

Коэффициент дисконтирования показывает, насколько агент учитывает будущее. При малом значении агент ориентируется на ближайшие награды. При значении, близком к единице, будущие награды становятся почти такими же важными, как текущие.

MDP лежит в основе уравнений Беллмана, policy iteration, value iteration, Q-learning и SARSA. Поэтому эта модель является фундаментом для большинства алгоритмов RL.`,
    practice: `Практически MDP удобно записать для задачи Taxi или лабиринта: перечислить состояния, действия, награды и правило перехода в новое состояние.`,
  },
  'value-methods': {
    theory: `Методы на основе функции ценности оценивают полезность состояний и действий. Вместо прямого поиска поведения агент сначала учится предсказывать, какую суммарную награду можно получить из конкретной ситуации.

Функция V(s) показывает ценность состояния. Если из состояния обычно можно прийти к высокой награде, его значение будет большим. Функция Q(s,a) оценивает пару состояние-действие и помогает сравнивать действия напрямую.

Оценки обновляются на основе опыта. Агент наблюдает переход, получает награду и корректирует прежнее значение. Если результат лучше ожиданий, оценка повышается. Если хуже — понижается. Так постепенно строится карта полезности состояний и действий.

Методы Монте-Карло используют полный эпизод и обновляют оценки по фактическому возврату. TD-методы обновляют значения после одного шага, используя текущий прогноз будущей ценности. TD-подходы чаще применяются в длинных задачах, где ждать завершения эпизода неудобно.

Value-based подходы важны для понимания Q-learning, SARSA и DQN. Даже когда вместо таблицы используется нейронная сеть, идея остается той же: оценить будущую выгоду и выбрать действие на основе этой оценки.`,
    practice: `Для практики можно вручную посчитать V(s) и Q(s,a) для нескольких переходов, а затем сравнить, как меняется выбор действия после обновления оценок.`,
  },
  'q-learning': {
    theory: `Q-learning обучает функцию Q(s,a), которая показывает ожидаемую полезность действия a в состоянии s. После обучения агент может выбирать действие с максимальным Q-значением и получать хорошую долгосрочную награду.

Алгоритм работает по одному переходу. Агент находится в состоянии, выбирает действие, получает награду и новое состояние. Затем Q-значение обновляется с учетом текущей награды и лучшей оценки будущего действия.

Формула обновления выглядит так: Q(s,a) ← Q(s,a) + α [r + γ max Q(s',a') - Q(s,a)]. Параметр α управляет скоростью обучения, γ отвечает за важность будущих наград. Разность внутри скобок называется TD-ошибкой.

Q-learning является off-policy методом. Он учится оптимальной стратегии, даже если во время обучения агент иногда действует исследовательски. Обычно для этого используют ε-жадную стратегию: иногда выбирается случайное действие, а обычно — лучшее по текущей Q-таблице.

Метод хорошо подходит для небольших дискретных задач. Если состояний слишком много, Q-таблица становится огромной, и тогда переходят к аппроксимации Q-функции, например с помощью нейронной сети в DQN.`,
    practice: `Практическое упражнение: реализовать функцию обновления Q-значения и проверить, как меняется таблица после серии переходов.`,
  },
  sarsa: {
    theory: `SARSA похож на Q-learning, но использует действие, которое агент реально выбрал в следующем состоянии. Название SARSA отражает последовательность: State, Action, Reward, State, Action.

Главное отличие заключается в цели обновления. Q-learning берет максимум по действиям в следующем состоянии, а SARSA берет Q(s',a'), где a' выбрано текущей стратегией. Поэтому SARSA относится к on-policy методам.

On-policy обучение учитывает реальное поведение агента, включая исследование. Если стратегия иногда выбирает рискованные действия, SARSA учитывает этот риск в оценке. Поэтому в опасных средах SARSA часто ведет себя осторожнее.

Классический пример — Cliff Walking. Q-learning может предпочитать короткий путь рядом с обрывом, потому что предполагает оптимальное будущее поведение. SARSA учитывает, что агент иногда исследует и может случайно упасть, поэтому выбирает более безопасный маршрут.

SARSA полезен для понимания различий между алгоритмами RL. Он показывает, что способ выбора следующего действия влияет не только на обучение, но и на итоговое поведение агента.`,
    practice: `Для практики можно сравнить две формулы: в SARSA использовать Q(s',a'), а в Q-learning — max Q(s',a). На одном примере сразу видно различие.`,
  },
  dqn: {
    theory: `DQN переносит Q-learning на задачи, где невозможно хранить таблицу Q-значений. Вместо таблицы используется нейронная сеть, которая получает состояние и выдает оценки действий.

Такой подход нужен, когда состояние сложное: изображение экрана, большое число признаков или непрерывное пространство. Нейронная сеть обобщает опыт и может давать оценки для состояний, которых не было в таблице.

Для устойчивости DQN использует replay buffer. Переходы сохраняются в память, а затем случайные мини-батчи используются для обучения. Это разрушает сильную зависимость между соседними шагами и позволяет переиспользовать опыт.

Вторая важная часть — target network. Отдельная целевая сеть используется для расчета TD-целей и обновляется реже. Это делает обучение стабильнее, потому что цель не меняется слишком резко.

DQN стал важным этапом развития Deep RL. Он показал, что value-based методы можно соединить с глубокими нейронными сетями и применять к более сложным средам.`,
    practice: `Практически DQN можно представить как замену Q-таблицы функцией predict_q(state), добавив replay buffer и отдельную target network.`,
  },
  'actor-critic': {
    theory: `Actor-Critic объединяет два компонента. Actor выбирает действия, то есть задает стратегию. Critic оценивает, насколько хороши действия или состояния, и дает actor сигнал для улучшения.

Такой подход удобен, когда действие сложно выбирать через таблицу или максимум Q-значений. Actor может напрямую задавать вероятности действий или параметры непрерывного управления. Critic помогает снизить шум в обучении.

Critic часто оценивает V(s), Q(s,a) или advantage. Преимущество показывает, насколько выбранное действие лучше среднего поведения в этом состоянии. Если преимущество положительное, actor увеличивает вероятность такого действия.

Методы policy gradient напрямую изменяют стратегию в сторону большей ожидаемой награды. Actor-Critic делает это устойчивее, потому что использует оценку critic как дополнительный ориентир.

К этому семейству относятся A2C, A3C, PPO, DDPG и SAC. Они применяются в робототехнике, симуляциях, играх и задачах управления, где требуется гибкая стратегия.`,
    practice: `Для практики можно разделить код на две функции: actor выбирает действие, critic возвращает оценку, а advantage показывает, усиливать или ослаблять выбранное действие.`,
  },
};

const buildReadableArticle = (row) => {
  const content = articleTextByTopic[row.topic_id] ?? articleTextByTopic.intro;
  const extraText = `\n\nПри изучении этой темы важно смотреть не только на определения, но и на связь между понятиями. В обучении с подкреплением почти каждый термин используется внутри общего цикла: агент наблюдает состояние, выбирает действие, получает награду и корректирует дальнейшее поведение. Поэтому материал лучше воспринимается как единая система, а не как набор отдельных формул.\n\nДля учебного проекта эта статья служит дополнительным теоретическим материалом к теме. Она помогает повторить основные идеи перед тестом, связать подтемы между собой и понять, почему конкретный алгоритм используется именно в такой постановке. Если после чтения остаются трудности, полезно вернуться к соответствующей подтеме курса и пройти тест еще раз.`;
  return {
    theory: `Материал по источнику: "${row.title}".\n\n${content.theory}${extraText}`,
    practice: '',
  };
};

const getProfilePayload = async (userId) => {
  if (!userId) {
    return { student: null, progress: {} };
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) {
    return { student: null, progress: {} };
  }

  return {
    student: mapUser(rows[0]),
    progress: await getProgress(userId),
    testResults: await getTestHistory(userId),
    recommendations: await getRecommendations(userId),
  };
};

const routes = {
  'GET /api/health': async () => {
    const { rows } = await pool.query('SELECT NOW() AS now');
    return { status: 200, payload: { ok: true, databaseTime: rows[0].now } };
  },

  'GET /api/topics': async () => {
    return { status: 200, payload: await getTopics() };
  },

  'GET /api/articles': async () => {
    const { rows } = await pool.query(`
      SELECT
        CONCAT(topics.slug, '-source-', article_sources.id) AS article_id,
        topics.slug AS topic_id,
        topics.name AS topic_title,
        topics.description AS topic_description,
        article_sources.title,
        article_sources.url,
        article_sources.source_name,
        article_sources.description,
        article_sources.sort_order
      FROM topics
      JOIN article_sources ON article_sources.topic_id = topics.id
      ORDER BY topics.sort_order, article_sources.sort_order
    `);

    return {
      status: 200,
      payload: rows.map((row) => ({
        id: row.article_id,
        topicId: row.topic_id,
        title: row.title,
        topicTitle: row.topic_title,
        description: row.description || row.topic_description,
        theory: buildReadableArticle(row).theory,
        practice: buildReadableArticle(row).practice,
        keywords: [],
        sources: [
          {
            title: row.title,
            url: row.url,
            sourceName: row.source_name,
            description: row.description,
          },
        ],
      })),
    };
  },

  'GET /api/search': async (request, url) => {
    const query = url.searchParams.get('q') ?? '';
    return { status: 200, payload: await getSearchResults(query) };
  },

  'POST /api/register': async (request) => {
    const body = await readBody(request);
    const userId = body.userId ? Number(body.userId) : null;
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const studentGroup = String(body.group ?? '').trim() || null;
    const course = body.course ? Number(body.course) : null;
    const goal = String(body.goal ?? '').trim() || null;

    if (!fullName || !email) {
      return { status: 400, payload: { error: 'Full name and email are required.' } };
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const emailOwner = existingUser.rows[0];
    if (emailOwner && (!userId || Number(emailOwner.id) !== userId)) {
      return { status: 409, payload: { error: 'Пользователь с таким email уже зарегистрирован.' } };
    }

    if (!userId && !password) {
      return { status: 400, payload: { error: 'Password is required.' } };
    }

    const passwordHash = password ? await hashPassword(password) : null;
    const { rows } = userId
      ? await pool.query(
          `
            UPDATE users
            SET
              full_name = $1,
              password_hash = COALESCE($3, password_hash),
              student_group = $4,
              course = $5,
              learning_goal = $6,
              updated_at = NOW()
            WHERE id = $7 AND email = $2
            RETURNING *
          `,
          [fullName, email, passwordHash, studentGroup, course, goal, userId],
        )
      : await pool.query(
          `
            INSERT INTO users (full_name, email, password_hash, student_group, course, learning_goal)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `,
          [fullName, email, passwordHash, studentGroup, course, goal],
        );

    if (!rows.length) {
      return { status: 404, payload: { error: 'Пользователь не найден или email нельзя изменить.' } };
    }

    return {
      status: 200,
      payload: {
        student: mapUser(rows[0]),
        progress: await getProgress(rows[0].id),
        testResults: await getTestHistory(rows[0].id),
        recommendations: await getRecommendations(rows[0].id),
      },
    };
  },

  'POST /api/login': async (request) => {
    const body = await readBody(request);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (rows.length === 0 || !(await verifyPassword(password, rows[0].password_hash))) {
      return { status: 401, payload: { error: 'Invalid email or password.' } };
    }

    if (!isBcryptHash(rows[0].password_hash)) {
      const nextHash = await hashPassword(password);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [nextHash, rows[0].id]);
      rows[0].password_hash = nextHash;
    }

    return {
      status: 200,
      payload: {
        student: mapUser(rows[0]),
        progress: await getProgress(rows[0].id),
        testResults: await getTestHistory(rows[0].id),
        recommendations: await getRecommendations(rows[0].id),
      },
    };
  },

  'POST /api/profile': async (request) => {
    const body = await readBody(request);
    return { status: 200, payload: await getProfilePayload(body.userId) };
  },

  'POST /api/progress': async (request) => {
    const body = await readBody(request);
    const userId = Number(body.userId);
    const subtopicSlug = String(body.subtopicId ?? '');

    if (!userId || !subtopicSlug) {
      return { status: 400, payload: { error: 'User and subtopic are required.' } };
    }

    const { rows } = await pool.query('SELECT id FROM subtopics WHERE slug = $1', [subtopicSlug]);
    if (rows.length === 0) {
      return { status: 404, payload: { error: 'Subtopic not found.' } };
    }

    await pool.query(
      `
        INSERT INTO user_subtopic_progress (user_id, subtopic_id, status, completed_at, updated_at)
        VALUES ($1, $2, 'completed', NOW(), NOW())
        ON CONFLICT (user_id, subtopic_id) DO UPDATE SET
          status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      `,
      [userId, rows[0].id],
    );

    return { status: 200, payload: { progress: await getProgress(userId) } };
  },

  'GET /api/tests': async () => {
    const { rows } = await pool.query(`
      WITH selected_tests AS (
        SELECT DISTINCT ON (subtopic_id) id, topic_id, subtopic_id
        FROM tests
        WHERE subtopic_id IS NOT NULL
        ORDER BY subtopic_id, id
      )
      SELECT
        selected_tests.id AS test_id,
        topics.slug AS topic_slug,
        subtopics.slug AS subtopic_slug,
        questions.id AS question_id,
        questions.question_text,
        questions.sort_order AS question_order,
        answer_options.id AS option_id,
        answer_options.option_text,
        answer_options.is_correct,
        answer_options.sort_order AS option_order
      FROM selected_tests
      JOIN topics ON topics.id = selected_tests.topic_id
      LEFT JOIN subtopics ON subtopics.id = selected_tests.subtopic_id
      JOIN questions ON questions.test_id = selected_tests.id
      JOIN answer_options ON answer_options.question_id = questions.id
      WHERE BTRIM(questions.question_text) <> ''
      ORDER BY topics.sort_order, subtopics.sort_order, questions.sort_order, answer_options.sort_order
    `);

    const testsBySubtopic = {};
    for (const row of rows) {
      testsBySubtopic[row.subtopic_slug] ??= { id: row.test_id, topicId: row.topic_slug, questions: [] };
      let question = testsBySubtopic[row.subtopic_slug].questions.find((item) => item.id === row.question_id);
      if (!question) {
        question = {
          id: row.question_id,
          question: row.question_text,
          options: [],
        };
        testsBySubtopic[row.subtopic_slug].questions.push(question);
      }
      question.options.push({ id: row.option_id, text: row.option_text, isCorrect: row.is_correct });
    }

    return { status: 200, payload: testsBySubtopic };
  },

  'POST /api/submit-test': async (request) => {
    const body = await readBody(request);
    const userId = Number(body.userId);
    const subtopicSlug = String(body.subtopicId ?? '');
    const answers = body.answers ?? {};

    if (!userId || !subtopicSlug) {
      return { status: 400, payload: { error: 'User and subtopic are required.' } };
    }

    const testResult = await pool.query(
      `
        SELECT
          tests.id,
          tests.passing_score,
          topics.slug AS topic_id,
          topics.name AS topic_title,
          subtopics.name AS subtopic_title
        FROM tests
        JOIN subtopics ON subtopics.id = tests.subtopic_id
        JOIN topics ON topics.id = subtopics.topic_id
        WHERE subtopics.slug = $1
        ORDER BY tests.id
        LIMIT 1
      `,
      [subtopicSlug],
    );

    if (testResult.rows.length === 0) {
      return { status: 404, payload: { error: 'Test not found.' } };
    }

    const test = testResult.rows[0];
    const optionsResult = await pool.query(
      `
        SELECT
          questions.id AS question_id,
          answer_options.id AS option_id,
          answer_options.is_correct
        FROM questions
        JOIN answer_options ON answer_options.question_id = questions.id
        WHERE questions.test_id = $1
          AND BTRIM(questions.question_text) <> ''
        ORDER BY questions.sort_order, answer_options.sort_order
      `,
      [test.id],
    );

    const questionIds = [...new Set(optionsResult.rows.map((row) => String(row.question_id)))];
    const correctByQuestion = new Map(
      optionsResult.rows
        .filter((row) => row.is_correct)
        .map((row) => [String(row.question_id), String(row.option_id)]),
    );

    let correctCount = 0;
    const answerRows = questionIds.map((questionId) => {
      const selectedOptionId = answers[questionId] ? String(answers[questionId]) : null;
      const isCorrect = selectedOptionId && selectedOptionId === correctByQuestion.get(questionId);
      if (isCorrect) correctCount += 1;
      return { questionId, selectedOptionId, isCorrect: Boolean(isCorrect) };
    });

    const score = questionIds.length ? Math.round((correctCount / questionIds.length) * 100) : 0;
    const passed = score >= test.passing_score;

    const savedResult = await pool.query(
      `
        INSERT INTO test_results (user_id, test_id, score, passed)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [userId, test.id, score, passed],
    );

    for (const answer of answerRows) {
      await pool.query(
        `
          INSERT INTO user_answers (result_id, question_id, answer_option_id, is_correct)
          VALUES ($1, $2, $3, $4)
        `,
        [savedResult.rows[0].id, answer.questionId, answer.selectedOptionId, answer.isCorrect],
      );
    }

    if (passed) {
      const subtopic = await pool.query('SELECT id FROM subtopics WHERE slug = $1', [subtopicSlug]);
      await pool.query(
        `
          INSERT INTO user_subtopic_progress (user_id, subtopic_id, status, completed_at, updated_at)
          VALUES ($1, $2, 'completed', NOW(), NOW())
          ON CONFLICT (user_id, subtopic_id) DO UPDATE SET
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        `,
        [userId, subtopic.rows[0].id],
      );
    }

    const recommendations = await getRecommendations(userId);
    const articleRecommendation = {
      kind: 'article',
      title: '\u0421\u0442\u0430\u0442\u044c\u044f \u043f\u043e \u0442\u0435\u043c\u0435',
      text: `\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0441\u0442\u0430\u0442\u044c\u044e "${test.topic_title}", \u0447\u0442\u043e\u0431\u044b \u0443\u0432\u0438\u0434\u0435\u0442\u044c, \u043a\u0430\u043a \u043f\u043e\u0434\u0442\u0435\u043c\u0430 "${test.subtopic_title}" \u0441\u0432\u044f\u0437\u0430\u043d\u0430 \u0441 \u043e\u0431\u0449\u0438\u043c \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u043e\u043c.`,
      topicId: test.topic_id,
      subtopicId: subtopicSlug,
    };

    return {
      status: 200,
      payload: {
        score,
        passed,
        progress: await getProgress(userId),
        testResults: await getTestHistory(userId),
        recommendations: [articleRecommendation, ...recommendations],
      },
    };
  },

  'POST /api/run-python': async (request) => {
    const body = await readBody(request);
    const code = String(body.code ?? '');

    if (!code.trim()) {
      return { status: 400, payload: { error: 'Код пустой.' } };
    }

    if (code.length > 12000) {
      return { status: 400, payload: { error: 'Код слишком большой для песочницы.' } };
    }

    const result = await runPythonCode(code);
    return { status: 200, payload: result };
  },

  'POST /api/admin/article': async (request) => {
    const body = await readBody(request);
    if (!(await requireAdmin(body.userId))) return { status: 403, payload: { error: 'Admin role required.' } };

    await pool.query(
      `
        UPDATE articles
        SET title = $1, theory_content = $2, practice_content = $3, updated_at = NOW()
        FROM topics
        WHERE articles.topic_id = topics.id AND topics.slug = $4
      `,
      [body.title, body.theory, body.practice, body.topicId],
    );
    const ontology = await syncOntologyForTopic(body.topicId);

    return { status: 200, payload: { topics: await getTopics(), ontology } };
  },

  'POST /api/admin/subtopic': async (request) => {
    const body = await readBody(request);
    if (!(await requireAdmin(body.userId))) return { status: 403, payload: { error: 'Admin role required.' } };

    await pool.query('UPDATE subtopics SET name = $1, description = $2 WHERE slug = $3', [
      body.title,
      body.description,
      body.subtopicId,
    ]);
    const ontology = await syncOntologyForSubtopic(body.subtopicId);

    return { status: 200, payload: { topics: await getTopics(), ontology } };
  },

  'POST /api/admin/subtopic/create': async (request) => {
    const body = await readBody(request);
    if (!(await requireAdmin(body.userId))) return { status: 403, payload: { error: 'Admin role required.' } };

    const topicResult = await pool.query('SELECT id FROM topics WHERE slug = $1', [body.topicId]);
    if (topicResult.rows.length === 0) return { status: 404, payload: { error: 'Topic not found.' } };

    const topicId = topicResult.rows[0].id;
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM subtopics WHERE topic_id = $1', [
      topicId,
    ]);
    const baseSlug = String(body.title ?? 'new-subtopic')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const slug = `${body.topicId}-${baseSlug || 'subtopic'}-${Date.now()}`;

    const subtopicResult = await pool.query(
      `
        INSERT INTO subtopics (topic_id, slug, name, description, sort_order)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name
      `,
      [topicId, slug, body.title || 'Новая подтема', body.description || '', maxOrder.rows[0].next_order],
    );

    const testResult = await pool.query(
      `
        INSERT INTO tests (topic_id, subtopic_id, title)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [topicId, subtopicResult.rows[0].id, `Тест: ${subtopicResult.rows[0].name}`],
    );

    const questionResult = await pool.query(
      `
        INSERT INTO questions (test_id, sort_order)
        VALUES ($1, 1)
        RETURNING id
      `,
      [testResult.rows[0].id],
    );

    for (const order of [1, 2, 3, 4]) {
      await pool.query('INSERT INTO answer_options (question_id, sort_order, is_correct) VALUES ($1, $2, $3)', [
        questionResult.rows[0].id,
        order,
        order === 1,
      ]);
    }
    const ontology = await syncOntologyForTopic(body.topicId);

    return { status: 200, payload: { topics: await getTopics(), tests: (await routes['GET /api/tests']()).payload, ontology } };
  },

  'POST /api/admin/question': async (request) => {
    const body = await readBody(request);
    if (!(await requireAdmin(body.userId))) return { status: 403, payload: { error: 'Admin role required.' } };

    await pool.query('UPDATE questions SET question_text = $1 WHERE id = $2', [body.question, body.questionId]);
    for (const option of body.options ?? []) {
      await pool.query('UPDATE answer_options SET option_text = $1, is_correct = $2 WHERE id = $3', [
        option.text,
        Boolean(option.isCorrect),
        option.id,
      ]);
    }

    return { status: 200, payload: { tests: (await routes['GET /api/tests']()).payload } };
  },

  'POST /api/admin/question/create': async (request) => {
    const body = await readBody(request);
    if (!(await requireAdmin(body.userId))) return { status: 403, payload: { error: 'Admin role required.' } };

    const testResult = await pool.query(
      `
        SELECT tests.id
        FROM tests
        JOIN subtopics ON subtopics.id = tests.subtopic_id
        WHERE subtopics.slug = $1
      `,
      [body.subtopicId],
    );
    if (testResult.rows.length === 0) return { status: 404, payload: { error: 'Test not found.' } };

    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM questions WHERE test_id = $1', [
      testResult.rows[0].id,
    ]);

    const questionResult = await pool.query(
      `
        INSERT INTO questions (test_id, question_text, sort_order)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [testResult.rows[0].id, body.question || '', maxOrder.rows[0].next_order],
    );

    const options = body.options?.length ? body.options : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
    for (const [index, option] of options.entries()) {
      await pool.query('INSERT INTO answer_options (question_id, option_text, is_correct, sort_order) VALUES ($1, $2, $3, $4)', [
        questionResult.rows[0].id,
        option.text ?? '',
        Boolean(option.isCorrect) || index === 0,
        index + 1,
      ]);
    }

    return { status: 200, payload: { tests: (await routes['GET /api/tests']()).payload } };
  },
};

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const route = routes[`${request.method} ${url.pathname}`];

  if (!route) {
    if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
      await sendStaticFile(response, url.pathname);
      return;
    }
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  try {
    const result = await route(request, url);
    sendJson(response, result.status, result.payload);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error' });
  }
});

const port = Number(process.env.PORT ?? 4000);

server.listen(port, () => {
  if (process.stdout.writable) {
    console.log(`API server is running at http://127.0.0.1:${port}`);
  }
});
