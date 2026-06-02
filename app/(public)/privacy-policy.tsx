import { ScrollView, View, Text, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { APP_NAME } from '@/lib/constants';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const lastUpdated = '2026-06-02';

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Privacy Policy' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{
          padding: 24,
          maxWidth: 800,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#111827' }}>
          Privacy Policy
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          Last updated: {lastUpdated}
        </Text>

        <Section title="1. Introduction">
          <P>
            Welcome to {APP_NAME} ("{APP_NAME}", "we", "our", or "us"). We respect your privacy and
            are committed to protecting your personal data. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you use our mobile
            application and website (collectively, the "Service").
          </P>
          <P>
            By using our Service, you agree to the collection and use of information in accordance
            with this Privacy Policy.
          </P>
        </Section>

        <Section title="2. Information We Collect">
          <P>We collect the following types of information:</P>
          <BulletList
            items={[
              'Account Information: name, email address, phone number, and delivery addresses you provide during registration or profile updates.',
              'Order Information: products purchased, order history, payment method (we do not store full credit card numbers), and delivery details.',
              'Device Information: device type, operating system, unique device identifiers, and push notification tokens.',
              'Usage Data: pages viewed, search queries, interaction with products, and app navigation patterns.',
              'Location Data: delivery addresses you provide. We do not collect real-time GPS location.',
            ]}
          />
        </Section>

        <Section title="3. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <BulletList
            items={[
              'Process and fulfill your orders and deliver products.',
              'Create and manage your account.',
              'Send order confirmations, updates, and delivery notifications.',
              'Send promotional communications (with your consent) that you can opt out of at any time.',
              'Improve our Service, including personalized product recommendations.',
              'Provide customer support.',
              'Detect and prevent fraud or abuse.',
              'Comply with legal obligations.',
            ]}
          />
        </Section>

        <Section title="4. Information Sharing">
          <P>
            We do not sell your personal information. We may share your data only in the following
            circumstances:
          </P>
          <BulletList
            items={[
              'Service Providers: third-party companies that help us operate our Service (e.g., delivery partners, payment processors, hosting providers).',
              'Legal Requirements: if required by law, regulation, or legal process.',
              'Business Transfers: in connection with a merger, acquisition, or sale of assets.',
              'With Your Consent: when you explicitly agree to the sharing.',
            ]}
          />
        </Section>

        <Section title="5. Data Security">
          <P>
            We implement appropriate technical and organizational security measures to protect your
            personal data against unauthorized access, alteration, disclosure, or destruction. These
            include encryption of data in transit (TLS/SSL), secure storage, and access controls.
          </P>
          <P>
            However, no method of electronic transmission or storage is 100% secure. We cannot
            guarantee absolute security.
          </P>
        </Section>

        <Section title="6. Data Retention">
          <P>
            We retain your personal information for as long as your account is active or as needed to
            provide you the Service. We may retain certain information as required by law or for
            legitimate business purposes (e.g., resolving disputes, enforcing agreements).
          </P>
        </Section>

        <Section title="7. Your Rights">
          <P>Depending on your jurisdiction, you may have the right to:</P>
          <BulletList
            items={[
              'Access, correct, or delete your personal data.',
              'Withdraw consent for marketing communications.',
              'Request a copy of your data in a portable format.',
              'Object to or restrict certain processing of your data.',
            ]}
          />
          <P>
            To exercise any of these rights, please contact us using the information provided below.
          </P>
          <P>
            To request deletion of your account and all associated data, visit our account deletion
            page:
          </P>
          <Pressable onPress={() => router.push('/(customer)/delete-account' as any)}>
            <Text
              style={{
                fontSize: 15,
                color: '#2563eb',
                textDecorationLine: 'underline',
                marginBottom: 12,
              }}
            >
              Request Account Deletion
            </Text>
          </Pressable>
        </Section>

        <Section title="8. Children's Privacy">
          <P>
            Our Service is not directed to children under 13 years of age. We do not knowingly
            collect personal information from children under 13. If we become aware that we have
            collected data from a child under 13 without parental consent, we will take steps to
            delete that information.
          </P>
        </Section>

        <Section title="9. Push Notifications">
          <P>
            We may send push notifications to your device regarding order updates and promotional
            offers. You can disable push notifications at any time through your device settings or
            within the app.
          </P>
        </Section>

        <Section title="10. Third-Party Services">
          <P>
            Our Service may use third-party services (e.g., Supabase for authentication and data
            storage, Expo for push notifications). These services have their own privacy policies,
            and we encourage you to review them.
          </P>
        </Section>

        <Section title="11. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy within the app and updating the "Last updated" date.
            Continued use of the Service after changes constitutes acceptance of the revised policy.
          </P>
        </Section>

        <Section title="12. Contact Us">
          <P>
            If you have any questions or concerns about this Privacy Policy, please contact us at:
          </P>
          <P>Email: support@ardalsharq.com</P>
          <P>{APP_NAME}</P>
        </Section>

        <View style={{ height: 48 }} />
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 8, color: '#1f2937' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 15, lineHeight: 24, color: '#374151', marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 12, paddingLeft: 8 }}>
      {items.map((item, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
          <Text style={{ fontSize: 15, lineHeight: 24, color: '#374151', marginRight: 8 }}>•</Text>
          <Text style={{ fontSize: 15, lineHeight: 24, color: '#374151', flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
