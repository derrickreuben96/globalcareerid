import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function FAQ() {
  const { t } = useTranslation();

  const faqCategories = [
    {
      title: t('faq.generalQuestions'),
      faqs: [
        { question: t('faq.q_whatIs'), answer: t('faq.a_whatIs') },
        { question: t('faq.q_different'), answer: t('faq.a_different') },
        { question: t('faq.q_free'), answer: t('faq.a_free') },
        { question: t('faq.q_profileId'), answer: t('faq.a_profileId') },
      ]
    },
    {
      title: t('faq.forJobSeekers'),
      faqs: [
        { question: t('faq.q_createProfile'), answer: t('faq.a_createProfile') },
        { question: t('faq.q_editHistory'), answer: t('faq.a_editHistory') },
        { question: t('faq.q_incorrectInfo'), answer: t('faq.a_incorrectInfo') },
        { question: t('faq.q_shareProfile'), answer: t('faq.a_shareProfile') },
        { question: t('faq.q_controlAccess'), answer: t('faq.a_controlAccess') },
      ]
    },
    {
      title: t('faq.forEmployers'),
      faqs: [
        { question: t('faq.q_registerEmployer'), answer: t('faq.a_registerEmployer') },
        { question: t('faq.q_verificationTime'), answer: t('faq.a_verificationTime') },
        { question: t('faq.q_addEmployee'), answer: t('faq.a_addEmployee') },
        { question: t('faq.q_employeeLeaves'), answer: t('faq.a_employeeLeaves') },
        { question: t('faq.q_verifyCandidate'), answer: t('faq.a_verifyCandidate') },
      ]
    },
    {
      title: t('faq.privacySecurity'),
      faqs: [
        { question: t('faq.q_dataProtected'), answer: t('faq.a_dataProtected') },
        { question: t('faq.q_deleteAccount'), answer: t('faq.a_deleteAccount') },
        { question: t('faq.q_whoCanAccess'), answer: t('faq.a_whoCanAccess') },
      ]
    },
    {
      title: t('faq.disputes'),
      faqs: [
        { question: t('faq.q_whenDispute'), answer: t('faq.a_whenDispute') },
        { question: t('faq.q_disputeProcess'), answer: t('faq.a_disputeProcess') },
        { question: t('faq.q_disputeTime'), answer: t('faq.a_disputeTime') },
        { question: t('faq.q_disputeSuccess'), answer: t('faq.a_disputeSuccess') },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              {t('faq.title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('faq.subtitle')}
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
              {t('faq.stillHaveQuestions')}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t('faq.teamHereToHelp')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/contact">{t('faq.contactUs')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/help">{t('faq.visitHelpCenter')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
