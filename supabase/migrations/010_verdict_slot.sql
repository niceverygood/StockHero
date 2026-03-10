-- ============================================
-- verdicts 테이블: 오전 8시 / 정오 두 시점 추천 지원
-- ============================================

-- 1. date UNIQUE 제약 제거 (같은 날짜에 morning/noon 두 행 허용)
ALTER TABLE verdicts DROP CONSTRAINT IF EXISTS verdicts_date_key;

-- 2. slot 컬럼 추가 (morning = 오전 8시, noon = 정오)
ALTER TABLE verdicts ADD COLUMN IF NOT EXISTS slot VARCHAR(10) NOT NULL DEFAULT 'morning';

-- 3. 기존 행은 모두 morning으로
UPDATE verdicts SET slot = 'morning' WHERE slot IS NULL OR slot = '';

-- 4. (date, slot) 유일 제약
ALTER TABLE verdicts ADD CONSTRAINT verdicts_date_slot_key UNIQUE (date, slot);

-- 5. slot 검사 제약
ALTER TABLE verdicts DROP CONSTRAINT IF EXISTS verdicts_slot_check;
ALTER TABLE verdicts ADD CONSTRAINT verdicts_slot_check CHECK (slot IN ('morning', 'noon'));

COMMENT ON COLUMN verdicts.slot IS '추천 시점: morning(오전 8시), noon(정오)';
