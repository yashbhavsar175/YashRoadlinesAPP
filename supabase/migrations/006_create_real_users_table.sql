-- Drop existing users table if it exists
DROP TABLE IF EXISTS public.users CASCADE;

-- Create new users table based on your real data structure
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_full_name ON public.users(full_name);

-- Insert your real users (based on the screenshot you showed)
INSERT INTO public.users (id, username, full_name) VALUES 
('341de617-bc6d-46d0-9018-a58b22f36f37', 'yashbhavsar175@gmail.com', 'Yash'),
('520be577-aa34-4a74-9600-6b54dcacd129', 'yashbhavsar.office@gmail.com', 'Yash-User'),
('88ddfedc-8dfc-43ab-83b0-08a3a955a514', 'mahendard986@gmail.com', 'Mahendra'),
('dc032de1-e137-4837-a5ef-5ef552bc4fbc', 'yashbhavsar.21.imca@iict.indusuni.ac.in', 'yashbhavsar.21.imca@iict.indusuni.ac.in'),
('e1993fbb-c3b1-4342-b0ce-e05d6c3f81cb', 'lbhavsar31@gmail.com', 'lbhavsar31@gmail.com'),
('f4f87dd9-7eb7-47ad-b8db-2f9ec39900f2', 'shivamkoshti0910@gmail.com', 'Shivam Koshti')
ON CONFLICT (username) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Allow public read access" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON public.users
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete" ON public.users
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;