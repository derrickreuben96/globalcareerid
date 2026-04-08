import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { Menu, X, Settings, Building2, User, ChevronDown, LogOut, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import logoImage from '@/assets/logo.png';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Header() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, roles, profile, signOut, authStatus } = useAuth();
  
  // Never show authenticated UI until backend confirms the session
  const isSessionConfirmed = authStatus === 'authenticated' && !!user;
  
  const isAdmin = roles.includes('admin');
  const isEmployer = roles.includes('employer');

  const [employerLogo, setEmployerLogo] = useState<string | null>(null);
  const [employerName, setEmployerName] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isEmployer) {
      setEmployerLogo(null);
      setEmployerName(null);
      return;
    }
    const fetchEmployerBranding = async () => {
      const { data } = await supabase
        .from('employers')
        .select('logo_url, company_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setEmployerLogo(data.logo_url);
        setEmployerName(data.company_name);
      }
    };
    fetchEmployerBranding();
  }, [user, isEmployer]);
  
  // Determine primary dashboard based on role priority
  const getDashboardLink = () => {
    if (isAdmin) return '/admin';
    if (isEmployer) return '/employer';
    return '/dashboard';
  };
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderAccountButton = () => {
    if (isAdmin) {
      return (
        <>
          <Shield className="w-4 h-4" />
          {profile?.first_name || 'Account'}
        </>
      );
    }
    if (isEmployer && employerLogo) {
      return (
        <>
          <img src={employerLogo} alt={employerName || 'Company'} className="w-6 h-6 rounded object-cover" />
          {employerName || profile?.first_name || 'Account'}
        </>
      );
    }
    if (isEmployer) {
      return (
        <>
          <Building2 className="w-4 h-4" />
          {employerName || profile?.first_name || 'Account'}
        </>
      );
    }
    return (
      <>
        <User className="w-4 h-4" />
        {profile?.first_name || 'Account'}
      </>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Global Career ID" className="h-10 w-10 rounded-lg" />
            <span className="font-display font-bold text-xl text-foreground">Global Career ID</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.howItWorks')}
            </Link>
            
            {/* For Employers Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                {t('nav.forEmployers')}
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuItem asChild>
                  <Link to="/for-employers" className="cursor-pointer">
                    <div>
                      <p className="font-medium">{t('nav.employersRecruiters')}</p>
                      <p className="text-xs text-muted-foreground">{t('nav.verifyTalent')}</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* For Job Seekers Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                {t('nav.forJobSeekers')}
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuItem asChild>
                  <Link to="/for-job-seekers" className="cursor-pointer">
                    <div>
                      <p className="font-medium">{t('nav.employeesJobSeekers')}</p>
                      <p className="text-xs text-muted-foreground">{t('nav.buildCareerIdentity')}</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
              <Link to="/admin" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                <Shield className="w-4 h-4" />
                {t('nav.admin')}
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            {isSessionConfirmed && <NotificationBell />}
            {isSessionConfirmed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    {renderAccountButton()}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{t('nav.adminDashboard')}</p>
                          <p className="text-xs text-muted-foreground">{t('nav.managePlatform')}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isEmployer && (
                    <DropdownMenuItem asChild>
                      <Link to="/employer" className="cursor-pointer flex items-center gap-2">
                        {employerLogo ? (
                          <img src={employerLogo} alt="" className="w-4 h-4 rounded object-cover" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                        <div>
                          <p className="font-medium">{t('nav.employerDashboard')}</p>
                          <p className="text-xs text-muted-foreground">{t('nav.manageCompany')}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {!isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{t('nav.myProfile')}</p>
                          <p className="text-xs text-muted-foreground">{t('nav.viewCareerID')}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">{t('nav.logIn')}</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      {t('nav.getStarted')}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/register" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        <div>
                          <p className="font-medium">{t('nav.createYourProfile')}</p>
                          <p className="text-xs text-muted-foreground">{t('nav.forJobSeekersEmployees')}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/register?tab=employer" className="cursor-pointer">
                        <Building2 className="w-4 h-4 mr-2" />
                        <div>
                          <p className="font-medium">{t('nav.registerYourCompany')}</p>
                          <p className="text-xs text-muted-foreground">{t('nav.forEmployersRecruiters')}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.howItWorks')}
              </Link>
              <Link to="/for-employers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.forEmployersAndRecruiters')}
              </Link>
              <Link to="/for-job-seekers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.forJobSeekersAndEmployees')}
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  {t('nav.adminDashboard')}
                </Link>
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                {isSessionConfirmed ? (
                  <>
                    {isEmployer && employerLogo && (
                      <div className="flex items-center gap-2 px-2 py-1">
                        <img src={employerLogo} alt={employerName || ''} className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-sm font-medium text-foreground">{employerName}</span>
                      </div>
                    )}
                    {isAdmin && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin" className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {t('nav.adminDashboard')}
                        </Link>
                      </Button>
                    )}
                    {isEmployer && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/employer" className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {t('nav.employerDashboard')}
                        </Link>
                      </Button>
                    )}
                    {!isAdmin && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {t('nav.myProfile')}
                        </Link>
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      {t('nav.signOut')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/login">{t('nav.logIn')}</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/register" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t('nav.createYourProfile')}
                      </Link>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link to="/register?tab=employer" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t('nav.registerYourCompany')}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
