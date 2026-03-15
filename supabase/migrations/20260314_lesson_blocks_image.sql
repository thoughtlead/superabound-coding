alter table public.lesson_blocks
drop constraint if exists lesson_blocks_block_type_check;

alter table public.lesson_blocks
add constraint lesson_blocks_block_type_check
check (block_type in ('video', 'audio', 'rich_text', 'download', 'image'));
