CREATE TABLE IF NOT EXISTS article_sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  url TEXT NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 1,
  UNIQUE (topic_id, url)
);

INSERT INTO article_sources (topic_id, title, url, source_name, description, sort_order)
SELECT topics.id, data.title, data.url, data.source_name, data.description, data.sort_order
FROM (
  VALUES
    ('intro', 'Введение в обучение с подкреплением для начинающих', 'https://proglib.io/p/reinforcement-learning', 'Библиотека программиста', 'Обзор базовых понятий RL, среды, агента и награды.', 1),
    ('intro', 'Обучение с подкреплением — Яндекс Образование', 'https://education.yandex.ru/handbook/ml/article/obuchenie-s-podkrepleniem', 'Яндекс Образование', 'Вводная статья с объяснением принципов обучения методом проб и ошибок.', 2),
    ('intro', 'Обучение с подкреплением: введение', 'https://cyberleninka.ru/article/n/obuchenie-s-podkrepleniem-vvedenie', 'КиберЛенинка', 'Научная статья с описанием основных моделей RL.', 3),
    ('intro', 'Обучение с подкреплением: от Павлова до игровых ботов', 'https://habr.com/ru/articles/322404/', 'Habr', 'Популярное объяснение истории и принципов RL.', 4),

    ('mdp', 'Марковский процесс принятия решений — Ultralytics', 'https://www.ultralytics.com/ru/glossary/markov-decision-process-mdp', 'Ultralytics', 'Объяснение MDP и их роли в RL.', 1),
    ('mdp', 'Марковские процессы принятия решений: современные подходы', 'https://cyberleninka.ru/article/n/markovskie-protsessy-prinyatiya-resheniy-sovremennye-podhody-i-primenenie-v-intellektualnyh-sistemah', 'КиберЛенинка', 'Научная статья по современным применениям MDP.', 2),
    ('mdp', 'Марковский процесс принятия решений — Wikipedia', 'https://ru.wikipedia.org/wiki/Марковский_процесс_принятия_решений', 'Википедия', 'Базовое описание модели и алгоритмов.', 3),
    ('mdp', 'Лекция по MDP — Сергей Николенко', 'https://logic.pdmi.ras.ru/~sergey/teaching/mlspsu21/24-mdp.pdf', 'logic.pdmi.ras.ru', 'Лекционный материал с формулами и примерами.', 4),

    ('value-methods', 'Конспект по обучению с подкреплением', 'https://raw.githubusercontent.com/FortsAndMills/RL-Theory-book/main/RL_Theory_Book.pdf', 'GitHub', 'Разделы про value-based методы и функции ценности.', 1),
    ('value-methods', 'Обучение с подкреплением — Wikipedia', 'https://ru.wikipedia.org/wiki/Обучение_с_подкреплением', 'Википедия', 'Описание value-based подходов и динамического программирования.', 2),
    ('value-methods', 'Искусственное обучение с подкреплением: основы', 'https://elibrary.ru/item.asp?id=67864856', 'Электронная библиотека', 'Обзор методов RL и подходов на основе функций ценности.', 3),
    ('value-methods', 'Обзор выпуклой оптимизации марковских процессов принятия решений', 'https://vst.ics.org.ru/uploads/crmissues/crm_2023_02/16_rudenko.pdf', 'Вестник Удмуртского университета', 'Научный обзор методов оптимизации и value functions.', 4),

    ('q-learning', 'Q-обучение — Wikipedia', 'https://ru.wikipedia.org/wiki/Q-обучение', 'Википедия', 'Описание алгоритма, формулы обновления и примеры.', 1),
    ('q-learning', 'Введение в обучение с подкреплением для начинающих', 'https://proglib.io/p/reinforcement-learning', 'Библиотека программиста', 'Раздел про Q-learning и применение алгоритма.', 2),
    ('q-learning', 'Обучение с подкреплением — Яндекс Образование', 'https://education.yandex.ru/handbook/ml/article/obuchenie-s-podkrepleniem', 'Яндекс Образование', 'Объяснение value-based подходов.', 3),
    ('q-learning', 'Обучение с подкреплением — Wikipedia', 'https://ru.wikipedia.org/wiki/Обучение_с_подкреплением', 'Википедия', 'Описание Q-learning как одного из базовых алгоритмов RL.', 4),

    ('sarsa', 'Введение в обучение с подкреплением для начинающих', 'https://proglib.io/p/reinforcement-learning', 'Библиотека программиста', 'Объяснение SARSA и сравнение с Q-learning.', 1),
    ('sarsa', 'Конспект по обучению с подкреплением', 'https://raw.githubusercontent.com/FortsAndMills/RL-Theory-book/main/RL_Theory_Book.pdf', 'GitHub', 'Раздел про temporal difference методы и SARSA.', 2),
    ('sarsa', 'Обучение с подкреплением — Wikipedia', 'https://ru.wikipedia.org/wiki/Обучение_с_подкреплением', 'Википедия', 'Обзор алгоритмов RL, включая SARSA.', 3),
    ('sarsa', 'Марковский процесс принятия решений — Wikipedia', 'https://ru.wikipedia.org/wiki/Марковский_процесс_принятия_решений', 'Википедия', 'Связь SARSA с MDP и уравнением Беллмана.', 4),

    ('dqn', 'Введение в обучение с подкреплением для начинающих', 'https://proglib.io/p/reinforcement-learning', 'Библиотека программиста', 'Раздел про Deep Q-learning и нейронные сети.', 1),
    ('dqn', 'A Brief Survey of Deep Reinforcement Learning', 'https://arxiv.org/abs/1708.05866', 'arXiv', 'Обзор Deep RL и DQN.', 2),
    ('dqn', 'When does reinforcement learning stand out in quantum control?', 'https://arxiv.org/abs/1902.02157', 'arXiv', 'Сравнение tabular Q-learning и deep Q-learning.', 3),
    ('dqn', 'Обучение с подкреплением — Wikipedia', 'https://ru.wikipedia.org/wiki/Обучение_с_подкреплением', 'Википедия', 'Описание DQN и deep RL подходов.', 4),

    ('actor-critic', 'Введение в обучение с подкреплением для начинающих', 'https://proglib.io/p/reinforcement-learning', 'Библиотека программиста', 'Объяснение Actor-Critic и PPO.', 1),
    ('actor-critic', 'Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning', 'https://arxiv.org/abs/1801.01290', 'arXiv', 'Научная статья по Soft Actor-Critic.', 2),
    ('actor-critic', 'A Brief Survey of Deep Reinforcement Learning', 'https://arxiv.org/abs/1708.05866', 'arXiv', 'Обзор actor-critic методов и A3C.', 3),
    ('actor-critic', 'When does reinforcement learning stand out in quantum control?', 'https://arxiv.org/abs/1902.02157', 'arXiv', 'Сравнение Policy Gradient и Actor-Critic подходов.', 4)
) AS data(topic_slug, title, url, source_name, description, sort_order)
JOIN topics ON topics.slug = data.topic_slug
ON CONFLICT (topic_id, url) DO UPDATE SET
  title = EXCLUDED.title,
  source_name = EXCLUDED.source_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
