import mentoraLogo from '../assets/mentora-logo.jpg';
import { Link } from 'react-router-dom';

export type FooterColumn = { heading: string; items: string[] };

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    heading: 'Platform',
    items: ['Courses', 'How it Works', 'Pricing', 'FAQs', 'Blog'],
  },
  {
    heading: 'Company',
    items: ['About Us', 'Contact', 'Careers', 'Tutor Guidelines', 'Resources'],
  },
  {
    heading: 'For Tutors',
    items: ['Become a Tutor', 'Tutor Resources', 'Community', 'Support'],
  },
  {
    heading: 'Support',
    items: ['Help Center', 'Terms of Service', 'Privacy Policy', 'Refund Policy'],
  },
];

export function SiteFooter({
  columns = DEFAULT_COLUMNS,
  tagline = 'Empowering learners through quality education and expert guidance.',
}: {
  columns?: FooterColumn[];
  tagline?: string;
}) {
  const routes: Record<string, string> = { FAQs: '/help/faq', 'Help Center': '/help/faq', 'Terms of Service': '/terms', 'Privacy Policy': '/privacy' };
  return (
    <>
      <footer className="site-footer">
        <div className="footer-brand-block">
          <div className="brand-wrap footer-brand-wrap">
            <div className="brand-icon small" aria-label="Mentora logo">
              <img src={mentoraLogo} alt="" aria-hidden="true" className="brand-logo-img" />
            </div>
            <span className="brand-name">Mentora</span>
          </div>
          <p>{tagline}</p>
          <div className="social-row" aria-label="Social links">
            <span>f</span>
            <span>◌</span>
            <span>◎</span>
            <span>in</span>
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.heading} className="footer-column">
            <h4>{column.heading}</h4>
            <ul>
              {column.items.map((item) => (
                <li key={item}>{routes[item] ? <Link to={routes[item]}>{item}</Link> : <span>{item}</span>}</li>
              ))}
            </ul>
          </div>
        ))}
      </footer>

      <div className="copyright">© 2026 Mentora. All rights reserved.</div>
    </>
  );
}
