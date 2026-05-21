CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'student',
  student_group VARCHAR(50),
  course SMALLINT,
  learning_goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level_name VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS topic_keywords (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  UNIQUE (topic_id, keyword)
);

CREATE TABLE IF NOT EXISTS articles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id BIGINT NOT NULL UNIQUE REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  theory_content TEXT NOT NULL DEFAULT '',
  practice_content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subtopics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  theory_content TEXT NOT NULL DEFAULT '',
  illustration_key VARCHAR(100),
  sort_order INTEGER NOT NULL,
  UNIQUE (topic_id, sort_order)
);

CREATE TABLE IF NOT EXISTS subtopic_keywords (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subtopic_id BIGINT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  UNIQUE (subtopic_id, keyword)
);

CREATE TABLE IF NOT EXISTS tests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id BIGINT REFERENCES subtopics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  passing_score SMALLINT NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS questions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL DEFAULT '',
  question_type VARCHAR(30) NOT NULL DEFAULT 'single_choice',
  sort_order INTEGER NOT NULL,
  UNIQUE (test_id, sort_order)
);

CREATE TABLE IF NOT EXISTS answer_options (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL,
  UNIQUE (question_id, sort_order)
);

CREATE TABLE IF NOT EXISTS test_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_answers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  result_id BIGINT NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_option_id BIGINT REFERENCES answer_options(id) ON DELETE SET NULL,
  text_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (result_id, question_id)
);

CREATE TABLE IF NOT EXISTS user_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS user_subtopic_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtopic_id BIGINT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subtopic_id)
);

CREATE TABLE IF NOT EXISTS ontology_concepts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  complexity SMALLINT NOT NULL DEFAULT 1 CHECK (complexity BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS ontology_relations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_concept_id BIGINT NOT NULL REFERENCES ontology_concepts(id) ON DELETE CASCADE,
  target_concept_id BIGINT NOT NULL REFERENCES ontology_concepts(id) ON DELETE CASCADE,
  relation_type VARCHAR(40) NOT NULL DEFAULT 'requires',
  UNIQUE (source_concept_id, target_concept_id, relation_type)
);

CREATE TABLE IF NOT EXISTS subtopic_concepts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subtopic_id BIGINT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  concept_id BIGINT NOT NULL REFERENCES ontology_concepts(id) ON DELETE CASCADE,
  weight SMALLINT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
  UNIQUE (subtopic_id, concept_id)
);

INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'admin@example.com',
  '$2b$12$PKzhIm.3FbjmE1WSJ4LiEO8/B8luUG5yp1vNCOFNWP0hZuFT.QD1a',
  'Администратор',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

