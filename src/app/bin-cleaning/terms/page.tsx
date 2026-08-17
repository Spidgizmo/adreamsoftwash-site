import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "Service & Payment Terms | ADS Bin Cleaning",
  description: "ADS Bin Cleaning service, billing, cancellation, preparation, contamination, promotion, and referral terms.",
  robots: { index: false, follow: false },
};

const TERMS_VERSION = "ads-bin-cleaning-service-payment-v1";

function TermsSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black text-zinc-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-700 sm:text-base">{children}</div>
    </section>
  );
}

export default function BinCleaningTermsPage() {
  return (
    <main className="min-h-screen bg-brand-50">
      <Container>
        <div className="py-8 sm:py-12 md:py-16">
          <Link href="/bin-cleaning" className="text-sm font-black text-brand-800">← Back to ADS Bin Cleaning</Link>

          <div className="mt-7 max-w-4xl">
            <p className="text-sm font-black uppercase tracking-widest text-brand-800">ADS Bin Cleaning</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Service & Payment Terms</h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-700">
              These are the terms a customer is asked to read and accept before ADS Bin Cleaning sends the account to secure payment.
            </p>
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              <strong>Current staging version:</strong> {TERMS_VERSION}. This page is being tested before public launch. Stripe is in TEST mode and no real customer or card information should be entered in staging.
            </div>
          </div>

          <div className="mt-8 max-w-4xl space-y-5">
            <TermsSection title="1. Service and what is included">
              <p>ADS Bin Cleaning is provided by American Dream Softwash. Standard service includes interior and exterior bin cleaning, pre-treatment when needed, hands-on brushing, pressure washing, sanitizing and deodorizing, controlled wastewater handling, before-and-after service photographs, and return of the cleaned bins to the customer&apos;s designated storage location when the stated access path is available and safe.</p>
              <p>Permanent stains, paint, tar, melted plastic, physical damage, or other conditions that are not removable by normal cleaning are not guaranteed to be removed.</p>
            </TermsSection>

            <TermsSection title="2. Plans, prices, and recurring billing">
              <p><strong>Monthly:</strong> $20 for the first bin plus $5 for each additional bin, billed every calendar month.</p>
              <p><strong>Quarterly:</strong> $35 for the first bin plus $5 for each additional bin, billed every three calendar months.</p>
              <p><strong>Twice a Year:</strong> $50 includes up to two bins, plus $10 for each additional bin after two, billed every six calendar months.</p>
              <p><strong>One-Time Cleaning:</strong> $60 includes up to two bins, plus $10 for each additional bin after two. This is a single payment and does not create a recurring subscription.</p>
              <p>Prices are shown before applicable tax. Recurring plans use anniversary billing based on the customer&apos;s signup date and the selected plan interval; there is no universal company billing date and normal recurring service is not prorated.</p>
            </TermsSection>

            <TermsSection title="3. Payment and card security">
              <p>Customers enter card information directly through Stripe&apos;s secure checkout. ADS staff does not need to type the customer&apos;s card number into the ADS CRM, and ADS does not store the full card number in its CRM.</p>
              <p>For recurring plans, the customer authorizes the selected recurring charge to the payment method maintained through Stripe until the subscription is canceled or otherwise ended. Service and portal status become active only after ADS receives and verifies successful payment information from Stripe.</p>
              <p>If a recurring payment remains unpaid, the account may be marked past due. If payment is still unresolved after seven days, service/account access may be deactivated until successful payment is received and the account is eligible to resume.</p>
            </TermsSection>

            <TermsSection title="4. Cancellation">
              <p>Recurring plans renew automatically according to the selected billing interval until canceled. A normal customer cancellation is scheduled for the end of the current paid billing period rather than cutting off a period that has already been paid.</p>
              <p>One-Time Cleaning does not renew. Any refund, dispute, chargeback, or legally required remedy is handled according to the payment record, service record, these terms, and applicable law.</p>
            </TermsSection>

            <TermsSection title="5. Collection day, cleaning day, holidays, and weather">
              <p>ADS does not normally clean the bins on the household&apos;s trash pickup day. Standard cleaning is scheduled for the next calendar day after the actual collection day because collection time is unpredictable. A normal Friday collection can therefore produce a Saturday ADS cleaning day.</p>
              <p>If municipal collection shifts because of a holiday, the ADS cleaning day shifts with the actual collection. Severe weather, unsafe road conditions, equipment problems, or other safety issues can move service to the next practical route day.</p>
            </TermsSection>

            <TermsSection title="6. Customer preparation and access">
              <p>Bins must be empty, safely accessible, and available for the scheduled route. The customer is responsible for providing accurate pickup-day information, bin count, access instructions, gate information, animal warnings, and the requested return location.</p>
              <p>A full, missing, blocked, inaccessible, unsafe, or prohibited bin may be documented and may be treated as a missed or refused scheduled stop when ADS has already dispatched the route. ADS may contact the customer when a safe correction or reschedule is possible.</p>
            </TermsSection>

            <TermsSection title="7. Contamination, prohibited material, and extra work">
              <p>Routine food/liquid residue, ordinary odor, light grime, and normal household-bin conditions are part of standard cleaning. Heavy buildup, unusual debris, pet-waste conditions, or other non-routine work may require separate approval before additional work is performed.</p>
              <p>Loose or bare cat litter, loose animal or human feces, hazardous chemicals, fuel, motor oil, solvents, pesticides, paint, tar, glue or adhesives, construction debris, concrete, plaster, sharps, medical waste, broken glass, animal carcasses, unknown biological material, or other unsafe contents may be refused on the standard route.</p>
              <p>ADS will not silently add optional specialty-work charges. When extra work is offered, ADS should document the condition and obtain customer approval for the additional charge before performing that optional work.</p>
            </TermsSection>

            <TermsSection title="8. Promotions and referral discounts">
              <p>Promotions and referral discounts do not stack. Only one eligible discount type may be used on a signup or invoice where a discount applies.</p>
              <p><strong>NEW25:</strong> eligible new Monthly customers receive 25% off the first paid Monthly subtotal before tax. Later Monthly renewals return to the normal price.</p>
              <p><strong>ONE45:</strong> an eligible new customer selecting a One-Time Cleaning for exactly two bins may receive a $45 pre-tax subtotal. It is limited to one successful use per customer and service address under the current offer.</p>
              <p><strong>Referral signup discount:</strong> an eligible genuinely new residential Monthly customer using a valid referral code receives 50% off the eligible Monthly base charge for the first qualifying service; additional-bin and specialty charges remain at their normal price.</p>
              <p><strong>Referrer rewards:</strong> the first qualified lifetime referral reward is 50% off one eligible Monthly base charge for the referring customer; later qualified referral rewards are 25% off an eligible Monthly base charge. Rewards are non-cash credits, apply only when the referral qualifies, and may be withheld or reversed for failed payment, refund, chargeback, duplicate-account abuse, fraud, or other ineligibility.</p>
            </TermsSection>

            <TermsSection title="9. Service communications, photos, and privacy">
              <p>Service-related email, text-message, and phone permissions are used for account, billing, scheduling, route, access, payment, completion, and other information needed to provide the service. Before-and-after photographs may be used to document bin condition and completion and may be delivered to the customer as part of the service record.</p>
              <p>Marketing consent is separate and optional. ADS does not sell or rent customer personal information or customer contact lists. Information is used to operate the account, provide requested services, communicate with the customer, and work with service providers needed to operate the service.</p>
            </TermsSection>

            <TermsSection title="10. Acceptance and changes">
              <p>By checking the acceptance box and continuing to payment, the customer confirms that the service information entered for the account is accurate to the best of their knowledge and accepts the version of these terms shown at signup.</p>
              <p>ADS may update terms prospectively as the service develops. Material changes that affect an existing recurring customer should be communicated before they govern a future renewal or service where notice is required.</p>
            </TermsSection>

            <div className="rounded-2xl border border-zinc-300 bg-zinc-100 p-5 text-sm leading-relaxed text-zinc-700">
              This staging document is the working customer-facing terms version for testing. Before public launch, final legal, tax, insurance, wastewater, cancellation, and consumer-law review remains a launch-readiness step.
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
