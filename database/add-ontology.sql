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