INSERT INTO topics (slug, name, description, level_name, sort_order)
VALUES
  ('intro', 'Введение в обучение с подкреплением', 'Базовые понятия: агент, среда, состояние, действие и награда.', 'Базовый', 1),
  ('mdp', 'Марковские процессы принятия решений', 'Формальная модель задачи и связь с последовательным выбором действий.', 'Базовый', 2),
  ('value-methods', 'Методы на основе функции ценности', 'Идея оценки состояний и действий для выбора оптимальной стратегии.', 'Средний', 3),
  ('q-learning', 'Q-learning', 'Внедорожный алгоритм временных различий для обучения функции Q.', 'Средний', 4),
  ('sarsa', 'SARSA', 'On-policy подход к обновлению оценки действий с учетом текущей стратегии.', 'Средний', 5),
  ('dqn', 'Deep Q-Network', 'Использование нейронной сети для аппроксимации функции ценности действий.', 'Продвинутый', 6),
  ('actor-critic', 'Акторно-критические алгоритмы', 'Разделение выбора действий и оценки качества стратегии.', 'Продвинутый', 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO topic_keywords (topic_id, keyword)
SELECT topics.id, keywords.keyword
FROM topics
JOIN (
  VALUES
    ('intro', 'агент'), ('intro', 'среда'), ('intro', 'награда'), ('intro', 'основы'),
    ('mdp', 'MDP'), ('mdp', 'состояние'), ('mdp', 'политика'), ('mdp', 'Беллман'),
    ('value-methods', 'value'), ('value-methods', 'policy'), ('value-methods', 'Беллман'),
    ('q-learning', 'Q-learning'), ('q-learning', 'TD'), ('q-learning', 'off-policy'),
    ('sarsa', 'SARSA'), ('sarsa', 'TD'), ('sarsa', 'on-policy'),
    ('dqn', 'DQN'), ('dqn', 'нейросети'), ('dqn', 'experience replay'),
    ('actor-critic', 'actor'), ('actor-critic', 'critic'), ('actor-critic', 'policy gradient')
) AS keywords(slug, keyword) ON keywords.slug = topics.slug
ON CONFLICT (topic_id, keyword) DO NOTHING;

INSERT INTO articles (topic_id, title, theory_content, practice_content)
SELECT id, name, 'Пустой текст статьи. Здесь позднее можно разместить теоретический материал по теме.',
       'Пустой практический блок. Здесь позднее можно разместить примеры, формулы и код.'
FROM topics
ON CONFLICT (topic_id) DO NOTHING;

INSERT INTO subtopics (topic_id, slug, name, description, sort_order)
SELECT topics.id, subtopic_data.slug, subtopic_data.name, subtopic_data.description, subtopic_data.sort_order
FROM topics
JOIN (
  VALUES
    ('intro', 'intro-concepts', 'Основные понятия RL', 'Пустая подтема для терминов: агент, среда, состояние, действие, награда.', 1),
    ('intro', 'intro-cycle', 'Цикл взаимодействия агента со средой', 'Пустая подтема для описания последовательности наблюдение - действие - награда.', 2),
    ('mdp', 'mdp-elements', 'Элементы MDP', 'Пустая подтема для состояний, действий, переходов и наград.', 1),
    ('mdp', 'mdp-bellman', 'Уравнения Беллмана', 'Пустая подтема для будущего разбора рекуррентных соотношений.', 2),
    ('value-methods', 'value-functions', 'Функции ценности', 'Пустая подтема для V-функции и Q-функции.', 1),
    ('value-methods', 'value-policy', 'Улучшение стратегии', 'Пустая подтема для связи оценки и выбора действий.', 2),
    ('q-learning', 'q-learning-update', 'Правило обновления Q-learning', 'Пустая подтема для формулы обновления Q-значений.', 1),
    ('q-learning', 'q-learning-exploration', 'Исследование и эксплуатация', 'Пустая подтема для epsilon-greedy и выбора действий.', 2),
    ('sarsa', 'sarsa-update', 'Правило обновления SARSA', 'Пустая подтема для on-policy обновления.', 1),
    ('sarsa', 'sarsa-comparison', 'Сравнение SARSA и Q-learning', 'Пустая подтема для различий on-policy и off-policy.', 2),
    ('dqn', 'dqn-network', 'Нейронная аппроксимация Q-функции', 'Пустая подтема для архитектуры DQN.', 1),
    ('dqn', 'dqn-replay', 'Experience replay и target network', 'Пустая подтема для стабилизации обучения.', 2),
    ('actor-critic', 'actor-critic-roles', 'Actor и Critic', 'Пустая подтема для ролей двух компонентов алгоритма.', 1),
    ('actor-critic', 'actor-critic-advantage', 'Advantage и обновление политики', 'Пустая подтема для будущего разбора преимущества.', 2)
) AS subtopic_data(topic_slug, slug, name, description, sort_order)
  ON subtopic_data.topic_slug = topics.slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tests (topic_id, subtopic_id, title)
SELECT subtopics.topic_id, subtopics.id, 'Тест: ' || subtopics.name
FROM subtopics
WHERE NOT EXISTS (SELECT 1 FROM tests WHERE tests.subtopic_id = subtopics.id);

INSERT INTO questions (test_id, sort_order)
SELECT tests.id, question_numbers.sort_order
FROM tests
CROSS JOIN (VALUES (1), (2), (3)) AS question_numbers(sort_order)
WHERE tests.subtopic_id IS NOT NULL
ON CONFLICT (test_id, sort_order) DO NOTHING;

INSERT INTO answer_options (question_id, sort_order)
SELECT questions.id, option_numbers.sort_order
FROM questions
CROSS JOIN (VALUES (1), (2), (3), (4)) AS option_numbers(sort_order)
ON CONFLICT (question_id, sort_order) DO NOTHING;

INSERT INTO ontology_concepts (slug, name, description, complexity)
VALUES
  ('agent', 'Агент', 'Сущность, которая выбирает действия и учится по обратной связи среды.', 1),
  ('environment', 'Среда', 'Внешняя система, которая отвечает на действия агента состояниями и наградами.', 1),
  ('state', 'Состояние', 'Описание текущей ситуации, на основе которого агент принимает решение.', 1),
  ('action', 'Действие', 'Выбор агента, влияющий на следующее состояние и награду.', 1),
  ('reward', 'Награда', 'Числовой сигнал качества действия, который направляет обучение.', 1),
  ('mdp', 'Марковский процесс принятия решений', 'Формальная модель задачи обучения с подкреплением.', 2),
  ('policy', 'Стратегия', 'Правило выбора действия в зависимости от состояния.', 2),
  ('bellman', 'Уравнения Беллмана', 'Рекуррентные соотношения для оценки ценности состояний и действий.', 3),
  ('value-function', 'Функция ценности', 'Оценка ожидаемой полезности состояния или действия.', 3),
  ('td-learning', 'TD-обучение', 'Метод обновления оценок по разности между прогнозом и новым наблюдением.', 3),
  ('exploration', 'Исследование и эксплуатация', 'Баланс между поиском новых действий и использованием известных хороших действий.', 3),
  ('q-learning', 'Q-learning', 'Off-policy алгоритм обучения функции ценности действий.', 4),
  ('sarsa', 'SARSA', 'On-policy алгоритм временных различий.', 4),
  ('dqn', 'Deep Q-Network', 'Расширение Q-learning с нейронной сетью для аппроксимации Q-функции.', 5),
  ('actor-critic', 'Actor-Critic', 'Семейство методов, где actor выбирает действия, а critic оценивает стратегию.', 5)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  complexity = EXCLUDED.complexity;

INSERT INTO ontology_relations (source_concept_id, target_concept_id, relation_type)
SELECT source.id, target.id, relation_data.relation_type
FROM (
  VALUES
    ('mdp', 'agent', 'requires'),
    ('mdp', 'environment', 'requires'),
    ('mdp', 'state', 'requires'),
    ('mdp', 'action', 'requires'),
    ('mdp', 'reward', 'requires'),
    ('policy', 'state', 'requires'),
    ('policy', 'action', 'requires'),
    ('bellman', 'mdp', 'requires'),
    ('value-function', 'bellman', 'requires'),
    ('td-learning', 'value-function', 'requires'),
    ('exploration', 'policy', 'requires'),
    ('q-learning', 'td-learning', 'requires'),
    ('q-learning', 'exploration', 'requires'),
    ('sarsa', 'td-learning', 'requires'),
    ('sarsa', 'policy', 'requires'),
    ('dqn', 'q-learning', 'requires'),
    ('actor-critic', 'policy', 'requires'),
    ('actor-critic', 'value-function', 'requires')
) AS relation_data(source_slug, target_slug, relation_type)
JOIN ontology_concepts source ON source.slug = relation_data.source_slug
JOIN ontology_concepts target ON target.slug = relation_data.target_slug
ON CONFLICT (source_concept_id, target_concept_id, relation_type) DO NOTHING;

INSERT INTO subtopic_concepts (subtopic_id, concept_id, weight)
SELECT subtopics.id, ontology_concepts.id, concept_data.weight
FROM (
  VALUES
    ('intro-concepts', 'agent', 5),
    ('intro-concepts', 'environment', 5),
    ('intro-concepts', 'reward', 5),
    ('intro-cycle', 'state', 4),
    ('intro-cycle', 'action', 4),
    ('intro-cycle', 'policy', 2),
    ('mdp-elements', 'mdp', 5),
    ('mdp-elements', 'state', 3),
    ('mdp-elements', 'action', 3),
    ('mdp-bellman', 'bellman', 5),
    ('mdp-bellman', 'value-function', 3),
    ('value-functions', 'value-function', 5),
    ('value-functions', 'bellman', 3),
    ('value-policy', 'policy', 5),
    ('value-policy', 'exploration', 3),
    ('q-learning-update', 'q-learning', 5),
    ('q-learning-update', 'td-learning', 4),
    ('q-learning-exploration', 'exploration', 5),
    ('q-learning-exploration', 'policy', 3),
    ('sarsa-update', 'sarsa', 5),
    ('sarsa-update', 'td-learning', 4),
    ('sarsa-comparison', 'sarsa', 4),
    ('sarsa-comparison', 'q-learning', 4),
    ('dqn-network', 'dqn', 5),
    ('dqn-network', 'q-learning', 3),
    ('dqn-replay', 'dqn', 5),
    ('dqn-replay', 'td-learning', 3),
    ('actor-critic-roles', 'actor-critic', 5),
    ('actor-critic-roles', 'policy', 4),
    ('actor-critic-advantage', 'actor-critic', 5),
    ('actor-critic-advantage', 'value-function', 4)
) AS concept_data(subtopic_slug, concept_slug, weight)
JOIN subtopics ON subtopics.slug = concept_data.subtopic_slug
JOIN ontology_concepts ON ontology_concepts.slug = concept_data.concept_slug
ON CONFLICT (subtopic_id, concept_id) DO UPDATE SET weight = EXCLUDED.weight;
