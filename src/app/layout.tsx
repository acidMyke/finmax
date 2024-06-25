import { GeistSans } from 'geist/font/sans';
import '~/styles/globals.css';
import { TRPCReactProvider } from '~/trpc/react';

export const metadata = {
  title: 'FinMax - The best way to manage your finances',
  description: 'Personal finance management made easy.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
