import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const faqCategories = [
  {
    title: 'General Questions',
    faqs: [
      {
        question: 'What is Global Career ID?',
        answer: 'Global Career ID is a centralized employment verification platform where work experience is verified by employers, not written by applicants. It creates a trusted, tamper-proof record of your professional history that you can share with potential employers and recruiters instantly.'
      },
      {
        question: 'How is Global Career ID different from LinkedIn?',
        answer: 'Unlike LinkedIn where users self-report their work history, Global Career ID only allows verified employers to add employment records. This means every entry on your profile is authenticated and trustworthy, eliminating the risk of resume fraud.'
      },
      {
        question: 'Is Global Career ID free to use?',
        answer: 'Yes! Global Career ID is completely free for job seekers. You can create a profile, share your verified work history, and manage your professional identity at no cost. Employers may have subscription plans for advanced features.'
      },
      {
        question: 'What is a Profile ID?',
        answer: 'Your Profile ID is a unique identifier (like TW-2026-ABC12) that represents your Global Career ID profile. You can share this ID or QR code with anyone who needs to verify your employment history. It\'s your digital professional passport.'
      }
    ]
  },
  {
    title: 'For Job Seekers',
    faqs: [
      {
        question: 'How do I create a Global Career ID profile?',
        answer: 'Simply click "Get Started" and sign up with your email. You\'ll receive a unique Profile ID immediately. Your profile will be populated with verified employment records as employers add them.'
      },
      {
        question: 'Can I edit my own employment history?',
        answer: 'No, and that\'s by design. Only verified employers can add or modify employment records. This ensures all entries are authentic and trustworthy. You can, however, update your personal information, skills, and bio.'
      },
      {
        question: 'What if an employer adds incorrect information?',
        answer: 'You can raise a dispute through the platform. Our admin team will review the case, contact relevant parties, and resolve the issue fairly. You\'ll be notified of the outcome via email.'
      },
      {
        question: 'How do I share my profile with recruiters?',
        answer: 'You can share your Profile ID directly, generate a QR code, or send a verification link. Anyone with your Profile ID can view your verified employment history (if your profile is set to visible).'
      },
      {
        question: 'Can I control who sees my profile?',
        answer: 'Yes! You can set your profile visibility to "public" (anyone with your ID can view it) or "private" (only you can see it). You maintain full control over your professional data.'
      }
    ]
  },
  {
    title: 'For Employers',
    faqs: [
      {
        question: 'How do I register as an employer?',
        answer: 'Click "I\'m an Employer" during registration and provide your company details including business registration number. Our team will verify your company before you can add employee records.'
      },
      {
        question: 'How long does employer verification take?',
        answer: 'Typically 24-48 hours. We verify your business registration and contact details to ensure only legitimate employers can add employment records to the platform.'
      },
      {
        question: 'How do I add an employee to Global Career ID?',
        answer: 'Once verified, you can search for employees by their Profile ID or email. Enter the job details (title, start date, department) and submit. The record will appear on the employee\'s profile immediately.'
      },
      {
        question: 'What happens when an employee leaves?',
        answer: 'You should update their employment record with an end date. This maintains an accurate, complete history. The record remains on their profile as past employment.'
      },
      {
        question: 'Can I verify a candidate\'s work history?',
        answer: 'Yes! Simply enter their Profile ID in the verification search. You\'ll see their complete verified employment history instantly—no more manual reference checks needed.'
      }
    ]
  },
  {
    title: 'Privacy & Security',
    faqs: [
      {
        question: 'How is my data protected?',
        answer: 'We use industry-standard encryption and security measures. Your data is stored securely, and we never share personal information without your consent. Employment records can only be added by verified employers.'
      },
      {
        question: 'Can I delete my Global Career ID account?',
        answer: 'Yes, you can request account deletion from your settings. Note that verified employment records may be retained for legal and audit purposes, but will no longer be publicly accessible.'
      },
      {
        question: 'Who can access my employment records?',
        answer: 'Only people you share your Profile ID with (when your profile is public), verified employers who added records, and Global Career ID administrators (for dispute resolution) can access your employment history.'
      }
    ]
  },
  {
    title: 'Disputes',
    faqs: [
      {
        question: 'When should I raise a dispute?',
        answer: 'Raise a dispute if you believe an employment record contains incorrect information—wrong dates, incorrect job title, or a record from a company you never worked for.'
      },
      {
        question: 'How does the dispute process work?',
        answer: 'Submit a dispute through your dashboard explaining the issue. Our admin team reviews the claim, contacts the employer if necessary, investigates the evidence, and makes a fair decision. You\'ll receive email updates throughout the process.'
      },
      {
        question: 'How long do disputes take to resolve?',
        answer: 'Most disputes are resolved within 5-10 business days. Complex cases may take longer. You can track your dispute status in your dashboard at any time.'
      },
      {
        question: 'What happens if my dispute is successful?',
        answer: 'The incorrect record will be corrected or removed. You\'ll receive email confirmation, and your profile will reflect the accurate information immediately.'
      }
    ]
  }
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about Global Career ID. Can't find what you're looking for? 
              Contact our support team.
            </p>
          </div>

          <div className="space-y-10">
            {faqCategories.map((category) => (
              <section key={category.title}>
                <h2 className="text-2xl font-display font-semibold text-foreground mb-4">
                  {category.title}
                </h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`${category.title}-${index}`}
                      className="glass-card rounded-xl px-6 border-none"
                    >
                      <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>

          {/* Still Have Questions */}
          <div className="mt-16 text-center glass-card rounded-2xl p-8">
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our team is here to help you get the most out of Global Career ID.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/help">Visit Help Center</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}