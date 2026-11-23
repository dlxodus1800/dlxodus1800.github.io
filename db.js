/* =========================================================
   KEYDECK - db.js  (Supabase 연결 한 곳에 모음)
   ---------------------------------------------------------
   ★ Supabase 화면 맨 위 초록 「Connect」 버튼 또는 Project Settings → API Keys 에서 복사해 넣으세요.
     · SUPABASE_URL : Project URL
     · SUPABASE_KEY : Publishable key (sb_publishable_ 로 시작)
   ※ 공개 키는 GitHub 에 올려도 됩니다.
     하지만 Secret key 와 Database Password 는 절대 넣지 마세요.
   ========================================================= */
const SUPABASE_URL = "https://ivizlfsubsmvuzamhplv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-96KziC9lCt6XPWOT2uU9g_7vM1-8-L";

// 모든 화면(index.html · admin.html)이 이 db 로 Supabase 와 대화한다
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
