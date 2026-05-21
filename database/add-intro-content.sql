ALTER TABLE subtopics ADD COLUMN IF NOT EXISTS theory_content TEXT NOT NULL DEFAULT '';
ALTER TABLE subtopics ADD COLUMN IF NOT EXISTS illustration_key VARCHAR(100);

CREATE TABLE IF NOT EXISTS subtopic_keywords (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subtopic_id BIGINT NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  UNIQUE (subtopic_id, keyword)
);

UPDATE topics
SET
  name = 'Введение в обучение с подкреплением',
  description = 'Базовые понятия обучения с подкреплением: агент, среда, состояние, действие, награда и первые модели поведения.',
  level_name = 'Базовый'
WHERE slug = 'intro';

UPDATE subtopics
SET slug = 'intro-formalization'
WHERE slug = 'intro-cycle'
  AND NOT EXISTS (SELECT 1 FROM subtopics existing WHERE existing.slug = 'intro-formalization');

INSERT INTO subtopics (topic_id, slug, name, description, theory_content, illustration_key, sort_order)
SELECT topics.id, data.slug, data.name, data.description, data.theory, data.illustration_key, data.sort_order
FROM topics
JOIN (
  VALUES
    (
      'intro-concepts',
      'Основные понятия RL',
      'Пустая подтема для терминов: агент, среда, состояние, действие, награда.',
      'Обучение с подкреплением (RL) — это подход к машинному обучению, при котором агент обучается принимать решения, взаимодействуя с окружающей средой и получая обратную связь в виде награды.

В отличие от других методов:
в обучении с учителем есть правильные ответы;
в RL нет правильных ответов, только сигнал награды;
агент должен сам понять, какие действия приводят к успеху.

Главная идея: агент обучается через опыт и пробу ошибок.

Цикл взаимодействия:
1. Агент наблюдает состояние S_t.
2. Выбирает действие A_t.
3. Среда возвращает награду R_t.
4. Среда переходит в новое состояние S_{t+1}.

Этот цикл повторяется множество раз.

RL — это задача последовательного принятия решений, где текущее действие влияет на будущие состояния, решения имеют долгосрочные последствия, а агент должен учитывать будущее.

Пример: игра "Лабиринт".
Агент — персонаж, состояние — координаты, действия — шаги, награда — +100 за выход и -1 за каждый шаг. Агент должен минимизировать число шагов и найти кратчайший путь.',
      'rl-cycle',
      1
    ),
    (
      'intro-formalization',
      'Формализация задачи RL',
      'Постановка RL как задачи последовательного принятия решений и максимизации суммарной награды.',
      'Обучение с подкреплением формализуется как задача последовательного принятия решений и оптимизации поведения агента.

Главная цель: максимизация суммарной награды.

Кумулятивная награда:
G_t = R_t + γR_{t+1} + γ^2R_{t+2} + ...

где γ — коэффициент дисконтирования.

Интерпретация:
γ ≈ 0 — важны текущие награды;
γ ≈ 1 — важны долгосрочные награды.

Пример: робот.
Краткосрочная цель — быстро двигаться. Долгосрочная цель — не упасть. При γ = 0.9 робот учитывает будущие последствия своих действий.',
      'gamma-chart',
      2
    ),
    (
      'intro-comparison',
      'Отличие RL от других методов',
      'Сравнение обучения с учителем, обучения без учителя и обучения с подкреплением.',
      'В обучении с учителем есть правильные ответы.
В обучении без учителя нет меток.
В обучении с подкреплением есть награда.

Главное отличие RL: нет учителя, а обучение происходит через взаимодействие со средой.

Ключевые сложности RL:
разреженные награды;
задержка обратной связи;
исследование против использования.

Пример: игра.
Награда может появиться только в конце, поэтому агент должен понять, какие действия привели к победе.',
      'learning-comparison',
      3
    ),
    (
      'intro-exploration',
      'Исследование и использование',
      'Дилемма exploration и exploitation при выборе действий агентом.',
      'Одна из главных проблем RL — дилемма исследования и использования.

Исследование — пробовать новые действия.
Использование — выбирать действие, которое уже кажется лучшим.

Если слишком много исследования, обучение становится медленным.
Если слишком много использования, агент может застрять в локальном максимуме.

Пример: игрок пробует новые стратегии или использует лучшую найденную стратегию.',
      'exploration-chart',
      4
    ),
    (
      'intro-policy-value',
      'Стратегия и функции ценности',
      'Базовые понятия policy, V-функции и Q-функции.',
      'Стратегия (Policy) — правило выбора действия:
π(a|s).

Функция ценности состояния V(s) показывает, насколько хорошее состояние.

Q-функция:
Q(s,a) = E[G_t | s,a].

Интерпретация:
V(s) — ценность состояния;
Q(s,a) — ценность действия в конкретном состоянии.

Пример: шахматы.
V(s) оценивает, насколько позиция хороша. Q(s,a) оценивает, насколько хорош конкретный ход.',
      'q-table',
      5
    ),
    (
      'intro-applications',
      'Применения RL',
      'Области применения обучения с подкреплением: игры, робототехника, автопилоты, финансы и энергетика.',
      'RL применяется в разных областях:
игры, например Atari и Dota;
робототехника;
автопилоты;
финансы;
энергетика.

Пример: автопилот.
Состояние — положение машины, действие — поворот или ускорение, награда — безопасность и движение к цели.',
      'rl-applications',
      6
    )
) AS data(slug, name, description, theory, illustration_key, sort_order)
  ON topics.slug = 'intro'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  theory_content = EXCLUDED.theory_content,
  illustration_key = EXCLUDED.illustration_key,
  sort_order = EXCLUDED.sort_order;

