-- Create custom pages table for dynamic page management
CREATE TABLE IF NOT EXISTS public.custom_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'document-text',
    screen_component TEXT NOT NULL, -- which screen component to show
    background_color TEXT DEFAULT '#2196F3',
    text_color TEXT DEFAULT '#FFFFFF',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create page permissions table
CREATE TABLE IF NOT EXISTS public.page_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES public.custom_pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    can_access BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(page_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_pages_active ON public.custom_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_pages_sort_order ON public.custom_pages(sort_order);
CREATE INDEX IF NOT EXISTS idx_page_permissions_user ON public.page_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_page ON public.page_permissions(page_id);

-- Enable Row Level Security
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_pages table
CREATE POLICY "Anyone can view active custom pages" ON public.custom_pages
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage custom pages" ON public.custom_pages
    FOR ALL USING (true);

-- Create policies for page_permissions table
CREATE POLICY "Users can view their own page permissions" ON public.page_permissions
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage page permissions" ON public.page_permissions
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.custom_pages TO postgres;
GRANT ALL ON public.custom_pages TO anon;
GRANT ALL ON public.custom_pages TO authenticated;

GRANT ALL ON public.page_permissions TO postgres;
GRANT ALL ON public.page_permissions TO anon;
GRANT ALL ON public.page_permissions TO authenticated;

-- Insert some sample custom pages
INSERT INTO public.custom_pages (title, description, icon_name, screen_component, background_color, text_color, sort_order) VALUES 
('Daily Reports', 'View daily performance reports', 'bar-chart', 'DailyReportScreen', '#4CAF50', '#FFFFFF', 1),
('Vehicle Tracking', 'Track vehicle locations and status', 'car-sport', 'VehicleTrackingScreen', '#FF9800', '#FFFFFF', 2),
('Financial Summary', 'View financial summaries and analytics', 'wallet', 'FinancialSummaryScreen', '#9C27B0', '#FFFFFF', 3)
ON CONFLICT DO NOTHING;