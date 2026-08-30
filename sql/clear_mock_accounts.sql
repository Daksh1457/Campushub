-- =============================================
-- CLEAR MOCK DATA & RESET ACCOUNT SLOTS
-- Run this in Supabase SQL Editor
-- =============================================

-- Option A: Clear all mock admin accounts (frees up all 4 admin slots)
DELETE FROM public.profiles WHERE role = 'admin';

-- Option B: Clear ALL mock user profiles (students & admins)
-- DELETE FROM public.profiles;

-- Option C: Full Reset — Remove all Auth users and cascading profiles
-- (Uncomment the line below if you want a 100% fresh start for all signups)
-- DELETE FROM auth.users;

-- Verify remaining profile counts:
SELECT role, COUNT(*) as total_accounts 
FROM public.profiles 
GROUP BY role;
