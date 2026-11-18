import './style.css';

export const metadata = { title: 'Flickit', description: 'Everyday groceries in Dimapur' };

export default function Layout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
