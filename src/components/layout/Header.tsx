import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Settings, Building2, User, ChevronDown, LogOut, Shield } from 'lucide-react';
import logoImage from '@/assets/logo.png';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, roles, profile, signOut } = useAuth();
  
  const isAdmin = roles.includes('admin');
  const isEmployer = roles.includes('employer');
  
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-[#0A66C2] flex items-center justify-center p-1">
              <img src={logoImage} alt="Global Career ID" className="h-full w-auto" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">Global Career ID</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            
            {/* For Employers Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                For Employers
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuItem asChild>
                  <Link to="/for-employers" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Employers & Recruiters</p>
                      <p className="text-xs text-muted-foreground">Verify talent and manage records</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* For Job Seekers Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                For Job Seekers
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuItem asChild>
                  <Link to="/for-job-seekers" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Employees & Job Seekers</p>
                      <p className="text-xs text-muted-foreground">Build your verified career identity</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
              <Link to="/admin" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    {isAdmin ? (
                      <Shield className="w-4 h-4" />
                    ) : isEmployer ? (
                      <Building2 className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    {profile?.first_name || 'Account'}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <div>
                          <p className="font-medium">Admin Dashboard</p>
                          <p className="text-xs text-muted-foreground">Manage platform</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isEmployer && (
                    <DropdownMenuItem asChild>
                      <Link to="/employer" className="cursor-pointer flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <div>
                          <p className="font-medium">Employer Dashboard</p>
                          <p className="text-xs text-muted-foreground">Manage company</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {!isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <div>
                          <p className="font-medium">My Profile</p>
                          <p className="text-xs text-muted-foreground">View your career ID</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      Get Started
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/register" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        <div>
                          <p className="font-medium">Create Your Profile</p>
                          <p className="text-xs text-muted-foreground">For job seekers & employees</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/register?tab=employer" className="cursor-pointer">
                        <Building2 className="w-4 h-4 mr-2" />
                        <div>
                          <p className="font-medium">Register Your Company</p>
                          <p className="text-xs text-muted-foreground">For employers & recruiters</p>
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
                How It Works
              </Link>
              <Link to="/for-employers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                For Employers & Recruiters
              </Link>
              <Link to="/for-job-seekers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                For Job Seekers & Employees
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin" className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      </Button>
                    )}
                    {isEmployer && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/employer" className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Employer Dashboard
                        </Link>
                      </Button>
                    )}
                    {!isAdmin && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/login">Log In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/register" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Create Your Profile
                      </Link>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link to="/register?tab=employer" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Register Your Company
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