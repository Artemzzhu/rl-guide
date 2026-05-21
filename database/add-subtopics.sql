CREATE TABLE IF NOT EXISTS subtopics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  UNIQUE (topic_id, sort_order)
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

ALTER TABLE tests ADD COLUMN IF NOT EXISTS subtopic_id BIGINT REFERENCES subtopics(id) ON DELETE CASCADE;
ALTER TABLE tests DROP CONSTRAINT IF EXISTS tests_topic_id_key;

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
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO tests (topic_id, subtopic_id, title, passing_score)
SELECT subtopics.topic_id, subtopics.id, 'Тест: ' || subtopics.name, 70
FROM subtopics
WHERE NOT EXISTS (
  SELECT 1 FROM tests WHERE tests.subtopic_id = subtopics.id
);

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

UPDATE articles
SET
  theory_content = 'Пустой текст статьи. Здесь позднее можно разместить теоретический материал по теме.',
  practice_content = 'Пустой практический блок. Здесь позднее можно разместить примеры, формулы и код.'
WHERE theory_content = '' AND practice_content = '';