INSERT INTO tests (topic_id, subtopic_id, title)
SELECT subtopics.topic_id, subtopics.id, 'Тест: ' || subtopics.name
FROM subtopics
JOIN topics ON topics.id = subtopics.topic_id
WHERE topics.slug = 'intro'
ON CONFLICT DO NOTHING;

INSERT INTO questions (test_id, sort_order)
SELECT tests.id, question_numbers.sort_order
FROM tests
JOIN subtopics ON subtopics.id = tests.subtopic_id
CROSS JOIN (VALUES (1), (2), (3)) AS question_numbers(sort_order)
WHERE subtopics.slug IN ('intro-concepts', 'intro-formalization', 'intro-comparison', 'intro-exploration', 'intro-policy-value', 'intro-applications')
ON CONFLICT (test_id, sort_order) DO NOTHING;

INSERT INTO answer_options (question_id, sort_order)
SELECT questions.id, option_numbers.sort_order
FROM questions
CROSS JOIN (VALUES (1), (2), (3), (4)) AS option_numbers(sort_order)
JOIN tests ON tests.id = questions.test_id
JOIN subtopics ON subtopics.id = tests.subtopic_id
WHERE subtopics.slug IN ('intro-concepts', 'intro-formalization', 'intro-comparison', 'intro-exploration', 'intro-policy-value', 'intro-applications')
ON CONFLICT (question_id, sort_order) DO NOTHING;

UPDATE questions
SET question_text = ''
FROM tests
JOIN subtopics ON subtopics.id = tests.subtopic_id
WHERE questions.test_id = tests.id
  AND subtopics.slug IN ('intro-concepts', 'intro-formalization', 'intro-comparison', 'intro-exploration', 'intro-policy-value', 'intro-applications');

UPDATE answer_options
SET option_text = '', is_correct = false
FROM questions
JOIN tests ON tests.id = questions.test_id
JOIN subtopics ON subtopics.id = tests.subtopic_id
WHERE answer_options.question_id = questions.id
  AND subtopics.slug IN ('intro-concepts', 'intro-formalization', 'intro-comparison', 'intro-exploration', 'intro-policy-value', 'intro-applications');

WITH test_questions AS (
  SELECT subtopics.slug, questions.id, questions.sort_order
  FROM questions
  JOIN tests ON tests.id = questions.test_id
  JOIN subtopics ON subtopics.id = tests.subtopic_id
  WHERE subtopics.slug IN ('intro-concepts', 'intro-formalization', 'intro-comparison', 'intro-exploration', 'intro-policy-value', 'intro-applications')
)
UPDATE questions
SET question_text = data.question
FROM (
  VALUES
    ('intro-concepts', 1, 'Что является источником обучения в RL?'),
    ('intro-concepts', 2, 'Что делает агент?'),
    ('intro-concepts', 3, 'Что такое состояние?'),
    ('intro-formalization', 1, 'Что делает γ?'),
    ('intro-formalization', 2, 'При γ = 0 агент:'),
    ('intro-comparison', 1, 'Есть ли правильные ответы в RL?'),
    ('intro-comparison', 2, 'Главная сложность RL:'),
    ('intro-exploration', 1, 'Что такое исследование?'),
    ('intro-exploration', 2, 'Что приводит к локальному максимуму?'),
    ('intro-policy-value', 1, 'Что такое политика?'),
    ('intro-policy-value', 2, 'Что оценивает Q?'),
    ('intro-applications', 1, 'Где используется RL?')
) AS data(slug, sort_order, question)
JOIN test_questions ON test_questions.slug = data.slug AND test_questions.sort_order = data.sort_order
WHERE questions.id = test_questions.id;

