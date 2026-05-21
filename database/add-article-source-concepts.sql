CREATE TABLE IF NOT EXISTS article_source_concepts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_source_id BIGINT NOT NULL REFERENCES article_sources(id) ON DELETE CASCADE,
  concept_id BIGINT NOT NULL REFERENCES ontology_concepts(id) ON DELETE CASCADE,
  weight SMALLINT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
  UNIQUE (article_source_id, concept_id)
);
