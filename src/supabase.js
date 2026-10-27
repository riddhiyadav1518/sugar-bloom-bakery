
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ikohuffaitmitleaukhw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2h1ZmZhaXRtaXRsZWF1a2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDIyMTQsImV4cCI6MjEwODU3ODIxNH0.mszLhSafJtUfjSyZUJ80q6R53BdWakbOIbBamPTcZl0";

export const supabase = createClient(supabaseUrl, supabaseKey);
