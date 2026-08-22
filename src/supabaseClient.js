import { createClient } from "@supabase/supabase-js";

// Essas duas informações NÃO são segredo — foram feitas pra ficar no código
// do app (é assim que o Supabase funciona: a proteção de verdade está nas
// regras de acesso do banco de dados, não em esconder essa URL/chave).
const SUPABASE_URL = "https://iqxqoaqguawnqglvyxxx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fKqEznTbsy6wKpHwj4kUNQ_LIbGxp1f";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
