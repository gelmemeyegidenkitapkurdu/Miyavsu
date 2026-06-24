-- Dergiler kategorisi için yeni sütunlar
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS owner text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS views integer default 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS downloads integer default 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pdf_name text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS issue text;

-- Mevcut verileri taşı: participant1 → owner, description → content
UPDATE public.books SET owner = participant1 WHERE owner IS NULL AND participant1 IS NOT NULL;
UPDATE public.books SET content = description WHERE content IS NULL AND description IS NOT NULL;