WITH option_rows AS (
  SELECT subtopics.slug, questions.sort_order AS question_order, answer_options.id, answer_options.sort_order AS option_order
  FROM answer_options
  JOIN questions ON questions.id = answer_options.question_id
  JOIN tests ON tests.id = questions.test_id
  JOIN subtopics ON subtopics.id = tests.subtopic_id
  WHERE subtopics.slug IN ('intro-concepts', 'intro-formalization', 'intro-comparison', 'intro-exploration', 'intro-policy-value', 'intro-applications')
)
UPDATE answer_options
SET option_text = data.option_text, is_correct = data.is_correct
FROM (
  VALUES
    ('intro-concepts', 1, 1, 'размеченные данные', false),
    ('intro-concepts', 1, 2, 'награда', true),
    ('intro-concepts', 1, 3, 'эксперт', false),
    ('intro-concepts', 2, 1, 'обучает модель', false),
    ('intro-concepts', 2, 2, 'выбирает действия', true),
    ('intro-concepts', 3, 1, 'параметр модели', false),
    ('intro-concepts', 3, 2, 'описание среды в момент времени', true),
    ('intro-formalization', 1, 1, 'увеличивает награду', false),
    ('intro-formalization', 1, 2, 'учитывает будущее', true),
    ('intro-formalization', 2, 1, 'думает о будущем', false),
    ('intro-formalization', 2, 2, 'учитывает только текущую награду', true),
    ('intro-comparison', 1, 1, 'да', false),
    ('intro-comparison', 1, 2, 'нет', true),
    ('intro-comparison', 2, 1, 'большие данные', false),
    ('intro-comparison', 2, 2, 'задержка награды', true),
    ('intro-exploration', 1, 1, 'выбор лучшего действия', false),
    ('intro-exploration', 1, 2, 'проба новых действий', true),
    ('intro-exploration', 2, 1, 'много исследования', false),
    ('intro-exploration', 2, 2, 'много использования', true),
    ('intro-policy-value', 1, 1, 'функция потерь', false),
    ('intro-policy-value', 1, 2, 'правило выбора действий', true),
    ('intro-policy-value', 2, 1, 'состояние', false),
    ('intro-policy-value', 2, 2, 'состояние + действие', true),
    ('intro-applications', 1, 1, 'только в играх', false),
    ('intro-applications', 1, 2, 'в разных областях', true)
) AS data(slug, question_order, option_order, option_text, is_correct)
JOIN option_rows
  ON option_rows.slug = data.slug
  AND option_rows.question_order = data.question_order
  AND option_rows.option_order = data.option_order
WHERE answer_options.id = option_rows.id;

INSERT INTO subtopic_keywords (subtopic_id, keyword)
SELECT subtopics.id, data.keyword
FROM (
  VALUES
    ('intro-concepts', 'агент'), ('intro-concepts', 'среда'), ('intro-concepts', 'состояние'), ('intro-concepts', 'действие'), ('intro-concepts', 'награда'), ('intro-concepts', 'RL'), ('intro-concepts', 'цикл обучения'), ('intro-concepts', 'взаимодействие'),
    ('intro-formalization', 'возврат'), ('intro-formalization', 'дисконтирование'), ('intro-formalization', 'γ'), ('intro-formalization', 'награда'), ('intro-formalization', 'оптимизация'),
    ('intro-comparison', 'обучение с учителем'), ('intro-comparison', 'RL'), ('intro-comparison', 'разреженные награды'), ('intro-comparison', 'обучение'),
    ('intro-exploration', 'exploration'), ('intro-exploration', 'exploitation'), ('intro-exploration', 'стратегия'), ('intro-exploration', 'баланс'),
    ('intro-policy-value', 'policy'), ('intro-policy-value', 'value function'), ('intro-policy-value', 'Q-function'), ('intro-policy-value', 'стратегия'),
    ('intro-applications', 'игры'), ('intro-applications', 'робототехника'), ('intro-applications', 'ИИ'), ('intro-applications', 'оптимизация')
) AS data(slug, keyword)
JOIN subtopics ON subtopics.slug = data.slug
ON CONFLICT (subtopic_id, keyword) DO NOTHING;

INSERT INTO subtopic_concepts (subtopic_id, concept_id, weight)
SELECT subtopics.id, ontology_concepts.id, data.weight
FROM (
  VALUES
    ('intro-formalization', 'reward', 3),
    ('intro-comparison', 'reward', 2),
    ('intro-exploration', 'exploration', 5),
    ('intro-policy-value', 'policy', 5),
    ('intro-policy-value', 'value-function', 4),
    ('intro-applications', 'agent', 2)
) AS data(subtopic_slug, concept_slug, weight)
JOIN subtopics ON subtopics.slug = data.subtopic_slug
JOIN ontology_concepts ON ontology_concepts.slug = data.concept_slug
ON CONFLICT (subtopic_id, concept_id) DO UPDATE SET weight = EXCLUDED.weight;
