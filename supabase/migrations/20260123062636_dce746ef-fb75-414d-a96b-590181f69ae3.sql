-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'job_seeker', 'employer');

-- Create profiles table for users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    profile_id TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    bio TEXT,
    skills TEXT[] DEFAULT '{}',
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'verified_only')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create employers table
CREATE TABLE public.employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    registration_number TEXT,
    industry TEXT,
    country TEXT,
    website TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create employment_records table
CREATE TABLE public.employment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
    job_title TEXT NOT NULL,
    department TEXT,
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'disputed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create disputes table
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_record_id UUID REFERENCES public.employment_records(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to generate unique profile ID
CREATE OR REPLACE FUNCTION public.generate_profile_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_id TEXT;
    year_part TEXT;
    random_part TEXT;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    new_id := 'TW-' || year_part || '-' || random_part;
    RETURN new_id;
END;
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (visibility = 'public');

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User roles RLS policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Employers RLS policies
CREATE POLICY "Anyone can view verified employers"
ON public.employers FOR SELECT
TO authenticated
USING (is_verified = true);

CREATE POLICY "Users can view their own employer record"
ON public.employers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own employer record"
ON public.employers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own employer record"
ON public.employers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all employers"
ON public.employers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Employment records RLS policies
CREATE POLICY "Users can view their own employment records"
ON public.employment_records FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Employers can view records they created"
ON public.employment_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employers 
        WHERE id = employment_records.employer_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Employers can insert employment records"
ON public.employment_records FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employers 
        WHERE id = employer_id 
        AND user_id = auth.uid() 
        AND is_verified = true
    )
);

CREATE POLICY "Employers can update their employment records"
ON public.employment_records FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employers 
        WHERE id = employer_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all employment records"
ON public.employment_records FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Disputes RLS policies
CREATE POLICY "Users can view their own disputes"
ON public.disputes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create disputes for their records"
ON public.disputes FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.employment_records 
        WHERE id = employment_record_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all disputes"
ON public.disputes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employers_updated_at
    BEFORE UPDATE ON public.employers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employment_records_updated_at
    BEFORE UPDATE ON public.employment_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
    BEFORE UPDATE ON public.disputes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, profile_id, first_name, last_name, email)
    VALUES (
        NEW.id,
        public.generate_profile_id(),
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email
    );
    
    -- Add default job_seeker role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'job_seeker');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();