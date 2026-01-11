-- age_coefficients 테이블에 category_id 컬럼 추가 SQL

-- 1. 컬럼 추가
ALTER TABLE age_coefficients 
ADD COLUMN category_id INT NULL;

-- 2. 외래키 제약조건 추가 (선택사항)
ALTER TABLE age_coefficients 
ADD CONSTRAINT fk_age_coefficients_category 
FOREIGN KEY (category_id) 
REFERENCES test_categories(id) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

-- 3. 인덱스 추가 (이미 있으면 에러 발생할 수 있음)
-- CREATE INDEX fk_age_coefficients_category ON age_coefficients(category_id);
