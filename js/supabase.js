import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = "https://rqxqpuueirmfjjuhljmg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxeHFwdXVlaXJtZmpqdWhsam1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDU3MjIsImV4cCI6MjA5NjUyMTcyMn0.cFV4SPVUqz_R3Raa8sN2jdAxX-hcut4kzfNIBEqSBJ8"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

if (supabase.auth) {
    console.log("Holbogdson baina")
    console.log(supabase.auth)
}