import { Link } from "react-router-dom";
import logoImage from '@/assets/logo.png';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg bg-[#0A66C2] flex items-center justify-center p-1">
                <img src={logoImage} alt="Global Career ID" className="h-full w-auto" />
              </div>
              <span className="font-display font-bold text-xl">Global Career ID</span>
            </Link>
            <p className="text-primary-foreground/70 text-sm">One ID. Every role. Verified.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/how-it-works" className="hover:text-primary-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/for-employers" className="hover:text-primary-foreground transition-colors">
                  For Employers
                </Link>
              </li>
              <li>
                <Link to="/for-recruiters" className="hover:text-primary-foreground transition-colors">
                  For Recruiters
                </Link>
              </li>
              <li>
                <Link to="/verify" className="hover:text-primary-foreground transition-colors">
                  Verify Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/about" className="hover:text-primary-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-primary-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/help" className="hover:text-primary-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/disputes" className="hover:text-primary-foreground transition-colors">
                  Raise a Dispute
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/50">
          <p>© {new Date().getFullYear()} Global Career ID. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
