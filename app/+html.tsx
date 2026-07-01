import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML template for the web build.
 *
 * Fixes mobile-browser layout:
 * - Locks html/body to 100dvh so the document itself never scrolls
 * - The tab bar stays fixed at the bottom at all times
 * - Inner screens scroll individually via their own ScrollView / FlatList
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl" style={{ height: '100%' }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />

        <meta name="description" content="أرض الشرق - مورد وموزع مجمدات ومواد غذائية بالجملة. بيع وتوزيع مجمدات، دجاج مجمد، لحوم مجمدة، خضار مجمدة، أجبان، منتجات نبيل والوادي والوطنية وأمريكانا وإكرام. توريد سوبرماركت ومطاعم وبقالات بأسعار منافسة." />
        <meta name="keywords" content="مجمدات، بيع مجمدات، توزيع مجمدات، مورد مجمدات، مواد غذائية مجمدة، منتجات غذائية، بيع مواد غذائية، توزيع مواد غذائية، مورد مواد غذائية، أجبان، بيع أجبان، توزيع أجبان، دجاج مجمد، لحوم مجمدة، خضار مجمدة، بطاطا مجمدة، مقبلات مجمدة، منتجات نبيل، منتجات الوادي، منتجات الوطنية، منتجات أمريكانا، منتجات إكرام، توريد سوبرماركت، توريد ميني ماركت، توريد بقالات، توريد مطاعم، أسعار منافسة، مواد غذائية بالجملة" />
        <title>أرض الشرق - مجمدات ومواد غذائية بالجملة</title>

        {/* Lock viewport — critical for mobile browsers */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        {/* Prevent document-level scroll so fixed elements stay put */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              height: 100%;
              height: 100dvh;
              overflow: hidden;
              margin: 0;
              padding: 0;
              direction: rtl;
              font-family: 'NotoSansArabic-Regular', 'Noto Sans Arabic', sans-serif;
            }
            @media print {
              html, body, #root {
                height: auto !important;
                overflow: visible !important;
              }
              /* Hide tab bar, header back/print buttons, and timeline */
              [data-print-hide] { display: none !important; }
              /* Make scroll views expand fully */
              * { overflow: visible !important; max-height: none !important; }
            }
          `,
        }} />

        <link rel="icon" type="image/png" href="/assets/logo.png" />
        <ScrollViewStyleReset />
      </head>
      <body style={{ height: '100%' }}>
        {children}
      </body>
    </html>
  );
}
