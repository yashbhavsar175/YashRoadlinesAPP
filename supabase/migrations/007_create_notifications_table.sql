-- Create notifications table for user-to-user messaging
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT DEFAULT 'admin_message',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'read', 'failed')),
    requires_password BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient ON public.user_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_sender ON public.user_notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_status ON public.user_notifications(status);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user_notifications table
CREATE POLICY "Users can view their own notifications" ON public.user_notifications
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert notifications" ON public.user_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.user_notifications
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own notifications" ON public.user_notifications
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.user_notifications TO postgres;
GRANT ALL ON public.user_notifications TO anon;
GRANT ALL ON public.user_notifications TO authenticated;